import { VideoChunker } from './videoChunker';
import { WebRTCDataChannelManager } from './webrtcDataChannels';
import { socketManager } from './socket';
import { 
  VideoChunk, 
  StreamingMessage, 
  StreamingMessageType, 
  StreamingState, 
  StreamingConfig,
  BandwidthStats,
  VideoMetadata,
  ChunkBuffer,
  StreamingError
} from '@/types/streaming';

export class P2PStreamingManager {
  private videoChunker: VideoChunker | null = null;
  private webrtcManager: WebRTCDataChannelManager;
  private streamingState: StreamingState;
  private config: StreamingConfig;
  private chunkBuffer: ChunkBuffer;
  private streamingInterval: NodeJS.Timeout | null = null;
  private bandwidthMonitor: NodeJS.Timeout | null = null;
  private eventHandlers: Map<string, ((data: any) => void)[]> = new Map();
  private currentRoomId: string | null = null;

  constructor() {
    this.webrtcManager = new WebRTCDataChannelManager();
    this.config = {
      chunkSize: 64 * 1024,
      maxChunksInFlight: 10,
      retryAttempts: 3,
      timeoutMs: 5000,
      qualityLevels: [
        { name: 'low', chunkSize: 32 * 1024, maxBandwidth: 1 * 1024 * 1024, description: 'Low quality, fast streaming' },
        { name: 'medium', chunkSize: 64 * 1024, maxBandwidth: 5 * 1024 * 1024, description: 'Balanced quality and speed' },
        { name: 'high', chunkSize: 128 * 1024, maxBandwidth: 10 * 1024 * 1024, description: 'High quality, requires good connection' }
      ]
    };

    this.streamingState = {
      isStreaming: false,
      isHost: false,
      currentQuality: 'medium',
      totalChunks: 0,
      receivedChunks: 0,
      bufferedChunks: 0,
      bandwidthStats: {
        uploadSpeed: 0,
        downloadSpeed: 0,
        latency: 0,
        packetLoss: 0,
        timestamp: Date.now()
      },
      participants: []
    };

    this.chunkBuffer = {
      chunks: new Map(),
      maxSize: 100,
      currentSize: 0,
      missingChunks: new Set()
    };

    this.setupWebRTCHandlers();
    this.setupWebRTCEventHandlers();
  }

  // Host Methods
  async startHosting(videoFile: File, roomId: string, userId: string): Promise<void> {
    try {
      console.log('Starting P2P streaming host mode');
      
      this.currentRoomId = roomId;
      this.streamingState.isHost = true;
      this.streamingState.isStreaming = true;
      
      // Create video chunker
      this.videoChunker = new VideoChunker(videoFile, this.config.chunkSize);
      await this.videoChunker.getVideoDuration();
      
      // Create chunks
      const chunks = await this.videoChunker.createChunks(this.streamingState.currentQuality);
      this.streamingState.totalChunks = chunks.length;
      
      console.log(`Created ${chunks.length} chunks for streaming`);
      
      // Emit streaming started event
      this.emit('streaming-started', {
        metadata: this.videoChunker.getMetadata(),
        totalChunks: chunks.length,
        quality: this.streamingState.currentQuality
      });

      // Notify server about streaming started
      socketManager.emitAny('streaming-started', {
        roomId,
        metadata: this.videoChunker.getMetadata(),
        totalChunks: chunks.length,
        quality: this.streamingState.currentQuality
      });
      
      // Start bandwidth monitoring
      this.startBandwidthMonitoring();
      
    } catch (error) {
      console.error('Failed to start hosting:', error);
      this.emit('streaming-error', {
        code: 'HOST_START_FAILED',
        message: 'Failed to start hosting',
        error: error
      });
      throw error;
    }
  }

  async streamToParticipant(participantId: string, roomId: string, userId: string): Promise<void> {
    if (!this.videoChunker) {
      throw new Error('Video chunker not initialized');
    }

    try {
      // Create peer connection
      const peerConnection = await this.webrtcManager.createPeerConnection(participantId);
      
      // Set up connection state monitoring
      this.webrtcManager.onConnectionStateChange(participantId, (state) => {
        console.log(`Connection state changed for ${participantId}:`, state);
        if (state === 'connected') {
          this.startStreamingToParticipant(participantId, roomId, userId);
        } else if (state === 'disconnected' || state === 'failed') {
          this.stopStreamingToParticipant(participantId);
        }
      });

      // Create offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      // Emit offer to participant via Socket.IO
      this.emit('webrtc-offer', {
        participantId,
        offer,
        roomId,
        userId
      });

      // Send offer via Socket.IO
      socketManager.emitAny('webrtc-offer', {
        roomId,
        participantId,
        offer
      });

    } catch (error) {
      console.error(`Failed to stream to participant ${participantId}:`, error);
      throw error;
    }
  }

