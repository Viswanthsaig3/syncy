'use client';

import React, { useEffect, useState } from 'react';
import { VideoStreamer } from '@/components/VideoStreamer/VideoStreamer';
import { RoomSelector } from '@/components/RoomSelector';
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
  LogOut,
  Copy,
  Check,
  MessageCircle,
  Plus,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function HomePage() {
  
  const {
    isConnected,
    isConnecting,
    connectionError,
  } = useSocketContext();

  const {
    currentRoom,
    currentUser,
    roomUsers,
    isHost,
    resetRoom,
    videoFile,
    videoUrl,
    resetVideoState,
    chatMessages,
    setChatMessages,
    isRoomSelectorOpen,
    setIsRoomSelectorOpen,
  } = useAppStore();

  // Create room handler
  const handleCreateRoom = () => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const userName = `Host-${Date.now().toString().slice(-4)}`;
    
    useAppStore.getState().setCurrentUser({
      id: '',
      name: userName,
      isHost: true,
      joinedAt: new Date(),
    });
    
    socketManager.joinRoom(roomId, userName);
  };

  // Join room handler
  const handleJoinRoom = () => {
    const roomId = prompt('Enter room code:')?.toUpperCase();
    const userName = `User-${Date.now().toString().slice(-4)}`;
    if (roomId) {
      useAppStore.getState().setCurrentUser({
        id: '',
        name: userName,
        isHost: false,
        joinedAt: new Date(),
      });
      
      socketManager.joinRoom(roomId, userName);
    }
  };

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
    <div className="min-h-screen bg-slate-50">
      {/* Professional Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                <Play className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">Syncy</h1>
                <p className="text-xs text-slate-500">Video Sync Platform</p>
              </div>
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-6">
              {isConnected ? (
                <div className="flex items-center gap-2 text-emerald-600">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-sm font-medium">Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-red-600">
                    {isConnecting ? 'Connecting...' : 'Disconnected'}
                  </span>
                  {!isConnecting && (
                    <button
                      onClick={reconnect}
                      className="text-xs text-slate-600 hover:text-slate-900 underline"
                    >
                      Reconnect
                    </button>
                  )}
                </div>
              )}

              {/* Room Info */}
              {currentRoom && (
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-md">
                  <span className="text-sm text-slate-600">Room:</span>
                  <span className="font-mono text-sm font-medium text-slate-900">{currentRoom}</span>
                  <button
                    onClick={handleCopyRoomCode}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
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
                    <span className="text-slate-600">Welcome,</span>
                    <span className="font-medium text-slate-900 ml-1">{currentUser.name}</span>
                    {isHost && (
                      <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
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
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
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
          /* Professional Welcome Screen */
          <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
            <div className="max-w-4xl mx-auto text-center">
              {/* Hero Section */}
              <div className="mb-16">
                <div className="w-16 h-16 bg-slate-900 rounded-xl flex items-center justify-center mx-auto mb-8">
                  <Play className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-slate-900 mb-4">
                  Peer-to-Peer Video Streaming
                </h1>
                <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
                  Stream video files directly from host to participants using WebRTC technology. No uploads, no database - just pure P2P streaming.
                </p>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
                {/* Create Room */}
                <div className="group">
                  <button
                    onClick={handleCreateRoom}
                    className="w-full p-8 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors border border-slate-200"
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-4">
                        <Plus className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Start Streaming</h3>
                      <p className="text-slate-300">Host a P2P video stream</p>
                    </div>
                  </button>
                </div>

                {/* Join Room */}
                <div className="group">
                  <button
                    onClick={handleJoinRoom}
                    className="w-full p-8 bg-white text-slate-900 rounded-xl hover:bg-slate-50 transition-colors border border-slate-200"
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
                        <Users className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Join Stream</h3>
                      <p className="text-slate-600">Enter a room code to receive stream</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Features */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">P2P Streaming</h4>
                    <p className="text-slate-600">Direct host-to-participant streaming via WebRTC</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ArrowRight className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">No Database</h4>
                    <p className="text-slate-600">Stream directly without server storage</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">Collaboration</h4>
                    <p className="text-slate-600">Integrated chat and user management</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-100 border border-slate-200 rounded-lg p-6 text-left mt-12">
                <h3 className="font-semibold text-slate-900 mb-3">P2P Streaming Protocol:</h3>
                <ol className="text-sm text-slate-700 space-y-2">
                  <li>1. Host selects a video file and starts streaming</li>
                  <li>2. Host creates a session and shares the room code</li>
                  <li>3. Participants join the session and receive the stream</li>
                  <li>4. Video is streamed directly from host to participants via WebRTC</li>
                </ol>
              </div>
            </div>
          </div>
        ) : (
          /* Professional Room Interface */
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Video Streamer - Main Content */}
            <div className="lg:col-span-3">
              <VideoStreamer className="mb-6" />
            </div>

            {/* Professional Sidebar */}
            <div className="space-y-6">
              <UserList />
              
              {/* Quick Actions */}
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">Session Controls</h3>
                <div className="space-y-3">
                  <button
                    onClick={handleCopyRoomCode}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Copy className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-slate-900">Copy Room Code</span>
                      <p className="text-xs text-slate-500">Share with participants</p>
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
      

      {/* Chat */}
      <Chat />
    </div>
  );
}