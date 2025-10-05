import { useState, useEffect, useCallback, useRef } from 'react';
import { simpleVideoStreamingManager, VideoStreamData } from '@/lib/simpleVideoStreaming';

export const useSimpleVideoStreaming = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoMetadata, setVideoMetadata] = useState<{
    name: string;
    size: number;
  } | null>(null);

  const managerRef = useRef(simpleVideoStreamingManager);

  // Host methods
  const startStreaming = useCallback(async (videoFile: File, roomId: string, userId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await managerRef.current.startStreaming(videoFile, roomId, userId);
      setIsStreaming(true);
      setVideoUrl(managerRef.current.getVideoUrl());
      setVideoMetadata({
        name: videoFile.name,
        size: videoFile.size
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start streaming');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Participant methods
  const joinStream = useCallback(async (roomId: string, userId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await managerRef.current.joinStream(roomId, userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join stream');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    managerRef.current.stopStreaming();
    setIsStreaming(false);
    setVideoUrl(null);
    setVideoMetadata(null);
    setError(null);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Set up event listeners
  useEffect(() => {
    const handleVideoStreamStarted = (data: VideoStreamData) => {
      console.log('Received video stream data:', data);
      setVideoUrl(data.videoUrl);
      setVideoMetadata({
        name: data.videoName,
        size: data.videoSize
      });
      setIsStreaming(true);
      setError(null);
    };

    const handleVideoStreamStopped = () => {
      console.log('Video stream stopped');
      setVideoUrl(null);
      setVideoMetadata(null);
      setIsStreaming(false);
    };

    // Register event listeners
    socketManager.on('video-stream-started', handleVideoStreamStarted);
    socketManager.on('video-stream-stopped', handleVideoStreamStopped);

    return () => {
      socketManager.off('video-stream-started', handleVideoStreamStarted);
      socketManager.off('video-stream-stopped', handleVideoStreamStopped);
    };
  }, []);

  return {
    isStreaming,
    isLoading,
    error,
    videoUrl,
    videoMetadata,
    startStreaming,
    joinStream,
    stopStreaming,
    clearError
  };
};
