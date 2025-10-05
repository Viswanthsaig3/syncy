// WebRTC types for P2P streaming
export interface RTCSessionDescriptionInit {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp?: string;
}

export interface RTCIceCandidateInit {
  candidate?: string;
  sdpMLineIndex?: number | null;
  sdpMid?: string | null;
  usernameFragment?: string | null;
}

export interface User {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: Date;
}

export interface Room {
  id: string;
  name: string;
  userCount: number;
  createdAt: Date;
  lastActivity: Date;
}

export interface VideoEvent {
  type: 'play' | 'pause' | 'seek' | 'volume' | 'speed';
  time?: number;
  volume?: number;
  speed?: number;
  userId: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
}

export interface SocketEvents {
  // Client to Server
  'join-room': (data: { roomId: string; userName: string }) => void;
  'video-event': (data: {
    roomId: string;
    type: 'play' | 'pause' | 'seek' | 'volume' | 'speed';
    time?: number;
    volume?: number;
    speed?: number;
  }) => void;
  'chat-message': (data: { roomId: string; message: string }) => void;

  // P2P Streaming Events
  'webrtc-offer': (data: {
    roomId: string;
    participantId: string;
    offer: RTCSessionDescriptionInit;
  }) => void;
  'webrtc-answer': (data: {
    roomId: string;
    participantId: string;
    answer: RTCSessionDescriptionInit;
  }) => void;
  'ice-candidate': (data: {
    roomId: string;
    participantId: string;
    candidate: RTCIceCandidateInit;
  }) => void;
  'join-stream-request': (data: { roomId: string }) => void;
  'streaming-started': (data: {
    roomId: string;
    metadata: any;
    totalChunks: number;
    quality: string;
  }) => void;
  'streaming-stopped': (data: { roomId: string }) => void;
  'streaming-started': (data: {
    roomId: string;
    hostId: string;
    hostName: string;
    metadata: any;
    totalChunks: number;
    quality: string;
    timestamp: number;
  }) => void;

  // Server to Client
  'room-joined': (data: {
    roomId: string;
    userId: string;
    isHost: boolean;
    users: User[];
  }) => void;
  'user-joined': (data: { user: User }) => void;
  'user-reconnected': (data: { user: User }) => void;
  'user-left': (data: { userId: string; userName: string }) => void;
  'host-changed': (data: { newHostId: string; newHostName: string }) => void;
  'video-event-received': (data: VideoEvent) => void;
  'chat-message-received': (data: ChatMessage) => void;
  'error': (data: { message: string }) => void;
}

export interface VideoPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isMuted: boolean;
  isLoading: boolean;
  hasError: boolean;
}

export interface AppState {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;

  // Room state
  currentRoom: string | null;
  currentUser: User | null;
  roomUsers: User[];
  isHost: boolean;

  // Video state
  videoFile: File | null;
  videoUrl: string | null;
  videoPlayerState: VideoPlayerState;

  // Chat state
  chatMessages: ChatMessage[];
  isChatOpen: boolean;

  // UI state
  isFileSelectorOpen: boolean;
  isRoomSelectorOpen: boolean;
}
