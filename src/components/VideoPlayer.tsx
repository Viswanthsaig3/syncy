'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { socketManager } from '@/lib/socket';
import { formatTime, debounce } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  className?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ className }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showControls, setShowControls] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [localVideoState, setLocalVideoState] = useState({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    playbackRate: 1,
    isMuted: false,
  });
  
  const {
    currentRoom,
    videoUrl,
    videoPlayerState,
    updateVideoPlayerState,
    isHost,
  } = useAppStore();

  // Simple video state sync - only sync from store to video, not the other way around
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    // Update local state from store
    setLocalVideoState({
      isPlaying: videoPlayerState.isPlaying,
      currentTime: videoPlayerState.currentTime,
      duration: videoPlayerState.duration,
      volume: videoPlayerState.volume,
      playbackRate: videoPlayerState.playbackRate,
      isMuted: videoPlayerState.isMuted,
    });

    // Sync video element with store state
    if (Math.abs(video.currentTime - videoPlayerState.currentTime) > 0.5) {
      video.currentTime = videoPlayerState.currentTime;
    }
    
    video.volume = videoPlayerState.isMuted ? 0 : videoPlayerState.volume;
    video.playbackRate = videoPlayerState.playbackRate;
    
    // Handle play/pause
    if (videoPlayerState.isPlaying && video.paused) {
      video.play().catch(console.error);
    } else if (!videoPlayerState.isPlaying && !video.paused) {
      video.pause();
    }
  }, [videoPlayerState, videoUrl]);

  // Simple event handlers - only for host
  const handlePlayPause = useCallback(() => {
    if (!isHost || !currentRoom) return;
    
    const video = videoRef.current;
    if (!video) return;

    const newIsPlaying = !localVideoState.isPlaying;
    const currentTime = video.currentTime;
    
    // Update store
    updateVideoPlayerState({ 
      isPlaying: newIsPlaying,
      currentTime: currentTime
    });
    
    // Send to other users
    socketManager.sendVideoEvent({
      roomId: currentRoom,
      type: newIsPlaying ? 'play' : 'pause',
      time: currentTime,
    });
  }, [isHost, currentRoom, localVideoState.isPlaying, updateVideoPlayerState]);

  const handleSeek = useCallback(
    debounce((newTime: number) => {
      if (!isHost || !currentRoom) return;
      
      const video = videoRef.current;
      if (!video) return;

      const clampedTime = Math.max(0, Math.min(newTime, localVideoState.duration));
      
      // Update store
      updateVideoPlayerState({ currentTime: clampedTime });
      
      // Send to other users
      socketManager.sendVideoEvent({
        roomId: currentRoom,
        type: 'seek',
        time: clampedTime,
      });
    }, 100),
    [isHost, currentRoom, localVideoState.duration, updateVideoPlayerState]
  );

  const handleVolumeChange = useCallback((newVolume: number) => {
    if (!isHost || !currentRoom) return;

    const isMuted = newVolume === 0;
    
    // Update store
    updateVideoPlayerState({ 
      volume: newVolume,
      isMuted: isMuted
    });
    
    // Send to other users
    socketManager.sendVideoEvent({
      roomId: currentRoom,
      type: 'volume',
      volume: newVolume,
    });
  }, [isHost, currentRoom, updateVideoPlayerState]);

  const handleSpeedChange = useCallback((newSpeed: number) => {
    if (!isHost || !currentRoom) return;

    // Update store
    updateVideoPlayerState({ playbackRate: newSpeed });
    
    // Send to other users
    socketManager.sendVideoEvent({
      roomId: currentRoom,
      type: 'speed',
      speed: newSpeed,
    });
  }, [isHost, currentRoom, updateVideoPlayerState]);

  // Simple video event listeners - only for metadata and time updates
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      console.log('Video metadata loaded, duration:', video.duration);
      const duration = video.duration || 0;
      updateVideoPlayerState({
        duration: duration,
        isLoading: false,
        hasError: false,
      });
      // Also update local state immediately
      setLocalVideoState(prev => ({
        ...prev,
        duration: duration
      }));
    };

    const handleTimeUpdate = () => {
      if (!isDragging) {
        // Only update current time, don't trigger events
        setLocalVideoState(prev => ({
          ...prev,
          currentTime: video.currentTime
        }));
      }
    };

    const handleError = () => {
      updateVideoPlayerState({ hasError: true, isLoading: false });
    };

    const handleLoadStart = () => {
      updateVideoPlayerState({ isLoading: true });
    };

    const handleEnded = () => {
      updateVideoPlayerState({ 
        isPlaying: false, 
        currentTime: 0 
      });
      
      if (isHost && currentRoom) {
        socketManager.sendVideoEvent({
          roomId: currentRoom,
          type: 'seek',
          time: 0,
        });
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('error', handleError);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('ended', handleEnded);
    };
  }, [updateVideoPlayerState, isDragging, isHost, currentRoom]);

  // Handle progress bar interaction
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isHost || !videoRef.current || !localVideoState.duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * localVideoState.duration;
    
    handleSeek(newTime);
  };

  // Handle fullscreen
  const handleFullscreen = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await video.requestFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  // Auto-hide controls
  useEffect(() => {
    if (!isHovering) return;

    const timer = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isHovering, localVideoState.isPlaying]);

  if (!videoUrl) {
    return (
      <div className={cn(
        'flex items-center justify-center bg-slate-900 rounded-lg border border-slate-200',
        'aspect-video w-full max-w-4xl mx-auto',
        className
      )}>
        <div className="text-center text-slate-400">
          <div className="w-16 h-16 bg-slate-800 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Play className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-lg font-medium">Select a video file to begin</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative bg-black rounded-lg overflow-hidden group border border-slate-200',
        'aspect-video w-full max-w-4xl mx-auto',
        className
      )}
      onMouseEnter={() => {
        setIsHovering(true);
        setShowControls(true);
      }}
      onMouseLeave={() => setIsHovering(false)}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain"
        preload="metadata"
      />

      {/* Loading overlay */}
      {videoPlayerState.isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}

      {/* Error overlay */}
      {videoPlayerState.hasError && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="text-4xl mb-2">⚠️</div>
            <p>Error loading video</p>
          </div>
        </div>
      )}

      {/* Controls overlay */}
      {showControls && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
          {/* Top controls */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={handleFullscreen}
              className="p-2 bg-black/50 rounded-lg text-white hover:bg-black/70 transition-colors"
            >
              <Maximize className="w-5 h-5" />
            </button>
          </div>

          {/* Center play/pause button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={handlePlayPause}
              className="p-4 bg-black/50 rounded-lg text-white hover:bg-black/70 transition-colors"
              disabled={!isHost}
            >
              {localVideoState.isPlaying ? (
                <Pause className="w-8 h-8" />
              ) : (
                <Play className="w-8 h-8" />
              )}
            </button>
          </div>

          {/* Bottom controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            {/* Progress bar */}
            <div
              className="w-full h-1 bg-slate-600 rounded-full cursor-pointer mb-4"
              onClick={handleProgressClick}
            >
              <div
                className="h-full bg-white rounded-full transition-all duration-100"
                style={{ 
                  width: `${localVideoState.duration > 0 ? (localVideoState.currentTime / localVideoState.duration) * 100 : 0}%` 
                }}
              />
            </div>

            {/* Control bar */}
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-4">
                {/* Play/Pause */}
                <button
                  onClick={handlePlayPause}
                  className="hover:text-gray-300 transition-colors"
                  disabled={!isHost}
                >
                  {localVideoState.isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6" />
                  )}
                </button>

                {/* Time display */}
                <span className="text-sm font-mono">
                  {formatTime(localVideoState.currentTime)} / {formatTime(localVideoState.duration)}
                </span>
              </div>

              <div className="flex items-center gap-4">
                {/* Volume */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVolumeChange(localVideoState.isMuted ? 1 : 0)}
                    className="hover:text-gray-300 transition-colors"
                    disabled={!isHost}
                  >
                    {localVideoState.isMuted || localVideoState.volume === 0 ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                  
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={localVideoState.isMuted ? 0 : localVideoState.volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-20 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                    disabled={!isHost}
                  />
                </div>

                {/* Playback speed */}
                <select
                  value={localVideoState.playbackRate}
                  onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                  className="bg-black/50 text-white text-sm rounded px-2 py-1"
                  disabled={!isHost}
                >
                  <option value={0.5}>0.5x</option>
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Host indicator */}
      {!isHost && (
        <div className="absolute top-4 left-4 bg-amber-100 text-amber-800 px-3 py-1 rounded-lg text-sm font-medium border border-amber-200">
          Viewing Mode
        </div>
      )}

      {/* Debug panel */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 right-4 bg-black/75 text-white p-2 rounded text-xs font-mono max-w-xs">
          <div>State: {localVideoState.isPlaying ? 'Playing' : 'Paused'}</div>
          <div>Time: {localVideoState.currentTime.toFixed(2)}s</div>
          <div>Duration: {localVideoState.duration.toFixed(2)}s</div>
          <div>Volume: {(localVideoState.volume * 100).toFixed(0)}%</div>
          <div>Speed: {localVideoState.playbackRate}x</div>
          <div>Host: {isHost ? 'Yes' : 'No'}</div>
          <div>Room: {currentRoom || 'None'}</div>
          <div>Socket: {socketManager.isConnected ? 'Connected' : 'Disconnected'}</div>
        </div>
      )}
    </div>
  );
};