import { socketManager } from './socket';

export interface VideoStreamData {
  roomId: string;
  hostId: string;
  hostName: string;
  videoUrl: string;
  videoName: string;
  videoSize: number;
  timestamp: number;
}

export class SimpleVideoStreamingManager {
  private currentRoomId: string | null = null;
  private isHost: boolean = false;
  private videoUrl: string | null = null;

  // Host methods
  async startStreaming(videoFile: File, roomId: string, userId: string): Promise<void> {
    try {
      console.log('SimpleVideoStreaming: Starting streaming for room:', roomId);
      
      this.currentRoomId = roomId;
      this.isHost = true;
      
      // Create blob URL for the video
      const videoUrl = URL.createObjectURL(videoFile);
      this.videoUrl = videoUrl;
      
      // Send video stream data to all participants
      const streamData: VideoStreamData = {
        roomId,
        hostId: userId,
        hostName: 'Host', // This should come from user data
        videoUrl,
        videoName: videoFile.name,
        videoSize: videoFile.size,
        timestamp: Date.now()
      };
      
      // Emit to server to broadcast to all participants
      socketManager.emitAny('video-stream-started', streamData);
      
      console.log('SimpleVideoStreaming: Video stream started successfully');
      
    } catch (error) {
      console.error('SimpleVideoStreaming: Failed to start streaming:', error);
      throw error;
    }
  }

  // Participant methods
  async joinStream(roomId: string, userId: string): Promise<void> {
    try {
      console.log('SimpleVideoStreaming: Joining stream for room:', roomId);
      
      this.currentRoomId = roomId;
      this.isHost = false;
      
      // Request video stream from host
      socketManager.emitAny('request-video-stream', { roomId, userId });
      
      console.log('SimpleVideoStreaming: Join stream request sent');
      
    } catch (error) {
      console.error('SimpleVideoStreaming: Failed to join stream:', error);
      throw error;
    }
  }

  // Get current video URL
  getVideoUrl(): string | null {
    return this.videoUrl;
  }

  // Check if currently streaming
  isStreaming(): boolean {
    return this.videoUrl !== null;
  }

  // Check if host
  isHostMode(): boolean {
    return this.isHost;
  }

  // Cleanup
  stopStreaming(): void {
    if (this.videoUrl) {
      URL.revokeObjectURL(this.videoUrl);
      this.videoUrl = null;
    }
    this.currentRoomId = null;
    this.isHost = false;
  }
}

export const simpleVideoStreamingManager = new SimpleVideoStreamingManager();
