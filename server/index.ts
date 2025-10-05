import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';

// WebRTC types for P2P streaming
interface RTCSessionDescriptionInit {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp?: string;
}

interface RTCIceCandidateInit {
  candidate?: string;
  sdpMLineIndex?: number | null;
  sdpMid?: string | null;
  usernameFragment?: string | null;
}

const app = express();
const server = createServer(app);

// Get environment variables with fallbacks
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'https://syncy-five.vercel.app';
const NODE_ENV = process.env.NODE_ENV || 'production';

console.log('Environment Configuration:', {
  PORT,
  CLIENT_URL,
  NODE_ENV
});

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(compression());
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
}));
app.use(express.json());

// Store active rooms and users
interface Room {
  id: string;
  name: string;
  host: string;
  users: Map<string, User>;
  createdAt: Date;
  lastActivity: Date;
}

interface User {
  id: string;
  socketId: string;
  name: string;
  isHost: boolean;
  joinedAt: Date;
}

const rooms = new Map<string, Room>();
const userSockets = new Map<string, string>(); // socketId -> userId

// Cleanup inactive rooms every 5 minutes
setInterval(() => {
  const now = new Date();
  const inactiveThreshold = 30 * 60 * 1000; // 30 minutes
  
  for (const [roomId, room] of rooms.entries()) {
    if (now.getTime() - room.lastActivity.getTime() > inactiveThreshold) {
      console.log(`Cleaning up inactive room: ${roomId}`);
      rooms.delete(roomId);
    }
  }
}, 5 * 60 * 1000);

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
      
      // Check if this is a reconnection (user already exists in room)
      let isReconnection = false;
      if (room && userId && room.users.has(userId)) {
        isReconnection = true;
        console.log(`User ${userName} reconnecting to room ${roomId}`);
        
        // Update socket ID for existing user
        const existingUser = room.users.get(userId)!;
        existingUser.socketId = socket.id;
        userSockets.set(socket.id, userId);
        
        // Join socket room
        await socket.join(roomId);
        
        // Notify user of successful rejoin
        socket.emit('room-joined', {
          roomId,
          userId,
          isHost: existingUser.isHost,
          users: Array.from(room.users.values()).map(u => ({
            id: u.id,
            name: u.name,
            isHost: u.isHost,
            joinedAt: u.joinedAt,
          })),
        });
        
        // Notify other users of reconnection
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
        // Create new room
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

      // Check if room is full (max 10 users)
      if (room.users.size >= 10) {
        socket.emit('error', { message: 'Room is full' });
        return;
      }

      // Create new user
      userId = uuidv4();
      const user: User = {
        id: userId,
        socketId: socket.id,
        name: userName,
        isHost: room.users.size === 0,
        joinedAt: new Date(),
      };

      // Set host if this is the first user
      if (room.users.size === 0) {
        room.host = userId;
      }

      room.users.set(userId, user);
      userSockets.set(socket.id, userId);
      room.lastActivity = new Date();

      // Join socket room
      await socket.join(roomId);

      // Notify user of successful join
      socket.emit('room-joined', {
        roomId,
        userId,
        isHost: user.isHost,
        users: Array.from(room.users.values()).map(u => ({
          id: u.id,
          name: u.name,
          isHost: u.isHost,
          joinedAt: u.joinedAt,
        })),
      });

      // Notify other users
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
      const { roomId, type, time, volume, speed } = data;
      const room = rooms.get(roomId);
      
      if (!room) {
        console.error(`Room ${roomId} not found`);
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const userId = userSockets.get(socket.id);
      if (!userId) {
        console.error(`Socket ${socket.id} not found in userSockets`);
        socket.emit('error', { message: 'User session not found' });
        return;
      }
      
      if (!room.users.has(userId)) {
        console.error(`User ${userId} not found in room ${roomId}. Room users:`, Array.from(room.users.keys()));
        socket.emit('error', { message: 'User not in room' });
        return;
      }

      room.lastActivity = new Date();

      // Broadcast to other users in the room
      socket.to(roomId).emit('video-event-received', {
        type,
        time,
        volume,
        speed,
        userId,
        timestamp: Date.now(),
      });

      console.log(`Video event ${type} from user ${userId} in room ${roomId}`);
    } catch (error) {
      console.error('Error handling video event:', error);
      socket.emit('error', { message: 'Failed to sync video event' });
    }
  });

  // P2P Streaming events
  socket.on('webrtc-offer', (data: {
    roomId: string;
    participantId: string;
    offer: RTCSessionDescriptionInit;
  }) => {
    try {
      const { roomId, participantId, offer } = data;
      const room = rooms.get(roomId);
      
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      // Forward offer to target participant
      socket.to(participantId).emit('webrtc-offer', {
        ...data,
        fromUserId: socket.id,
        timestamp: Date.now()
      });
      
      console.log(`WebRTC offer forwarded from ${socket.id} to ${participantId}`);
    } catch (error) {
      console.error('Error handling WebRTC offer:', error);
      socket.emit('error', { message: 'Failed to process WebRTC offer' });
    }
  });

  socket.on('webrtc-answer', (data: {
    roomId: string;
    participantId: string;
    answer: RTCSessionDescriptionInit;
  }) => {
    try {
      const { roomId, participantId, answer } = data;
      const room = rooms.get(roomId);
      
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      // Forward answer to target participant
      socket.to(participantId).emit('webrtc-answer', {
        ...data,
        fromUserId: socket.id,
        timestamp: Date.now()
      });
      
      console.log(`WebRTC answer forwarded from ${socket.id} to ${participantId}`);
    } catch (error) {
      console.error('Error handling WebRTC answer:', error);
      socket.emit('error', { message: 'Failed to process WebRTC answer' });
    }
  });

  socket.on('ice-candidate', (data: {
    roomId: string;
    participantId: string;
    candidate: RTCIceCandidateInit;
  }) => {
    try {
      const { roomId, participantId, candidate } = data;
      const room = rooms.get(roomId);
      
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      // Forward ICE candidate to target participant
      socket.to(participantId).emit('ice-candidate', {
        ...data,
        fromUserId: socket.id,
        timestamp: Date.now()
      });
      
      console.log(`ICE candidate forwarded from ${socket.id} to ${participantId}`);
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
      socket.emit('error', { message: 'Failed to process ICE candidate' });
    }
  });

  socket.on('join-stream-request', (data: {
    roomId: string;
  }) => {
    try {
      const { roomId } = data;
      const room = rooms.get(roomId);
      
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      const userId = userSockets.get(socket.id);
      if (!userId) {
        socket.emit('error', { message: 'User session not found' });
        return;
      }
      
      const user = room.users.get(userId);
      if (!user) {
        socket.emit('error', { message: 'User not in room' });
        return;
      }
      
      // Notify host about new participant wanting to join stream
      socket.to(room.host).emit('join-stream-request', {
        ...data,
        participantId: socket.id,
        participantName: user.name,
        timestamp: Date.now()
      });
      
      console.log(`Join stream request from ${user.name} in room ${roomId}`);
    } catch (error) {
      console.error('Error handling join stream request:', error);
      socket.emit('error', { message: 'Failed to process join stream request' });
    }
  });

  socket.on('streaming-started', (data: {
    roomId: string;
    metadata: any;
    totalChunks: number;
    quality: string;
  }) => {
    try {
      const { roomId } = data;
      const room = rooms.get(roomId);
      
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      const userId = userSockets.get(socket.id);
      if (!userId) {
        socket.emit('error', { message: 'User session not found' });
        return;
      }
      
      const user = room.users.get(userId);
      if (!user) {
        socket.emit('error', { message: 'User not in room' });
        return;
      }
      
      // Notify all participants that streaming has started
      socket.to(roomId).emit('streaming-started', {
        ...data,
        hostId: socket.id,
        hostName: user.name,
        timestamp: Date.now()
      });
      
      console.log(`Streaming started by ${user.name} in room ${roomId}`);
    } catch (error) {
      console.error('Error handling streaming started:', error);
      socket.emit('error', { message: 'Failed to process streaming started' });
    }
  });

  socket.on('streaming-stopped', (data: {
    roomId: string;
  }) => {
    try {
      const { roomId } = data;
      const room = rooms.get(roomId);
      
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      // Notify all participants that streaming has stopped
      socket.to(roomId).emit('streaming-stopped', {
        ...data,
        hostId: socket.id,
        timestamp: Date.now()
      });
      
      console.log(`Streaming stopped in room ${roomId}`);
    } catch (error) {
      console.error('Error handling streaming stopped:', error);
      socket.emit('error', { message: 'Failed to process streaming stopped' });
    }
  });

  // Chat messages
  socket.on('chat-message', (data: { roomId: string; message: string }) => {
    try {
      const { roomId, message } = data;
      const room = rooms.get(roomId);
      
      if (!room) {
        console.error(`Room ${roomId} not found for chat message`);
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const userId = userSockets.get(socket.id);
      if (!userId) {
        console.error(`Socket ${socket.id} not found in userSockets for chat`);
        socket.emit('error', { message: 'User session not found' });
        return;
      }
      
      if (!room.users.has(userId)) {
        console.error(`User ${userId} not found in room ${roomId} for chat. Room users:`, Array.from(room.users.keys()));
        socket.emit('error', { message: 'User not in room' });
        return;
      }

      const user = room.users.get(userId)!;
      room.lastActivity = new Date();

      // Broadcast message to all users in room
      io.to(roomId).emit('chat-message-received', {
        id: uuidv4(),
        userId,
        userName: user.name,
        message: message.trim(),
        timestamp: Date.now(),
      });

      console.log(`Chat message from ${user.name} in room ${roomId}`);
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

      // Find and remove user from room
      for (const [roomId, room] of rooms.entries()) {
        if (room.users.has(userId)) {
          const user = room.users.get(userId)!;
          room.users.delete(userId);
          userSockets.delete(socket.id);

          // If host left, transfer host to another user
          if (user.isHost && room.users.size > 0) {
            const newHost = Array.from(room.users.values())[0];
            newHost.isHost = true;
            
            // Notify room of new host
            io.to(roomId).emit('host-changed', {
              newHostId: newHost.id,
              newHostName: newHost.name,
            });
          }

          // Notify other users
          socket.to(roomId).emit('user-left', {
            userId,
            userName: user.name,
          });

          // Remove room if empty
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    rooms: rooms.size,
    connections: io.engine.clientsCount,
    environment: NODE_ENV,
    clientUrl: CLIENT_URL,
  });
});

// API endpoint to get room info
app.get('/api/room/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  return res.json({
    id: room.id,
    name: room.name,
    userCount: room.users.size,
    createdAt: room.createdAt,
    lastActivity: room.lastActivity,
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Syncy WebSocket Server',
    status: 'running',
    version: '1.0.0',
    clientUrl: CLIENT_URL,
    health: '/health',
    api: '/api/room/:roomId'
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Syncy server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for connections`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`🔗 Client URL: ${CLIENT_URL}`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});
