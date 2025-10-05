export interface VideoChunk {
  index: number;
  data: ArrayBuffer;
  timestamp: number;
  isLast: boolean;
  size: number;
  checksum: string;
}

export interface StreamingMessage {
  type: StreamingMessageType;
  roomId: string;
  fromUserId: string;
  toUserId?: string;
  data: any;
  timestamp: number;
  sequenceNumber?: number;
}

export enum StreamingMessageType {
  VIDEO_CHUNK = 'video-chunk',
  CHUNK_REQUEST = 'chunk-request',
  SEEK_REQUEST = 'seek-request',
  PLAY_REQUEST = 'play-request',
  PAUSE_REQUEST = 'pause-request',
  STREAM_START = 'stream-start',
  STREAM_END = 'stream-end',
  QUALITY_CHANGE = 'quality-change',
  BANDWIDTH_UPDATE = 'bandwidth-update',
  CONNECTION_STATUS = 'connection-status'
}

export interface StreamingConfig {
  chunkSize: number;
  maxChunksInFlight: number;
  retryAttempts: number;
  timeoutMs: number;
  qualityLevels: QualityLevel[];
}

export interface QualityLevel {
  name: string;
  chunkSize: number;
  maxBandwidth: number;
  description: string;
}

export interface BandwidthStats {
  uploadSpeed: number; // bytes per second
  downloadSpeed: number; // bytes per second
  latency: number; // milliseconds
  packetLoss: number; // percentage
  timestamp: number;
}

export interface StreamingState {
  isStreaming: boolean;
  isHost: boolean;
  currentQuality: string;
  totalChunks: number;
  receivedChunks: number;
  bufferedChunks: number;
  bandwidthStats: BandwidthStats;
  participants: StreamingParticipant[];
}

export interface StreamingParticipant {
  userId: string;
  userName: string;
  isConnected: boolean;
  bandwidthStats: BandwidthStats;
  lastSeen: number;
}

export interface VideoMetadata {
  fileName: string;
  fileSize: number;
  duration: number;
  mimeType: string;
  totalChunks: number;
  checksum: string;
}

export interface ChunkBuffer {
  chunks: Map<number, VideoChunk>;
  maxSize: number;
  currentSize: number;
  missingChunks: Set<number>;
}

export interface StreamingError {
  code: string;
  message: string;
  timestamp: number;
  recoverable: boolean;
}
