'use client';

import { useEffect, useCallback } from 'react';
import { socketManager } from '@/lib/socket';
import { useAppStore } from '@/store/useAppStore';
import { VideoEvent, ChatMessage, User } from '@/types';
import toast from 'react-hot-toast';

export const useSocket = () => {
  const {
    setConnectionState,
    setCurrentRoom,
    setCurrentUser,
    setRoomUsers,
    setIsHost,
    addUser,
    removeUser,
    updateHost,
    addChatMessage,
    updateVideoPlayerState,
    currentUser,
  } = useAppStore();

  const handleConnection = useCallback((connected: boolean) => {
    setConnectionState(connected, false);
    if (connected) {
      toast.success('Connected to server');
    } else {
      toast.error('Disconnected from server');
    }
  }, [setConnectionState]);

  const handleConnectionError = useCallback((error: any) => {
    console.error('Socket connection error:', error);
    setConnectionState(false, false, error.message || 'Connection failed');
    toast.error('Connection error: ' + (error.message || 'Unknown error'));
  }, [setConnectionState]);

  const handleRoomJoined = useCallback((data: {
    roomId: string;
    userId: string;
    isHost: boolean;
    users: User[];
  }) => {
    setCurrentRoom(data.roomId);
    setCurrentUser({
      id: data.userId,
      name: currentUser?.name || 'Unknown',
      isHost: data.isHost,
      joinedAt: new Date(),
    });
    setRoomUsers(data.users);
    setIsHost(data.isHost);
    
    toast.success(`Joined room ${data.roomId} successfully!`);
  }, [setCurrentRoom, setCurrentUser, setRoomUsers, setIsHost, currentUser]);

  const handleUserJoined = useCallback((data: { user: User }) => {
    addUser(data.user);
    toast.success(`${data.user.name} joined the room`);
  }, [addUser]);

  const handleUserLeft = useCallback((data: { userId: string; userName: string }) => {
    removeUser(data.userId);
    toast(`${data.userName} left the room`);
  }, [removeUser]);

  const handleHostChanged = useCallback((data: { newHostId: string; newHostName: string }) => {
    updateHost(data.newHostId);
    toast(`${data.newHostName} is now the host`);
  }, [updateHost]);

  const handleVideoEvent = useCallback((data: VideoEvent) => {
    // Only process video events from other users
    if (data.userId === currentUser?.id) return;

    console.log('Received video event:', data);

    switch (data.type) {
      case 'play':
        updateVideoPlayerState({
          isPlaying: true,
          currentTime: data.time || 0,
        });
        break;
      case 'pause':
        updateVideoPlayerState({
          isPlaying: false,
          currentTime: data.time || 0,
        });
        break;
      case 'seek':
        if (data.time !== undefined) {
          updateVideoPlayerState({ currentTime: data.time });
        }
        break;
      case 'volume':
        if (data.volume !== undefined) {
          updateVideoPlayerState({
            volume: data.volume,
            isMuted: data.volume === 0,
          });
        }
        break;
      case 'speed':
        if (data.speed !== undefined) {
          updateVideoPlayerState({ playbackRate: data.speed });
        }
        break;
    }
  }, [currentUser, updateVideoPlayerState]);

  const handleChatMessage = useCallback((data: ChatMessage) => {
    addChatMessage(data);
  }, [addChatMessage]);

  const handleError = useCallback((data: { message: string }) => {
    console.error('Socket error:', data.message);
    toast.error(data.message);
  }, []);

  // Set up socket event listeners
  useEffect(() => {
    // Connection events
    socketManager.onAny('connect', () => handleConnection(true));
    socketManager.onAny('disconnect', () => handleConnection(false));
    socketManager.onAny('connect_error', handleConnectionError);

    // Room events
    socketManager.on('room-joined', handleRoomJoined);
    socketManager.on('user-joined', handleUserJoined);
    socketManager.on('user-left', handleUserLeft);
    socketManager.on('host-changed', handleHostChanged);

    // Video events
    socketManager.on('video-event-received', handleVideoEvent);

    // Chat events
    socketManager.on('chat-message-received', handleChatMessage);

    // Error events
    socketManager.on('error', handleError);

    // Cleanup
    return () => {
      socketManager.offAny('connect', () => handleConnection(true));
      socketManager.offAny('disconnect', () => handleConnection(false));
      socketManager.offAny('connect_error', handleConnectionError);
      socketManager.off('room-joined', handleRoomJoined);
      socketManager.off('user-joined', handleUserJoined);
      socketManager.off('user-left', handleUserLeft);
      socketManager.off('host-changed', handleHostChanged);
      socketManager.off('video-event-received', handleVideoEvent);
      socketManager.off('chat-message-received', handleChatMessage);
      socketManager.off('error', handleError);
    };
  }, [
    handleConnection,
    handleConnectionError,
    handleRoomJoined,
    handleUserJoined,
    handleUserLeft,
    handleHostChanged,
    handleVideoEvent,
    handleChatMessage,
    handleError,
  ]);

  return {
    isConnected: socketManager.isConnected,
    socketId: socketManager.socketId,
  };
};
