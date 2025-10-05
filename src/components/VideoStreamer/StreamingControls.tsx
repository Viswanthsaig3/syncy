import React from 'react';
import { Play, Pause, Square, Upload, Download, Wifi, WifiOff, Settings } from 'lucide-react';
import { useP2PStreaming } from '@/hooks/useP2PStreaming';

interface StreamingControlsProps {
  isHost: boolean;
  hostStreamingReady?: boolean;
  isJoiningStream?: boolean;
  onStartStreaming?: (videoFile: File) => void;
  onStopStreaming?: () => void;
  onJoinStream?: () => void;
  className?: string;
}

export const StreamingControls: React.FC<StreamingControlsProps> = ({
  isHost,
  hostStreamingReady = false,
  isJoiningStream = false,
  onStartStreaming,
  onStopStreaming,
  onJoinStream,
  className = ''
}) => {
  const {
    isStreaming,
    isLoading,
    error,
    progress,
    connectionQuality,
    bandwidthStats,
    currentQuality,
    updateQuality,
    stopStreaming,
    clearError
  } = useP2PStreaming();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onStartStreaming) {
      onStartStreaming(file);
    }
  };

  const handleQualityChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    updateQuality(event.target.value);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getConnectionQualityColor = (quality: string): string => {
    switch (quality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className={`bg-white border border-slate-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">
          {isHost ? 'Streaming Controls' : 'Stream Status'}
        </h3>
        
        {isStreaming && (
          <button
            onClick={stopStreaming}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
          >
            <Square className="w-4 h-4" />
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
              onChange={handleFileSelect}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Stream Quality
            </label>
            <select
              value={currentQuality}
              onChange={handleQualityChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="low">Low Quality (Fast)</option>
              <option value="medium">Medium Quality (Balanced)</option>
              <option value="high">High Quality (Best)</option>
            </select>
          </div>

          <div className="text-center">
            <p className="text-sm text-slate-600 mb-2">
              After selecting a video file, participants can join your stream
            </p>
          </div>
        </div>
      )}

      {/* Participant Controls */}
      {!isHost && !isStreaming && (
        <div className="text-center">
          {hostStreamingReady ? (
            <div className="space-y-3">
              <p className="text-sm text-green-600 font-medium">
                ✅ Host is ready to stream!
              </p>
              <button
                onClick={onJoinStream}
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
                    <Download className="w-4 h-4" />
                    Join Stream
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                ⏳ Waiting for host to start streaming...
              </p>
              <button
                onClick={onJoinStream}
                disabled
                className="flex items-center gap-2 px-4 py-2 bg-slate-300 text-slate-500 rounded-md cursor-not-allowed mx-auto"
              >
                <Download className="w-4 h-4" />
                Join Stream
              </button>
            </div>
          )}
        </div>
      )}

      {/* Streaming Status */}
      {isStreaming && (
        <div className="space-y-4">
          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between text-sm text-slate-600 mb-1">
              <span>Stream Progress</span>
              <span>{progress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Connection Quality */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-600">Connection:</span>
              <span className={`text-sm font-medium ${getConnectionQualityColor(connectionQuality)}`}>
                {connectionQuality.charAt(0).toUpperCase() + connectionQuality.slice(1)}
              </span>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-slate-500">
              {isHost && (
                <div className="flex items-center gap-1">
                  <Upload className="w-3 h-3" />
                  <span>{formatBytes(bandwidthStats.uploadSpeed)}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Download className="w-3 h-3" />
                <span>{formatBytes(bandwidthStats.downloadSpeed)}</span>
              </div>
            </div>
          </div>

          {/* Bandwidth Stats */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50 p-2 rounded">
              <div className="text-slate-600">Latency</div>
              <div className="font-medium">{bandwidthStats.latency.toFixed(0)}ms</div>
            </div>
            <div className="bg-slate-50 p-2 rounded">
              <div className="text-slate-600">Packet Loss</div>
              <div className="font-medium">{bandwidthStats.packetLoss.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