  private async startStreamingToParticipant(participantId: string, roomId: string, userId: string): Promise<void> {
    if (!this.videoChunker) return;

    console.log(`Starting streaming to participant ${participantId}`);
    
    // Send initial chunks
    const initialChunks = await this.videoChunker.getChunkRange(0, Math.min(9, this.streamingState.totalChunks - 1));
    
    for (const chunk of initialChunks) {
      await this.webrtcManager.sendVideoChunk(chunk, participantId);
    }

    // Set up chunk request handler
    this.webrtcManager.onMessage(StreamingMessageType.CHUNK_REQUEST, async (message, fromParticipantId) => {
      if (fromParticipantId === participantId) {
        await this.handleChunkRequest(message.data.chunkIndex, participantId);
      }
    });
  }

  private async handleChunkRequest(chunkIndex: number, participantId: string): Promise<void> {
    if (!this.videoChunker) return;

    try {
      const chunk = await this.videoChunker.getChunk(chunkIndex);
      if (chunk) {
        await this.webrtcManager.sendVideoChunk(chunk, participantId);
      }
    } catch (error) {
      console.error(`Failed to send chunk ${chunkIndex} to ${participantId}:`, error);
    }
  }

  private stopStreamingToParticipant(participantId: string): void {
    console.log(`Stopping streaming to participant ${participantId}`);
    this.webrtcManager.closeConnection(participantId);
  }

  // Participant Methods
  async joinStream(roomId: string, userId: string): Promise<void> {
    try {
      console.log('Joining P2P stream as participant');
      
      this.currentRoomId = roomId;
      this.streamingState.isHost = false;
      this.streamingState.isStreaming = true;
      
      // Set up message handlers
      this.setupParticipantHandlers(roomId, userId);
      
      // Start bandwidth monitoring
      this.startBandwidthMonitoring();
      
      // Emit join request
      this.emit('join-stream-request', { roomId, userId });

      // Send join request via Socket.IO
      socketManager.emitAny('join-stream-request', { roomId });
      
    } catch (error) {
      console.error('Failed to join stream:', error);
      this.emit('streaming-error', {
        code: 'JOIN_FAILED',
        message: 'Failed to join stream',
        error: error
      });
      throw error;
    }
  }

  private setupParticipantHandlers(roomId: string, userId: string): void {
    // Handle video chunks
    this.webrtcManager.onMessage(StreamingMessageType.VIDEO_CHUNK, async (message, fromParticipantId) => {
      await this.handleReceivedChunk(message.data.chunk, fromParticipantId);
    });

    // Handle streaming metadata
    this.webrtcManager.onMessage(StreamingMessageType.STREAM_START, async (message, fromParticipantId) => {
      this.streamingState.totalChunks = message.data.totalChunks;
      this.streamingState.currentQuality = message.data.quality;
      
      this.emit('stream-metadata', {
        totalChunks: message.data.totalChunks,
        quality: message.data.quality,
        metadata: message.data.metadata
      });
    });
  }

  private async handleReceivedChunk(chunkData: any, fromParticipantId: string): Promise<void> {
    try {
      const chunk: VideoChunk = {
        index: chunkData.index,
        data: new Uint8Array(chunkData.data).buffer,
        timestamp: chunkData.timestamp,
        isLast: chunkData.isLast,
        size: chunkData.size,
        checksum: chunkData.checksum
      };

      // Verify checksum
      const calculatedChecksum = await this.calculateChecksum(chunk.data);
      if (calculatedChecksum !== chunk.checksum) {
        console.warn(`Checksum mismatch for chunk ${chunk.index}`);
        // Request chunk again
        await this.requestChunk(chunk.index, fromParticipantId);
        return;
      }

      // Store chunk in buffer
      this.chunkBuffer.chunks.set(chunk.index, chunk);
      this.chunkBuffer.currentSize++;
      this.streamingState.receivedChunks++;
      this.streamingState.bufferedChunks = this.chunkBuffer.chunks.size;

      // Remove from missing chunks
      this.chunkBuffer.missingChunks.delete(chunk.index);

      // Emit chunk received event
      this.emit('chunk-received', {
        chunkIndex: chunk.index,
        totalReceived: this.streamingState.receivedChunks,
        totalChunks: this.streamingState.totalChunks
      });

      // Check if we have all chunks
      if (this.streamingState.receivedChunks >= this.streamingState.totalChunks) {
        this.emit('stream-complete', {
          totalChunks: this.streamingState.totalChunks
        });
      }

    } catch (error) {
      console.error('Failed to handle received chunk:', error);
    }
  }

  private async requestChunk(chunkIndex: number, participantId: string): Promise<void> {
    // This will be implemented when we have the room context
    console.log(`Requesting chunk ${chunkIndex} from ${participantId}`);
  }

