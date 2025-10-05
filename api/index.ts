import { VercelRequest, VercelResponse } from '@vercel/node';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';

// In-memory storage (for demo - use Redis in production)
const rooms = new Map();
const userSockets = new Map();

// Socket.IO server instance
let io: SocketIOServer | null = null;

// Initialize Socket.IO server
function initializeSocketIO() {
  if (io) return io;

  const server = createServer();
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling']
  });

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join room
    socket.on('join-room', async (data: { roomId: string; userName: string }) => {
      try {
        const { roomId, userName } = data;
        
        if (!roomId || !userName) {
          socket.emit('error', { message: 'Room ID and user name are required' });
          return;
        }

        let room = rooms.get(roomId);
        let userId = userSockets.get(socket.id);
        
        // Check if this is a reconnection
        if (room && userId && room.users.has(userId)) {
          console.log(`User ${userName} reconnecting to room ${roomId}`);
          
          const existingUser = room.users.get(userId)!;
          existingUser.socketId = socket.id;
          userSockets.set(socket.id, userId);
          
          await socket.join(roomId);
          
          socket.emit('room-joined', {
            roomId,
            userId,
            isHost: existingUser.isHost,
            users: Array.from(room.users.values()).map((u: any) => ({
              id: u.id,
              name: u.name,
              isHost: u.isHost,
              joinedAt: u.joinedAt,
            })),
          });
          
          socket.to(roomId).emit('user-reconnected', {
            user: {
              id: existingUser.id,
              name: existingUser.name,
              isHost: existingUser.isHost,
              joinedAt: existingUser.joinedAt,
            },
          });
          
          room.lastActivity = new Date();
          return;
        }
        
        if (!room) {
          room = {
            id: roomId,
            name: `Room ${roomId}`,
            host: '',
            users: new Map(),
            createdAt: new Date(),
            lastActivity: new Date(),
          };
          rooms.set(roomId, room);
          console.log(`Created new room: ${roomId}`);
        }

        if (room.users.size >= 10) {
          socket.emit('error', { message: 'Room is full' });
          return;
        }

        userId = uuidv4();
        const user = {
          id: userId,
          socketId: socket.id,
          name: userName,
          isHost: room.users.size === 0,
          joinedAt: new Date(),
        };

        if (room.users.size === 0) {
          room.host = userId;
        }

        room.users.set(userId, user);
        userSockets.set(socket.id, userId);
        room.lastActivity = new Date();

        await socket.join(roomId);

        socket.emit('room-joined', {
          roomId,
          userId,
          isHost: user.isHost,
          users: Array.from(room.users.values()).map((u: any) => ({
            id: u.id,
            name: u.name,
            isHost: u.isHost,
            joinedAt: u.joinedAt,
          })),
        });

        socket.to(roomId).emit('user-joined', {
          user: {
            id: user.id,
            name: user.name,
            isHost: user.isHost,
            joinedAt: user.joinedAt,
          },
        });

        console.log(`User ${userName} joined room ${roomId}`);
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Video sync events
    socket.on('video-event', (data: {
      roomId: string;
      type: 'play' | 'pause' | 'seek' | 'volume' | 'speed';
      time?: number;
      volume?: number;
      speed?: number;
    }) => {
      try {
        const userId = userSockets.get(socket.id);
        if (!userId) {
          console.log(`Socket ${socket.id} not found in userSockets`);
          socket.emit('error', { message: 'User session not found' });
          return;
        }

        const room = rooms.get(data.roomId);
        if (!room) {
          console.log(`Room ${data.roomId} not found`);
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        if (!room.users.has(userId)) {
          console.log(`User ${userId} not found in room ${data.roomId}`);
          socket.emit('error', { message: 'User not in room' });
          return;
        }

        const user = room.users.get(userId);
        if (!user.isHost) {
          socket.emit('error', { message: 'Only host can control video' });
          return;
        }

        const videoEvent = {
          type: data.type,
          time: data.time,
          volume: data.volume,
          speed: data.speed,
          userId,
          timestamp: Date.now(),
        };

        console.log(`Video event ${data.type} from user ${userId} in room ${data.roomId}`);
        socket.to(data.roomId).emit('video-event-received', videoEvent);
      } catch (error) {
        console.error('Error handling video event:', error);
        socket.emit('error', { message: 'Failed to process video event' });
      }
    });

    // Chat messages
    socket.on('chat-message', (data: { roomId: string; message: string }) => {
      try {
        const userId = userSockets.get(socket.id);
        if (!userId) {
          socket.emit('error', { message: 'User session not found' });
          return;
        }

        const room = rooms.get(data.roomId);
        if (!room || !room.users.has(userId)) {
          socket.emit('error', { message: 'User not in room' });
          return;
        }

        const user = room.users.get(userId)!;
        const chatMessage = {
          id: uuidv4(),
          userId,
          userName: user.name,
          message: data.message,
          timestamp: Date.now(),
        };

        console.log(`Chat message from ${user.name} in room ${data.roomId}`);
        io!.to(data.roomId).emit('chat-message-received', chatMessage);
      } catch (error) {
        console.error('Error handling chat message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      try {
        console.log(`Socket ${socket.id} disconnected: ${reason}`);
        const userId = userSockets.get(socket.id);
        if (!userId) {
          console.log(`No user found for socket ${socket.id}`);
          return;
        }

        for (const [roomId, room] of Array.from(rooms.entries())) {
          if (room.users.has(userId)) {
            const user = room.users.get(userId)!;
            room.users.delete(userId);
            userSockets.delete(socket.id);

            if (user.isHost && room.users.size > 0) {
              const newHost = Array.from(room.users.values())[0] as any;
              newHost.isHost = true;
              
              io!.to(roomId).emit('host-changed', {
                newHostId: newHost.id,
                newHostName: newHost.name,
              });
            }

            socket.to(roomId).emit('user-left', {
              userId,
              userName: user.name,
            });

            if (room.users.size === 0) {
              rooms.delete(roomId);
              console.log(`Removed empty room: ${roomId}`);
            } else {
              room.lastActivity = new Date();
            }

            console.log(`User ${user.name} left room ${roomId}`);
            break;
          }
        }
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });
  });

  return io;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Initialize Socket.IO if not already done
  const socketIO = initializeSocketIO();

  // Health check endpoint
  if (req.method === 'GET' && req.url === '/health') {
    return res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      rooms: rooms.size,
      connections: socketIO?.engine?.clientsCount || 0,
    });
  }

  // Handle Socket.IO upgrade
  if (req.headers.upgrade === 'websocket') {
    return socketIO!.handleUpgrade(req, res as any, (socket) => {
      socketIO!.emit('connection', socket);
    });
  }

  // Default response
  res.status(200).json({ message: 'Syncy API is running' });
}
