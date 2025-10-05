import React, { useRef, useEffect, useState } from 'react';
import { useSimpleVideoStreaming } from '@/hooks/useSimpleVideoStreaming';
import { useAppStore } from '@/store/useAppStore';
import { socketManager } from '@/lib/socket';
import { cn } from '@/lib/utils';

interface SimpleVideoStreamerProps {
  className?: string;
}

export const SimpleVideoStreamer: React.FC<SimpleVideoStreamerProps> = ({ className }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [isJoiningStream, setIsJoiningStream] = useState<boolean>(false);
  
  const { currentRoom, currentUser, isHost } = useAppStore();
  
  const {
    isStreaming,
    isLoading,
    error,
    videoUrl,
    videoMetadata,
    startStreaming,
    joinStream,
    stopStreaming,
    clearError
  } = useSimpleVideoStreaming();

  // Set up Socket.IO event handlers
  useEffect(() => {
    if (!currentRoom || !currentUser) return;

    const handleVideoStreamRequest = (data: any) => {
      if (data.roomId === currentRoom && isHost && currentUser) {
        console.log('Host: Received video stream request from participant:', data.participantId);
        // The host should already be streaming, so this is just a request for the current stream
        // The video stream data should already be available
      }
    };

    // Register event listeners
    socketManager.on('request-video-stream', handleVideoStreamRequest);

    return () => {
      socketManager.off('request-video-stream', handleVideoStreamRequest);
    };
  }, [currentRoom, currentUser, isHost]);

  // Handle video file selection
  const handleFileSelect = (file: File) => {
    console.log('Host: Video file selected:', file.name);
    setSelectedVideoFile(file);
  };

  // Handle starting streaming
  const handleStartStreaming = async (videoFile: File) => {
    if (!currentRoom || !currentUser || isStreaming) return;

    try {
      console.log('Host: Starting simple video streaming with file:', videoFile.name);
      await startStreaming(videoFile, currentRoom, currentUser.id);
      console.log('Host: Simple video streaming started successfully');
    } catch (error) {
      console.error('Failed to start simple video streaming:', error);
    }
  };

  // Handle joining stream as participant
  const handleJoinStream = async () => {
    if (!currentRoom || !currentUser || isJoiningStream) return;

    setIsJoiningStream(true);
    try {
      console.log('Participant: Attempting to join simple video stream in room:', currentRoom);
      await joinStream(currentRoom, currentUser.id);
      console.log('Participant: Successfully requested video stream');
    } catch (error) {
      console.error('Participant: Failed to join simple video stream:', error);
    } finally {
      setTimeout(() => {
        setIsJoiningStream(false);
      }, 2000);
    }
  };

  // Handle stopping stream
  const handleStopStreaming = async () => {
    try {
      await stopStreaming();
    } catch (error) {
      console.error('Failed to stop streaming:', error);
    }
  };

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
            autoPlay
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
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>
                {isHost ? 'Streaming' : 'Receiving Stream'}
              </span>
            </div>
          </div>
        )}

        {/* Video Metadata */}
        {videoMetadata && (
          <div className="absolute bottom-4 left-4 bg-black/75 text-white px-3 py-1 rounded-lg text-sm">
            <div className="flex items-center gap-2">
              <span>{videoMetadata.name}</span>
              <span className="text-slate-300">
                ({(videoMetadata.size / (1024 * 1024)).toFixed(1)} MB)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Streaming Controls */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">
            {isHost ? 'Simple Video Streaming' : 'Stream Status'}
          </h3>
          
          {isStreaming && (
            <button
              onClick={handleStopStreaming}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
              </svg>
              Stop
            </button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={clearError}
                className="text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <p className="text-sm text-blue-700">
                {isHost ? 'Starting stream...' : 'Joining stream...'}
              </p>
            </div>
          </div>
        )}

        {/* Host Controls */}
        {isHost && !isStreaming && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Video File
              </label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100"
              />
            </div>

            {selectedVideoFile ? (
              <div className="text-center space-y-3">
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-700 font-medium">
                    ✅ Video selected: {selectedVideoFile.name}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {(selectedVideoFile.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
                
                <button
                  onClick={() => selectedVideoFile && handleStartStreaming(selectedVideoFile)}
                  disabled={isLoading}
                  className={`flex items-center gap-2 px-6 py-3 rounded-md transition-colors mx-auto ${
                    isLoading 
                      ? 'bg-blue-400 text-white cursor-not-allowed' 
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Starting Stream...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                      Start Simple Streaming
                    </>
                  )}
                </button>
                
                <p className="text-xs text-slate-500">
                  Click to start simple video streaming to participants
                </p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-2">
                  Select a video file to start streaming
                </p>
              </div>
            )}
          </div>
        )}

        {/* Participant Controls */}
        {!isHost && !isStreaming && (
          <div className="text-center">
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                ⏳ Waiting for host to start streaming...
              </p>
              <button
                onClick={handleJoinStream}
                disabled={isJoiningStream}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors mx-auto ${
                  isJoiningStream 
                    ? 'bg-blue-400 text-white cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isJoiningStream ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Joining...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Join Stream
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Streaming Status */}
        {isStreaming && (
          <div className="text-center">
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-700 font-medium">
                ✅ {isHost ? 'Streaming to participants' : 'Receiving stream from host'}
              </p>
              {videoMetadata && (
                <p className="text-xs text-green-600 mt-1">
                  {videoMetadata.name} ({(videoMetadata.size / (1024 * 1024)).toFixed(1)} MB)
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Debug Panel */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-slate-700 mb-2">Debug Info</h4>
        <div className="text-xs text-slate-600 space-y-1">
          <div>Room: {currentRoom || 'None'}</div>
          <div>User: {currentUser?.name || 'None'} ({currentUser?.id || 'None'})</div>
          <div>Role: {isHost ? 'Host' : 'Participant'}</div>
          <div>Streaming: {isStreaming ? 'Yes' : 'No'}</div>
          <div>Video File: {selectedVideoFile ? selectedVideoFile.name : 'None'}</div>
          <div>Video URL: {videoUrl ? 'Set' : 'None'}</div>
          <div>Video Metadata: {videoMetadata ? 'Available' : 'None'}</div>
        </div>
      </div>
    </div>
  );
};
