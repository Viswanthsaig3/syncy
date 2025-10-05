'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { VideoPlayer } from '@/components/VideoPlayer';
import { RoomSelector } from '@/components/RoomSelector';
import { FileSelector } from '@/components/FileSelector';
import { Chat } from '@/components/Chat';
import { UserList } from '@/components/UserList';
import { useAppStore } from '@/store/useAppStore';
import { useSocketContext } from '@/contexts/SocketContext';
import { socketManager } from '@/lib/socket';
import { 
  Play, 
  Users, 
  FileVideo, 
  Wifi, 
  WifiOff, 
  Settings,
  LogOut,
  Copy,
  Check,
  Zap,
  MessageCircle,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function HomePage() {
  const {
    // Connection state
    isConnected,
    isConnecting,
    connectionError,
  } = useSocketContext();

  const {
    // Room state
    currentRoom,
    currentUser,
    roomUsers,
    isHost,
    resetRoom,

    // Video state
    videoFile,
    videoUrl,
    resetVideoState,

    // Chat state
    chatMessages,
    setChatMessages,

    // UI state
    isFileSelectorOpen,
    isRoomSelectorOpen,
    setIsFileSelectorOpen,
    setIsRoomSelectorOpen,
  } = useAppStore();

  const handleLeaveRoom = () => {
    resetRoom();
    setChatMessages([]);
    resetVideoState();
    socketManager.disconnect();
    toast('Left the room');
  };

  const handleCopyRoomCode = async () => {
    if (!currentRoom) return;
    
    try {
      await navigator.clipboard.writeText(currentRoom);
      toast.success('Room code copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy room code');
    }
  };

  const { reconnect } = useSocketContext();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Play className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Syncy</h1>
                <p className="text-xs text-gray-500">Local Video Sync</p>
              </div>
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-4">
              {isConnected ? (
                <div className="flex items-center gap-2 text-green-600">
                  <Wifi className="w-4 h-4" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <WifiOff className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-500">
                    {isConnecting ? 'Connecting...' : 'Disconnected'}
                  </span>
                  {!isConnecting && (
                    <button
                      onClick={reconnect}
                      className="text-xs text-primary-600 hover:text-primary-700 underline"
                    >
                      Reconnect
                    </button>
                  )}
                </div>
              )}

              {/* Room Info */}
              {currentRoom && (
                <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-lg">
                  <span className="text-sm text-gray-600">Room:</span>
                  <span className="font-mono text-sm font-medium">{currentRoom}</span>
                  <button
                    onClick={handleCopyRoomCode}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Copy room code"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* User Info */}
              {currentUser && (
                <div className="flex items-center gap-2">
                  <div className="text-sm">
                    <span className="text-gray-600">Welcome,</span>
                    <span className="font-medium text-gray-900 ml-1">{currentUser.name}</span>
                    {isHost && (
                      <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                        Host
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Leave Room Button */}
              {currentRoom && (
                <button
                  onClick={handleLeaveRoom}
                  className="flex items-center gap-2 px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Leave
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!currentRoom ? (
          /* Welcome Screen */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="min-h-[calc(100vh-200px)] flex items-center justify-center"
          >
            <div className="max-w-4xl mx-auto text-center">
              {/* Hero Section */}
              <div className="mb-12">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl mb-8 shadow-xl">
                  <Play className="w-12 h-12 text-white" />
                </div>
                <h1 className="text-5xl font-bold text-gray-900 mb-6">
                  Watch Videos Together
                </h1>
                <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                  Sync your local videos with friends in real-time. No uploads, just perfect synchronization.
                </p>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                {/* Create Room */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group"
                >
                  <button
                    onClick={() => {
                      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
                      const userName = prompt('Enter your name:') || 'Anonymous';
                      if (userName) {
                        socketManager.joinRoom(roomId, userName);
                      }
                    }}
                    className="w-full p-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-3xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-xl hover:shadow-2xl"
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                        <Plus className="w-8 h-8" />
                      </div>
                      <h3 className="text-2xl font-bold mb-3">Create Room</h3>
                      <p className="text-blue-100 text-lg">Start a new session instantly</p>
                    </div>
                  </button>
                </motion.div>

                {/* Join Room */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group"
                >
                  <button
                    onClick={() => {
                      const roomId = prompt('Enter room code:')?.toUpperCase();
                      const userName = prompt('Enter your name:') || 'Anonymous';
                      if (roomId && userName) {
                        socketManager.joinRoom(roomId, userName);
                      }
                    }}
                    className="w-full p-8 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-3xl hover:from-purple-600 hover:to-purple-700 transition-all duration-300 shadow-xl hover:shadow-2xl"
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                        <Users className="w-8 h-8" />
                      </div>
                      <h3 className="text-2xl font-bold mb-3">Join Room</h3>
                      <p className="text-purple-100 text-lg">Enter a room code to join</p>
                    </div>
                  </button>
                </motion.div>
              </div>

              {/* Features */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-start gap-4"
                >
                  <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">No Uploads</h4>
                    <p className="text-gray-600">Keep your videos local, sync playback only</p>
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-start gap-4"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Zap className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Real-time Sync</h4>
                    <p className="text-gray-600">Perfect synchronization with WebSocket</p>
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-start gap-4"
                >
                  <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Live Chat</h4>
                    <p className="text-gray-600">Chat while watching together</p>
                  </div>
                </motion.div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-left">
                <h3 className="font-semibold text-yellow-800 mb-3">How it works:</h3>
                <ol className="text-sm text-yellow-700 space-y-2">
                  <li>1. Everyone downloads the same video file locally</li>
                  <li>2. One person creates a room and shares the room code</li>
                  <li>3. Everyone joins the room and selects the same video file</li>
                  <li>4. The host controls playback - everyone watches in sync!</li>
                </ol>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Room Interface */
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Video Player - Main Content */}
            <div className="lg:col-span-3">
              <VideoPlayer className="mb-6" />
              
              {/* Video Controls */}
              {!videoFile && (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-12 text-center border-2 border-dashed border-gray-300">
                  <div className="w-20 h-20 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <FileVideo className="w-10 h-10 text-primary-600" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4">No Video Selected</h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto text-lg">
                    Choose a video file to start watching together with your friends
                  </p>
                  <button
                    onClick={() => setIsFileSelectorOpen(true)}
                    className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-4 px-8 rounded-xl font-semibold hover:from-primary-700 hover:to-primary-800 transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    Select Video File
                  </button>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <UserList />
              
              {/* Quick Actions */}
              <div className="bg-white rounded-2xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
                <div className="space-y-4">
                  <button
                    onClick={() => setIsFileSelectorOpen(true)}
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-blue-50 rounded-xl transition-all duration-200 group"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                      <FileVideo className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-gray-900">Change Video</span>
                      <p className="text-xs text-gray-500">Select a different video file</p>
                    </div>
                  </button>
                  
                  <button
                    onClick={handleCopyRoomCode}
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-green-50 rounded-xl transition-all duration-200 group"
                  >
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                      <Copy className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-gray-900">Copy Room Code</span>
                      <p className="text-xs text-gray-500">Share with friends</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <RoomSelector
        isOpen={isRoomSelectorOpen}
        onClose={() => setIsRoomSelectorOpen(false)}
      />
      
      <FileSelector
        isOpen={isFileSelectorOpen}
        onClose={() => setIsFileSelectorOpen(false)}
      />

      {/* Chat */}
      <Chat />
    </div>
  );
}
