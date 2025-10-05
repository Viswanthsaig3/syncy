import { useState, useEffect, useCallback, useRef } from 'react';
import { P2PStreamingManager } from '@/lib/p2pStreaming';
import { StreamingState, VideoMetadata, BandwidthStats } from '@/types/streaming';

export const useP2PStreaming = () => {
  const [streamingState, setStreamingState] = useState<StreamingState>({
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
  });

  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamingManagerRef = useRef<P2PStreamingManager | null>(null);

  // Initialize streaming manager
  useEffect(() => {
    if (!streamingManagerRef.current) {
      streamingManagerRef.current = new P2PStreamingManager();
      setupEventHandlers();
    }

    return () => {
      if (streamingManagerRef.current) {
        streamingManagerRef.current.destroy();
        streamingManagerRef.current = null;
      }
    };
  }, []);

  const setupEventHandlers = useCallback(() => {
    if (!streamingManagerRef.current) return;

    const manager = streamingManagerRef.current;

    // Streaming events
    manager.on('streaming-started', (data) => {
      console.log('Streaming started:', data);
      setVideoMetadata(data.metadata);
      setStreamingState(prev => ({
        ...prev,
        isStreaming: true,
        isHost: true,
        totalChunks: data.totalChunks,
        currentQuality: data.quality
      }));
      setIsLoading(false);
    });

    manager.on('streaming-stopped', () => {
      console.log('Streaming stopped');
      setStreamingState(prev => ({
        ...prev,
        isStreaming: false,
        isHost: false,
        totalChunks: 0,
        receivedChunks: 0,
        bufferedChunks: 0
      }));
      setVideoMetadata(null);
      setIsLoading(false);
    });

    manager.on('streaming-error', (data) => {
      console.error('Streaming error:', data);
      setError(data.message);
      setIsLoading(false);
    });

    // Participant events
    manager.on('stream-metadata', (data) => {
      console.log('Stream metadata received:', data);
      setStreamingState(prev => ({
        ...prev,
        totalChunks: data.totalChunks,
        currentQuality: data.quality
      }));
      setVideoMetadata(data.metadata);
    });

    manager.on('chunk-received', (data) => {
      setStreamingState(prev => ({
        ...prev,
        receivedChunks: data.totalReceived,
        bufferedChunks: data.totalReceived
      }));
    });

    manager.on('stream-complete', (data) => {
      console.log('Stream complete:', data);
      setStreamingState(prev => ({
        ...prev,
        receivedChunks: data.totalChunks,
        bufferedChunks: data.totalChunks
      }));
    });

    // Bandwidth events
    manager.on('bandwidth-update', (stats: BandwidthStats) => {
      setStreamingState(prev => ({
        ...prev,
        bandwidthStats: stats
      }));
    });

    // Quality events
    manager.on('quality-changed', (data) => {
      setStreamingState(prev => ({
        ...prev,
        currentQuality: data.quality
      }));
    });

    // WebRTC events
    manager.on('webrtc-offer', (data) => {
      console.log('WebRTC offer:', data);
      // This will be handled by the Socket.IO integration
    });

    manager.on('webrtc-answer', (data) => {
      console.log('WebRTC answer:', data);
      // This will be handled by the Socket.IO integration
    });

    manager.on('join-stream-request', (data) => {
      console.log('Join stream request:', data);
      // This will be handled by the Socket.IO integration
    });

  }, []);

  // Host methods
  const startHosting = useCallback(async (videoFile: File, roomId: string, userId: string) => {
    if (!streamingManagerRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      await streamingManagerRef.current.startHosting(videoFile, roomId, userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start hosting');
      setIsLoading(false);
    }
  }, []);

  const streamToParticipant = useCallback(async (participantId: string, roomId: string, userId: string) => {
    if (!streamingManagerRef.current) return;

    try {
      await streamingManagerRef.current.streamToParticipant(participantId, roomId, userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stream to participant');
    }
  }, []);

  // Participant methods
  const joinStream = useCallback(async (roomId: string, userId: string) => {
    if (!streamingManagerRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      await streamingManagerRef.current.joinStream(roomId, userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join stream');
      setIsLoading(false);
    }
  }, []);

  // Common methods
  const handleWebRTCOffer = useCallback(async (offer: RTCSessionDescriptionInit, participantId: string, roomId: string, userId: string) => {
    if (!streamingManagerRef.current) return;

    try {
      await streamingManagerRef.current.handleWebRTCOffer(offer, participantId, roomId, userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to handle WebRTC offer');
    }
  }, []);

  const handleWebRTCAnswer = useCallback(async (answer: RTCSessionDescriptionInit, participantId: string) => {
    if (!streamingManagerRef.current) return;

    try {
      await streamingManagerRef.current.handleWebRTCAnswer(answer, participantId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to handle WebRTC answer');
    }
  }, []);

  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit, participantId: string, roomId?: string) => {
    if (!streamingManagerRef.current) return;

    try {
      await streamingManagerRef.current.handleIceCandidate(candidate, participantId, roomId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to handle ICE candidate');
    }
  }, []);

  // Utility methods
  const updateQuality = useCallback((quality: string) => {
    if (!streamingManagerRef.current) return;
    streamingManagerRef.current.updateQuality(quality);
  }, []);

  const stopStreaming = useCallback(async () => {
    if (!streamingManagerRef.current) return;

    try {
      await streamingManagerRef.current.stopStreaming();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop streaming');
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Progress calculation
  const progress = streamingState.totalChunks > 0 
    ? (streamingState.receivedChunks / streamingState.totalChunks) * 100 
    : 0;

  // Connection quality
  const connectionQuality = streamingState.bandwidthStats.latency < 100 && streamingState.bandwidthStats.packetLoss < 5 
    ? 'excellent' 
    : streamingState.bandwidthStats.latency < 200 && streamingState.bandwidthStats.packetLoss < 10 
    ? 'good' 
    : streamingState.bandwidthStats.latency < 500 && streamingState.bandwidthStats.packetLoss < 20 
    ? 'fair' 
    : 'poor';

  return {
    // State
    streamingState,
    videoMetadata,
    isLoading,
    error,
    progress,
    connectionQuality,

    // Host methods
    startHosting,
    streamToParticipant,

    // Participant methods
    joinStream,

    // WebRTC methods
    handleWebRTCOffer,
    handleWebRTCAnswer,
    handleIceCandidate,

    // Utility methods
    updateQuality,
    stopStreaming,
    clearError,

    // Computed values
    isStreaming: streamingState.isStreaming,
    isHost: streamingState.isHost,
    totalChunks: streamingState.totalChunks,
    receivedChunks: streamingState.receivedChunks,
    bufferedChunks: streamingState.bufferedChunks,
    bandwidthStats: streamingState.bandwidthStats,
    currentQuality: streamingState.currentQuality
  };
};
