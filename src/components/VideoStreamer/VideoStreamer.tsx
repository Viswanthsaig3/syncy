import React, { useRef, useEffect, useState } from 'react';
import { useP2PStreaming } from '@/hooks/useP2PStreaming';
import { useAppStore } from '@/store/useAppStore';
import { socketManager } from '@/lib/socket';
import { StreamingControls } from './StreamingControls';
import { cn } from '@/lib/utils';

interface VideoStreamerProps {
  className?: string;
}

export const VideoStreamer: React.FC<VideoStreamerProps> = ({ className }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [hostStreamingReady, setHostStreamingReady] = useState<boolean>(false);
  const [isJoiningStream, setIsJoiningStream] = useState<boolean>(false);
  
  const { currentRoom, currentUser, isHost } = useAppStore();
  
  const {
    isStreaming,
    videoMetadata,
    progress,
    connectionQuality,
    bandwidthStats,
    startHosting,
    streamToParticipant,
    joinStream,
    stopStreaming,
    handleWebRTCOffer,
    handleWebRTCAnswer,
    handleIceCandidate
  } = useP2PStreaming();

  // Set up Socket.IO event handlers for WebRTC signaling
  useEffect(() => {
    if (!currentRoom || !currentUser) return;

    const handleWebRTCOfferEvent = (data: any) => {
      console.log('Received WebRTC offer:', data);
      if (data.roomId === currentRoom) {
        console.log('Processing WebRTC offer for participant:', data.participantId);
        handleWebRTCOffer(data.offer, data.participantId, data.roomId, data.userId);
      }
    };

    const handleWebRTCAnswerEvent = (data: any) => {
      console.log('Received WebRTC answer:', data);
      if (data.roomId === currentRoom) {
        console.log('Processing WebRTC answer for participant:', data.participantId);
        handleWebRTCAnswer(data.answer, data.participantId);
      }
    };

    const handleIceCandidateEvent = (data: any) => {
      if (data.roomId === currentRoom) {
        handleIceCandidate(data.candidate, data.participantId, data.roomId);
      }
    };

    const handleJoinStreamRequest = async (data: any) => {
      console.log('Host: Received join stream request:', data);
      console.log('Host: Current room:', currentRoom);
      console.log('Host: Is host:', isHost);
      console.log('Host: Current user:', currentUser);
      
      if (data.roomId === currentRoom && isHost && currentUser) {
        // Host should initiate streaming to new participant
        console.log('Host: Initiating streaming to new participant:', data.participantId);
        try {
          await streamToParticipant(data.participantId, currentRoom, currentUser.id);
          console.log('Host: Successfully initiated streaming to participant');
        } catch (error) {
          console.error('Host: Failed to stream to new participant:', error);
        }
      } else {
        console.log('Host: Not handling join request - conditions not met:', {
          roomMatch: data.roomId === currentRoom,
          isHost: isHost,
          hasUser: !!currentUser
        });
      }
    };

    const handleStreamingStarted = async (data: any) => {
      console.log('Received streaming-started event:', data);
      console.log('Current room:', currentRoom);
      console.log('Is host:', isHost);
      console.log('Current user:', currentUser);
      
      if (data.roomId === currentRoom && !isHost && currentUser) {
        // Participant should wait for manual join - don't auto-join
        console.log('Host started streaming, ready for participants to join manually');
        setHostStreamingReady(true);
      } else {
        console.log('Not a participant or conditions not met:', {
          roomMatch: data.roomId === currentRoom,
          notHost: !isHost,
          hasUser: !!currentUser
        });
      }
    };

    // Register event listeners
    socketManager.on('webrtc-offer', handleWebRTCOfferEvent);
    socketManager.on('webrtc-answer', handleWebRTCAnswerEvent);
    socketManager.on('ice-candidate', handleIceCandidateEvent);
    socketManager.on('join-stream-request', handleJoinStreamRequest);
    socketManager.on('streaming-started', handleStreamingStarted);

    return () => {
      socketManager.off('webrtc-offer', handleWebRTCOfferEvent);
      socketManager.off('webrtc-answer', handleWebRTCAnswerEvent);
      socketManager.off('ice-candidate', handleIceCandidateEvent);
      socketManager.off('join-stream-request', handleJoinStreamRequest);
      socketManager.off('streaming-started', handleStreamingStarted);
    };
  }, [currentRoom, currentUser, isHost, handleWebRTCOffer, handleWebRTCAnswer, handleIceCandidate, streamToParticipant, joinStream]);

  // Handle video file selection for hosting
  const handleStartStreaming = async (videoFile: File) => {
    if (!currentRoom || !currentUser) return;

    try {
      console.log('Host: Starting streaming with video file:', videoFile.name);
      await startHosting(videoFile, currentRoom, currentUser.id);
      
      // Create blob URL for local playback
      const url = URL.createObjectURL(videoFile);
      setVideoUrl(url);
      setVideoBlob(new Blob([videoFile]));
      
      console.log('Host: Streaming setup complete, ready for participants');
      
    } catch (error) {
      console.error('Failed to start streaming:', error);
    }
  };

  // Handle joining stream as participant
  const handleJoinStream = async () => {
    if (!currentRoom || !currentUser || isJoiningStream) return;

    setIsJoiningStream(true);
    try {
      console.log('Participant: Attempting to join stream in room:', currentRoom);
      await joinStream(currentRoom, currentUser.id);
      console.log('Participant: Successfully initiated join stream request');
    } catch (error) {
      console.error('Participant: Failed to join stream:', error);
    } finally {
      // Reset joining state after a delay to prevent rapid retries
      setTimeout(() => {
        setIsJoiningStream(false);
      }, 2000);
    }
  };

  // Handle stopping stream
  const handleStopStreaming = async () => {
    try {
      await stopStreaming();
      
      // Clean up video URL
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
        setVideoUrl('');
        setVideoBlob(null);
      }
    } catch (error) {
      console.error('Failed to stop streaming:', error);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Video Player */}
      <div className="relative bg-black rounded-lg overflow-hidden border border-slate-200">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            controls
            preload="metadata"
          />
        ) : (
          <div className="aspect-video flex items-center justify-center">
            <div className="text-center text-slate-400">
              <div className="w-16 h-16 bg-slate-800 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
              </div>
              <p className="text-lg font-medium">
                {isHost ? 'Select a video file to start streaming' : 'Waiting for host to start stream'}
              </p>
            </div>
          </div>
        )}

        {/* Streaming Overlay */}
        {isStreaming && (
          <div className="absolute top-4 left-4 bg-black/75 text-white px-3 py-1 rounded-lg text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                connectionQuality === 'excellent' ? 'bg-green-500' :
                connectionQuality === 'good' ? 'bg-blue-500' :
                connectionQuality === 'fair' ? 'bg-yellow-500' :
                'bg-red-500'
              }`} />
              <span>
                {isHost ? 'Streaming' : 'Receiving'} • {progress.toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        {/* Video Metadata */}
        {videoMetadata && (
          <div className="absolute bottom-4 left-4 bg-black/75 text-white px-3 py-1 rounded-lg text-sm">
            <div className="flex items-center gap-2">
              <span>{videoMetadata.fileName}</span>
              <span className="text-slate-300">•</span>
              <span>{(videoMetadata.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
            </div>
          </div>
        )}
      </div>

      {/* Streaming Controls */}
      <StreamingControls
        isHost={isHost}
        hostStreamingReady={hostStreamingReady}
        isJoiningStream={isJoiningStream}
        onStartStreaming={handleStartStreaming}
        onStopStreaming={handleStopStreaming}
        onJoinStream={handleJoinStream}
      />

      {/* Debug Panel */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-slate-700 mb-2">Debug Info</h4>
        <div className="text-xs text-slate-600 space-y-1">
          <div>Room: {currentRoom || 'None'}</div>
          <div>User: {currentUser?.name || 'None'} ({currentUser?.id || 'None'})</div>
          <div>Role: {isHost ? 'Host' : 'Participant'}</div>
          <div>Streaming: {isStreaming ? 'Yes' : 'No'}</div>
          <div>Video URL: {videoUrl ? 'Set' : 'None'}</div>
          <div>Video Metadata: {videoMetadata ? 'Available' : 'None'}</div>
        </div>
      </div>

      {/* Bandwidth Monitor */}
      {isStreaming && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-slate-900 mb-3">Connection Status</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-slate-600">Upload Speed</div>
              <div className="font-medium">
                {isHost ? `${(bandwidthStats.uploadSpeed / (1024 * 1024)).toFixed(1)} MB/s` : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-slate-600">Download Speed</div>
              <div className="font-medium">
                {`${(bandwidthStats.downloadSpeed / (1024 * 1024)).toFixed(1)} MB/s`}
              </div>
            </div>
            <div>
              <div className="text-slate-600">Latency</div>
              <div className="font-medium">{bandwidthStats.latency.toFixed(0)}ms</div>
            </div>
            <div>
              <div className="text-slate-600">Packet Loss</div>
              <div className="font-medium">{bandwidthStats.packetLoss.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
