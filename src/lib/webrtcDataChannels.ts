import { VideoChunk, StreamingMessage, StreamingMessageType, BandwidthStats } from '@/types/streaming';

export class WebRTCDataChannelManager {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ];
  private bandwidthStats: Map<string, BandwidthStats> = new Map();
  private messageHandlers: Map<StreamingMessageType, (message: StreamingMessage, participantId: string) => void> = new Map();
  private connectionStateHandlers: Map<string, (state: RTCPeerConnectionState) => void> = new Map();
  private eventHandlers: Map<string, ((data: any) => void)[]> = new Map();

  constructor() {
    this.setupDefaultHandlers();
  }

  async createPeerConnection(participantId: string): Promise<RTCPeerConnection> {
    const config: RTCConfiguration = {
      iceServers: this.iceServers,
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    };

    const peerConnection = new RTCPeerConnection(config);
    
    // Set up connection state monitoring
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state for ${participantId}:`, peerConnection.connectionState);
      const handler = this.connectionStateHandlers.get(participantId);
      if (handler) {
        handler(peerConnection.connectionState);
      }
    };

    // Set up ICE candidate handling
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.handleIceCandidate(participantId, event.candidate);
      }
    };

    // Set up ICE connection state monitoring
    peerConnection.oniceconnectionstatechange = () => {
      console.log(`ICE connection state for ${participantId}:`, peerConnection.iceConnectionState);
      this.updateBandwidthStats(participantId, peerConnection.iceConnectionState);
    };

    // Set up data channel
    const dataChannel = peerConnection.createDataChannel('video-stream', {
      ordered: true,
      maxRetransmits: 3,
      maxPacketLifeTime: 5000
    });

    this.setupDataChannel(dataChannel, participantId);
    
    this.peerConnections.set(participantId, peerConnection);
    this.dataChannels.set(participantId, dataChannel);

    return peerConnection;
  }

  async createAnsweringPeerConnection(participantId: string): Promise<RTCPeerConnection> {
    const config: RTCConfiguration = {
      iceServers: this.iceServers,
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    };

    const peerConnection = new RTCPeerConnection(config);
    
    // Set up connection state monitoring
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state for ${participantId}:`, peerConnection.connectionState);
      const handler = this.connectionStateHandlers.get(participantId);
      if (handler) {
        handler(peerConnection.connectionState);
      }
    };

    // Set up ICE candidate handling
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.handleIceCandidate(participantId, event.candidate);
      }
    };

    // Set up ICE connection state monitoring
    peerConnection.oniceconnectionstatechange = () => {
      console.log(`ICE connection state for ${participantId}:`, peerConnection.iceConnectionState);
      this.updateBandwidthStats(participantId, peerConnection.iceConnectionState);
    };

    // Set up data channel receiver
    peerConnection.ondatachannel = (event) => {
      const dataChannel = event.channel;
      this.setupDataChannel(dataChannel, participantId);
      this.dataChannels.set(participantId, dataChannel);
    };
    
    this.peerConnections.set(participantId, peerConnection);

    return peerConnection;
  }

  private setupDataChannel(dataChannel: RTCDataChannel, participantId: string): void {
    dataChannel.onopen = () => {
      console.log(`Data channel opened for ${participantId}`);
    };

    dataChannel.onclose = () => {
      console.log(`Data channel closed for ${participantId}`);
    };

    dataChannel.onerror = (error) => {
      console.error(`Data channel error for ${participantId}:`, error);
    };

    dataChannel.onmessage = (event) => {
      try {
        const message: StreamingMessage = JSON.parse(event.data);
        this.handleMessage(message, participantId);
      } catch (error) {
        console.error(`Failed to parse message from ${participantId}:`, error);
      }
    };
  }

  async sendMessage(message: StreamingMessage, participantId: string): Promise<boolean> {
    const dataChannel = this.dataChannels.get(participantId);
    if (!dataChannel || dataChannel.readyState !== 'open') {
      console.warn(`Data channel not ready for ${participantId}`);
      return false;
    }

    try {
      const messageData = JSON.stringify(message);
      dataChannel.send(messageData);
      return true;
    } catch (error) {
      console.error(`Failed to send message to ${participantId}:`, error);
      return false;
    }
  }

  async sendVideoChunk(chunk: VideoChunk, participantId: string): Promise<boolean> {
    const message: StreamingMessage = {
      type: StreamingMessageType.VIDEO_CHUNK,
      roomId: '', // Will be set by caller
      fromUserId: '', // Will be set by caller
      data: {
        chunk: {
          index: chunk.index,
          data: Array.from(new Uint8Array(chunk.data)),
          timestamp: chunk.timestamp,
          isLast: chunk.isLast,
          size: chunk.size,
          checksum: chunk.checksum
        }
      },
      timestamp: Date.now()
    };

    return this.sendMessage(message, participantId);
  }

  async sendChunkRequest(chunkIndex: number, participantId: string, roomId: string, fromUserId: string): Promise<boolean> {
    const message: StreamingMessage = {
      type: StreamingMessageType.CHUNK_REQUEST,
      roomId,
      fromUserId,
      toUserId: participantId,
      data: { chunkIndex },
      timestamp: Date.now()
    };

    return this.sendMessage(message, participantId);
  }

  onMessage(type: StreamingMessageType, handler: (message: StreamingMessage, participantId: string) => void): void {
    this.messageHandlers.set(type, handler);
  }

  onConnectionStateChange(participantId: string, handler: (state: RTCPeerConnectionState) => void): void {
    this.connectionStateHandlers.set(participantId, handler);
  }

  private handleMessage(message: StreamingMessage, participantId: string): void {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message, participantId);
    }
  }

  private handleIceCandidate(participantId: string, candidate: RTCIceCandidate): void {
    // This will be handled by the P2P streaming manager
    console.log(`ICE candidate for ${participantId}:`, candidate);
    // Emit ICE candidate event for the P2P streaming manager to handle
    this.emit('ice-candidate', { participantId, candidate });
  }

  private updateBandwidthStats(participantId: string, state: RTCIceConnectionState): void {
    const stats: BandwidthStats = {
      uploadSpeed: 0,
      downloadSpeed: 0,
      latency: 0,
      packetLoss: 0,
      timestamp: Date.now()
    };

    // Update stats based on connection state
    if (state === 'connected' || state === 'completed') {
      stats.latency = 50; // Default latency for connected state
    } else if (state === 'disconnected' || state === 'failed') {
      stats.packetLoss = 100;
    }

    this.bandwidthStats.set(participantId, stats);
  }

  getBandwidthStats(participantId: string): BandwidthStats | null {
    return this.bandwidthStats.get(participantId) || null;
  }

  getConnectionState(participantId: string): RTCPeerConnectionState | null {
    const peerConnection = this.peerConnections.get(participantId);
    return peerConnection ? peerConnection.connectionState : null;
  }

  async closeConnection(participantId: string): Promise<void> {
    const dataChannel = this.dataChannels.get(participantId);
    if (dataChannel) {
      dataChannel.close();
      this.dataChannels.delete(participantId);
    }

    const peerConnection = this.peerConnections.get(participantId);
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(participantId);
    }

    this.bandwidthStats.delete(participantId);
    this.connectionStateHandlers.delete(participantId);
  }

  async closeAllConnections(): Promise<void> {
    const participantIds = Array.from(this.peerConnections.keys());
    await Promise.all(participantIds.map(id => this.closeConnection(id)));
  }

  getConnectedParticipants(): string[] {
    return Array.from(this.peerConnections.keys()).filter(id => {
      const state = this.getConnectionState(id);
      return state === 'connected' || state === 'connecting';
    });
  }

  private setupDefaultHandlers(): void {
    // Default handlers can be overridden by the P2P streaming manager
    this.messageHandlers.set(StreamingMessageType.VIDEO_CHUNK, (message, participantId) => {
      console.log(`Received video chunk from ${participantId}:`, message.data);
    });

    this.messageHandlers.set(StreamingMessageType.CHUNK_REQUEST, (message, participantId) => {
      console.log(`Received chunk request from ${participantId}:`, message.data);
    });
  }

  // Event system
  on(event: string, handler: (data: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
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
}
