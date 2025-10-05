import { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory storage (for demo - use Redis in production)
const rooms = new Map();
const userSessions = new Map();

interface User {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: Date;
  lastSeen: Date;
}

interface Room {
  id: string;
  name: string;
  host: string;
  users: Map<string, User>;
  createdAt: Date;
  lastActivity: Date;
  videoState: {
    isPlaying: boolean;
    currentTime: number;
    volume: number;
    playbackRate: number;
  };
}

// Initialize default room state
function getDefaultVideoState() {
  return {
    isPlaying: false,
    currentTime: 0,
    volume: 1,
    playbackRate: 1,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { roomId, action } = req.query;

  try {
    switch (action) {
      case 'join':
        return handleJoinRoom(req, res);
      case 'leave':
        return handleLeaveRoom(req, res);
      case 'video-event':
        return handleVideoEvent(req, res);
      case 'chat':
        return handleChatMessage(req, res);
      case 'state':
        return handleGetState(req, res);
      case 'health':
        return handleHealth(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleJoinRoom(req: VercelRequest, res: VercelResponse) {
  const { roomId, userName } = req.body;

  if (!roomId || !userName) {
    return res.status(400).json({ error: 'Room ID and user name are required' });
  }

  let room = rooms.get(roomId);
  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  if (!room) {
    room = {
      id: roomId,
      name: `Room ${roomId}`,
      host: userId,
      users: new Map(),
      createdAt: new Date(),
      lastActivity: new Date(),
      videoState: getDefaultVideoState(),
    };
    rooms.set(roomId, room);
    console.log(`Created new room: ${roomId}`);
  }

  if (room.users.size >= 10) {
    return res.status(400).json({ error: 'Room is full' });
  }

  const user: User = {
    id: userId,
    name: userName,
    isHost: room.users.size === 0,
    joinedAt: new Date(),
    lastSeen: new Date(),
  };

  if (room.users.size === 0) {
    room.host = userId;
  }

  room.users.set(userId, user);
  userSessions.set(userId, { roomId, lastSeen: new Date() });
  room.lastActivity = new Date();

  return res.json({
    success: true,
    roomId,
    userId,
    isHost: user.isHost,
    users: Array.from(room.users.values()),
    videoState: room.videoState,
  });
}

async function handleLeaveRoom(req: VercelRequest, res: VercelResponse) {
  const { roomId, userId } = req.body;

  if (!roomId || !userId) {
    return res.status(400).json({ error: 'Room ID and user ID are required' });
  }

  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const user = room.users.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found in room' });
  }

  room.users.delete(userId);
  userSessions.delete(userId);

  // Transfer host if needed
  if (user.isHost && room.users.size > 0) {
    const newHost = Array.from(room.users.values())[0] as any;
    newHost.isHost = true;
    room.host = newHost.id;
  }

  // Remove room if empty
  if (room.users.size === 0) {
    rooms.delete(roomId);
    console.log(`Removed empty room: ${roomId}`);
  } else {
    room.lastActivity = new Date();
  }

  return res.json({ success: true });
}

async function handleVideoEvent(req: VercelRequest, res: VercelResponse) {
  const { roomId, userId, type, time, volume, speed } = req.body;

  if (!roomId || !userId || !type) {
    return res.status(400).json({ error: 'Room ID, user ID, and event type are required' });
  }

  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const user = room.users.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found in room' });
  }

  if (!user.isHost) {
    return res.status(403).json({ error: 'Only host can control video' });
  }

  // Update video state
  switch (type) {
    case 'play':
      room.videoState.isPlaying = true;
      if (time !== undefined) room.videoState.currentTime = time;
      break;
    case 'pause':
      room.videoState.isPlaying = false;
      if (time !== undefined) room.videoState.currentTime = time;
      break;
    case 'seek':
      if (time !== undefined) room.videoState.currentTime = time;
      break;
    case 'volume':
      if (volume !== undefined) room.videoState.volume = volume;
      break;
    case 'speed':
      if (speed !== undefined) room.videoState.playbackRate = speed;
      break;
  }

  room.lastActivity = new Date();
  user.lastSeen = new Date();

  return res.json({
    success: true,
    videoState: room.videoState,
    timestamp: Date.now(),
  });
}

async function handleChatMessage(req: VercelRequest, res: VercelResponse) {
  const { roomId, userId, message } = req.body;

  if (!roomId || !userId || !message) {
    return res.status(400).json({ error: 'Room ID, user ID, and message are required' });
  }

  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const user = room.users.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found in room' });
  }

  const chatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    userName: user.name,
    message,
    timestamp: Date.now(),
  };

  room.lastActivity = new Date();
  user.lastSeen = new Date();

  return res.json({
    success: true,
    message: chatMessage,
  });
}

async function handleGetState(req: VercelRequest, res: VercelResponse) {
  const { roomId } = req.query;

  if (!roomId) {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  return res.json({
    success: true,
    room: {
      id: room.id,
      name: room.name,
      host: room.host,
      users: Array.from(room.users.values()),
      videoState: room.videoState,
      createdAt: room.createdAt,
      lastActivity: room.lastActivity,
    },
  });
}

async function handleHealth(req: VercelRequest, res: VercelResponse) {
  return res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    rooms: rooms.size,
    activeUsers: userSessions.size,
  });
}
