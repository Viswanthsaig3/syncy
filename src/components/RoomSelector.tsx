'use client';

import React, { useState } from 'react';
import { Users, Copy, Check, ArrowRight, Plus } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { socketManager } from '@/lib/socket';
import { generateRoomCode, copyToClipboard } from '@/lib/utils';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface RoomSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RoomSelector: React.FC<RoomSelectorProps> = ({ isOpen, onClose }) => {
  const [roomCode, setRoomCode] = useState('');
  const [userName, setUserName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [copiedRoomCode, setCopiedRoomCode] = useState<string | null>(null);

  const { setCurrentRoom, setCurrentUser, setRoomUsers, setIsHost } = useAppStore();

  const handleCreateRoom = async () => {
    if (!userName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setIsCreating(true);
    try {
      const newRoomCode = generateRoomCode();
      setRoomCode(newRoomCode);
      
      // Connect to socket and join room
      await socketManager.connect();
      socketManager.joinRoom(newRoomCode, userName.trim());
      
      // Set up socket event listeners
      socketManager.on('room-joined', (data) => {
        setCurrentRoom(data.roomId);
        setCurrentUser({
          id: data.userId,
          name: userName.trim(),
          isHost: data.isHost,
          joinedAt: new Date(),
        });
        setRoomUsers(data.users);
        setIsHost(data.isHost);
        onClose();
        toast.success(`Room ${newRoomCode} created successfully!`);
      });

      socketManager.on('error', (data) => {
        toast.error(data.message);
        setIsCreating(false);
      });

    } catch (error) {
      console.error('Error creating room:', error);
      toast.error('Failed to create room');
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCode.trim() || !userName.trim()) {
      toast.error('Please enter both room code and your name');
      return;
    }

    setIsJoining(true);
    try {
      // Connect to socket and join room
      await socketManager.connect();
      socketManager.joinRoom(roomCode.trim().toUpperCase(), userName.trim());
      
      // Set up socket event listeners
      socketManager.on('room-joined', (data) => {
        setCurrentRoom(data.roomId);
        setCurrentUser({
          id: data.userId,
          name: userName.trim(),
          isHost: data.isHost,
          joinedAt: new Date(),
        });
        setRoomUsers(data.users);
        setIsHost(data.isHost);
        onClose();
        toast.success(`Joined room ${data.roomId} successfully!`);
      });

      socketManager.on('error', (data) => {
        toast.error(data.message);
        setIsJoining(false);
      });

    } catch (error) {
      console.error('Error joining room:', error);
      toast.error('Failed to join room');
      setIsJoining(false);
    }
  };

  const handleCopyRoomCode = async () => {
    if (!roomCode) return;
    
    try {
      await copyToClipboard(roomCode);
      setCopiedRoomCode(roomCode);
      toast.success('Room code copied to clipboard!');
      
      setTimeout(() => {
        setCopiedRoomCode(null);
      }, 2000);
    } catch (error) {
      toast.error('Failed to copy room code');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (roomCode) {
        handleJoinRoom();
      } else {
        handleCreateRoom();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Users className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Join a Room</h2>
            <p className="text-sm text-gray-500">Watch videos in sync with friends</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* User Name Input */}
          <div>
            <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              id="userName"
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter your name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              maxLength={20}
            />
          </div>

          {/* Room Code Input */}
          <div>
            <label htmlFor="roomCode" className="block text-sm font-medium text-gray-700 mb-2">
              Room Code
            </label>
            <div className="flex gap-2">
              <input
                id="roomCode"
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                placeholder="Enter room code"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                maxLength={6}
              />
              {roomCode && (
                <button
                  onClick={handleCopyRoomCode}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Copy room code"
                >
                  {copiedRoomCode === roomCode ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-600" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleCreateRoom}
              disabled={!userName.trim() || isCreating || isJoining}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                'bg-primary-600 text-white hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed'
              )}
            >
              <Plus className="w-4 h-4" />
              {isCreating ? 'Creating...' : 'Create Room'}
            </button>

            <button
              onClick={handleJoinRoom}
              disabled={!roomCode.trim() || !userName.trim() || isCreating || isJoining}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                'bg-gray-600 text-white hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed'
              )}
            >
              <ArrowRight className="w-4 h-4" />
              {isJoining ? 'Joining...' : 'Join Room'}
            </button>
          </div>

          {/* Info */}
          <div className="text-xs text-gray-500 text-center pt-2">
            <p>• Create a room to start watching with friends</p>
            <p>• Share the room code to invite others</p>
            <p>• Everyone needs the same video file</p>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};
