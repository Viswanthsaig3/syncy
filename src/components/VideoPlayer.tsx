'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Settings, Maximize } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { socketManager } from '@/lib/socket';
import { formatTime, debounce, throttle } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  className?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ className }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showControls, setShowControls] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  
  const {
    currentRoom,
    videoUrl,
    videoPlayerState,
    updateVideoPlayerState,
    isHost,
  } = useAppStore();

  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    playbackRate,
    isMuted,
    isLoading,
    hasError,
  } = videoPlayerState;

  // Sync video state with store
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    console.log('Syncing video state:', { currentTime, volume, playbackRate, isMuted, isPlaying });
    
    // Only update currentTime if it's significantly different to avoid conflicts
    if (Math.abs(video.currentTime - currentTime) > 0.1) {
      console.log('Updating video currentTime from', video.currentTime, 'to', currentTime);
      video.currentTime = currentTime;
    }
    
    video.volume = isMuted ? 0 : volume;
    video.playbackRate = playbackRate;
    
    // Control play/pause based on state
    if (isPlaying && video.paused) {
      console.log('Starting video playback');
      video.play().catch(error => {
        console.error('Failed to play video:', error);
        updateVideoPlayerState({ isPlaying: false, hasError: true });
      });
    } else if (!isPlaying && !video.paused) {
      console.log('Pausing video');
      video.pause();
    }
  }, [currentTime, volume, playbackRate, isMuted, isPlaying, updateVideoPlayerState]);

  // Handle video events
  const handlePlay = useCallback(() => {
    if (!isHost || !currentRoom) {
      console.log('Not host or no room:', { isHost, currentRoom });
      return;
    }
    
    const video = videoRef.current;
    if (!video) {
      console.log('No video element');
      return;
    }

    if (!socketManager.isConnected) {
      console.error('Socket not connected');
      return;
    }

    updateVideoPlayerState({ isPlaying: true });
    try {
      socketManager.sendVideoEvent({
        roomId: currentRoom,
        type: 'play',
        time: video.currentTime,
      });
      console.log('Sent play event:', { roomId: currentRoom, time: video.currentTime });
    } catch (error) {
      console.error('Failed to send play event:', error);
    }
  }, [isHost, currentRoom, updateVideoPlayerState]);

  const handlePause = useCallback(() => {
    if (!isHost || !currentRoom) {
      console.log('Not host or no room for pause:', { isHost, currentRoom });
      return;
    }
    
    const video = videoRef.current;
    if (!video) {
      console.log('No video element for pause');
      return;
    }

    if (!socketManager.isConnected) {
      console.error('Socket not connected for pause');
      return;
    }

    updateVideoPlayerState({ isPlaying: false });
    try {
      socketManager.sendVideoEvent({
        roomId: currentRoom,
        type: 'pause',
        time: video.currentTime,
      });
      console.log('Sent pause event:', { roomId: currentRoom, time: video.currentTime });
    } catch (error) {
      console.error('Failed to send pause event:', error);
    }
  }, [isHost, currentRoom, updateVideoPlayerState]);

  const handleSeek = useCallback(
    debounce((newTime: number) => {
      if (!isHost || !currentRoom) return;
      
      const video = videoRef.current;
      if (!video) return;

      updateVideoPlayerState({ currentTime: newTime });
      socketManager.sendVideoEvent({
        roomId: currentRoom,
        type: 'seek',
        time: newTime,
      });
    }, 100),
    [isHost, currentRoom, updateVideoPlayerState]
  );

  const handleVolumeChange = useCallback(
    throttle((newVolume: number) => {
      if (!isHost || !currentRoom) return;

      updateVideoPlayerState({ volume: newVolume, isMuted: newVolume === 0 });
      socketManager.sendVideoEvent({
        roomId: currentRoom,
        type: 'volume',
        volume: newVolume,
      });
    }, 100),
    [isHost, currentRoom, updateVideoPlayerState]
  );

  const handleSpeedChange = useCallback((newSpeed: number) => {
    if (!isHost || !currentRoom) return;

    updateVideoPlayerState({ playbackRate: newSpeed });
    socketManager.sendVideoEvent({
      roomId: currentRoom,
      type: 'speed',
      speed: newSpeed,
    });
  }, [isHost, currentRoom, updateVideoPlayerState]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      updateVideoPlayerState({
        duration: video.duration,
        isLoading: false,
        hasError: false,
      });
    };

    const handleTimeUpdate = () => {
      if (!isDragging) {
        updateVideoPlayerState({ currentTime: video.currentTime });
      }
    };

    const handlePlayEvent = () => {
      console.log('Video play event triggered');
      updateVideoPlayerState({ isPlaying: true });
    };

    const handlePauseEvent = () => {
      console.log('Video pause event triggered');
      updateVideoPlayerState({ isPlaying: false });
    };

    const handleError = () => {
      updateVideoPlayerState({ hasError: true, isLoading: false });
    };

    const handleLoadStart = () => {
      updateVideoPlayerState({ isLoading: true });
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlayEvent);
    video.addEventListener('pause', handlePauseEvent);
    video.addEventListener('error', handleError);
    video.addEventListener('loadstart', handleLoadStart);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlayEvent);
      video.removeEventListener('pause', handlePauseEvent);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadstart', handleLoadStart);
    };
  }, [updateVideoPlayerState, isDragging]);

  // Handle progress bar interaction
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isHost || !videoRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    
    handleSeek(newTime);
  };

  const handleProgressMouseDown = () => {
    setIsDragging(true);
  };

  const handleProgressMouseUp = () => {
    setIsDragging(false);
  };

  // Handle fullscreen
  const handleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen();
    }
  };

  // Auto-hide controls
  useEffect(() => {
    if (!isHovering) return;

    const timer = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isHovering, isPlaying]);

  if (!videoUrl) {
    return (
      <div className={cn(
        'flex items-center justify-center bg-gray-900 rounded-lg',
        'aspect-video w-full max-w-4xl mx-auto',
        className
      )}>
        <div className="text-center text-gray-400">
          <div className="text-6xl mb-4">🎬</div>
          <p className="text-lg">Select a video file to start watching</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative bg-black rounded-lg overflow-hidden group',
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
        onPlay={(e) => {
          console.log('Video onPlay event:', e.currentTarget.currentTime);
          handlePlay();
        }}
        onPause={(e) => {
          console.log('Video onPause event:', e.currentTarget.currentTime);
          handlePause();
        }}
        onSeeked={(e) => {
          const video = e.currentTarget;
          console.log('Video onSeeked event:', video.currentTime);
          handleSeek(video.currentTime);
        }}
        onVolumeChange={(e) => {
          const video = e.currentTarget;
          console.log('Video onVolumeChange event:', video.volume);
          handleVolumeChange(video.volume);
        }}
        onRateChange={(e) => {
          const video = e.currentTarget;
          console.log('Video onRateChange event:', video.playbackRate);
          handleSpeedChange(video.playbackRate);
        }}
        onLoadStart={() => {
          console.log('Video load start');
        }}
        onLoadedData={() => {
          console.log('Video loaded data');
        }}
        onCanPlay={() => {
          console.log('Video can play');
        }}
        onError={(e) => {
          console.error('Video error:', e);
        }}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}

      {/* Error overlay */}
      {hasError && (
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
              className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
            >
              <Maximize className="w-5 h-5" />
            </button>
          </div>

          {/* Center play/pause button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={isPlaying ? handlePause : handlePlay}
              className="p-4 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
              disabled={!isHost}
            >
              {isPlaying ? (
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
              className="w-full h-1 bg-gray-600 rounded-full cursor-pointer mb-4"
              onClick={handleProgressClick}
              onMouseDown={handleProgressMouseDown}
              onMouseUp={handleProgressMouseUp}
            >
              <div
                className="h-full bg-red-500 rounded-full transition-all duration-100"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>

            {/* Control bar */}
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-4">
                {/* Play/Pause */}
                <button
                  onClick={isPlaying ? handlePause : handlePlay}
                  className="hover:text-gray-300 transition-colors"
                  disabled={!isHost}
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6" />
                  )}
                </button>

                {/* Time display */}
                <span className="text-sm font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-4">
                {/* Volume */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const newMuted = !isMuted;
                      updateVideoPlayerState({ isMuted: newMuted });
                      if (isHost && currentRoom) {
                        socketManager.sendVideoEvent({
                          roomId: currentRoom,
                          type: 'volume',
                          volume: newMuted ? 0 : volume,
                        });
                      }
                    }}
                    className="hover:text-gray-300 transition-colors"
                    disabled={!isHost}
                  >
                    {isMuted || volume === 0 ? (
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
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    disabled={!isHost}
                  />
                </div>

                {/* Playback speed */}
                <select
                  value={playbackRate}
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
        <div className="absolute top-4 left-4 bg-yellow-500 text-black px-2 py-1 rounded text-sm font-medium">
          Viewing Mode
        </div>
      )}

      {/* Debug panel */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 right-4 bg-black/75 text-white p-2 rounded text-xs font-mono max-w-xs">
          <div>State: {isPlaying ? 'Playing' : 'Paused'}</div>
          <div>Time: {currentTime.toFixed(2)}s</div>
          <div>Duration: {duration.toFixed(2)}s</div>
          <div>Volume: {(volume * 100).toFixed(0)}%</div>
          <div>Speed: {playbackRate}x</div>
          <div>Host: {isHost ? 'Yes' : 'No'}</div>
          <div>Room: {currentRoom || 'None'}</div>
          <div>Socket: {socketManager.isConnected ? 'Connected' : 'Disconnected'}</div>
        </div>
      )}
    </div>
  );
};