  // Common Methods
  async handleWebRTCOffer(offer: RTCSessionDescriptionInit, participantId: string, roomId: string, userId: string): Promise<void> {
    try {
      const peerConnection = await this.webrtcManager.createAnsweringPeerConnection(participantId);
      
      await peerConnection.setRemoteDescription(offer);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      // Emit answer back to host
      this.emit('webrtc-answer', {
        participantId,
        answer,
        roomId,
        userId
      });

      // Send answer via Socket.IO
      socketManager.emitAny('webrtc-answer', {
        roomId,
        participantId,
        answer
      });

    } catch (error) {
      console.error(`Failed to handle WebRTC offer from ${participantId}:`, error);
    }
  }

  async handleWebRTCAnswer(answer: RTCSessionDescriptionInit, participantId: string): Promise<void> {
    try {
      const peerConnection = this.webrtcManager['peerConnections'].get(participantId);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(answer);
      }
    } catch (error) {
      console.error(`Failed to handle WebRTC answer from ${participantId}:`, error);
    }
  }

  async handleIceCandidate(candidate: RTCIceCandidateInit, participantId: string, roomId?: string): Promise<void> {
    try {
      const peerConnection = this.webrtcManager['peerConnections'].get(participantId);
      if (peerConnection) {
        await peerConnection.addIceCandidate(candidate);
      }
    } catch (error) {
      console.error(`Failed to handle ICE candidate from ${participantId}:`, error);
    }
  }

  private startBandwidthMonitoring(): void {
    this.bandwidthMonitor = setInterval(() => {
      this.updateBandwidthStats();
    }, 1000);
  }

  private updateBandwidthStats(): void {
    const connectedParticipants = this.webrtcManager.getConnectedParticipants();
    
    let totalUploadSpeed = 0;
    let totalDownloadSpeed = 0;
    let totalLatency = 0;
    let totalPacketLoss = 0;

    connectedParticipants.forEach(participantId => {
      const stats = this.webrtcManager.getBandwidthStats(participantId);
      if (stats) {
        totalUploadSpeed += stats.uploadSpeed;
        totalDownloadSpeed += stats.downloadSpeed;
        totalLatency += stats.latency;
        totalPacketLoss += stats.packetLoss;
      }
    });

    const participantCount = Math.max(connectedParticipants.length, 1);

    this.streamingState.bandwidthStats = {
      uploadSpeed: totalUploadSpeed,
      downloadSpeed: totalDownloadSpeed,
      latency: totalLatency / participantCount,
      packetLoss: totalPacketLoss / participantCount,
      timestamp: Date.now()
    };

    this.emit('bandwidth-update', this.streamingState.bandwidthStats);
  }

  private setupWebRTCHandlers(): void {
    // Set up default handlers
    this.webrtcManager.onMessage(StreamingMessageType.VIDEO_CHUNK, (message, participantId) => {
      console.log(`Received video chunk from ${participantId}`);
    });

    this.webrtcManager.onMessage(StreamingMessageType.CHUNK_REQUEST, (message, participantId) => {
      console.log(`Received chunk request from ${participantId}`);
    });
  }

  private setupWebRTCEventHandlers(): void {
    // Handle ICE candidates from WebRTC data channel manager
    this.webrtcManager.on('ice-candidate', async (data) => {
      const { participantId, candidate } = data;
      console.log(`ICE candidate from WebRTC manager for ${participantId}:`, candidate);
      
      // Send ICE candidate via Socket.IO
      socketManager.emitAny('ice-candidate', {
        roomId: this.currentRoomId || '',
        participantId,
        candidate
      });
    });
  }

  private async calculateChecksum(data: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Event System
  on(event: string, handler: (data: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: (data: any) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  // Public API
  getStreamingState(): StreamingState {
    return { ...this.streamingState };
  }

  getConfig(): StreamingConfig {
    return { ...this.config };
  }

  updateQuality(quality: string): void {
    this.streamingState.currentQuality = quality;
    this.emit('quality-changed', { quality });
  }

  async stopStreaming(): Promise<void> {
    console.log('Stopping P2P streaming');
    
    this.streamingState.isStreaming = false;
    
    if (this.streamingInterval) {
      clearInterval(this.streamingInterval);
      this.streamingInterval = null;
    }
    
    if (this.bandwidthMonitor) {
      clearInterval(this.bandwidthMonitor);
      this.bandwidthMonitor = null;
    }
    
    await this.webrtcManager.closeAllConnections();
    
    if (this.videoChunker) {
      this.videoChunker.destroy();
      this.videoChunker = null;
    }
    
    this.chunkBuffer.chunks.clear();
    this.chunkBuffer.missingChunks.clear();
    this.chunkBuffer.currentSize = 0;
    
    this.emit('streaming-stopped', {});
  }

  async destroy(): Promise<void> {
    await this.stopStreaming();
    this.eventHandlers.clear();
  }
}
