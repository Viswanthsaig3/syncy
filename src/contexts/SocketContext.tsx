'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { socketManager } from '@/lib/socket';
import { useAppStore } from '@/store/useAppStore';
import toast from 'react-hot-toast';

interface SocketContextType {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  reconnect: () => Promise<void>;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const useSocketContext = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

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

  const connect = async () => {
    try {
      setIsConnecting(true);
      setConnectionError(null);
      
      // Only connect if not already connected
      if (!socketManager.isConnected) {
        await socketManager.connect();
      }
      
      // Set up socket event listeners
      const handleConnection = (connected: boolean) => {
        setIsConnected(connected);
        setConnectionState(connected, false);
        if (connected) {
          toast.success('Connected to server');
          
          // Rejoin room if we were in one
          const currentRoom = useAppStore.getState().currentRoom;
          const currentUser = useAppStore.getState().currentUser;
          if (currentRoom && currentUser) {
            console.log('Rejoining room after reconnection:', currentRoom);
            socketManager.joinRoom(currentRoom, currentUser.name);
          }
        } else {
          toast.error('Disconnected from server');
        }
      };

      const handleConnectionError = (error: any) => {
        console.error('Socket connection error:', error);
        setConnectionError(error.message || 'Connection failed');
        setConnectionState(false, false, error.message || 'Connection failed');
        toast.error('Connection error: ' + (error.message || 'Unknown error'));
      };

      const handleRoomJoined = (data: any) => {
        setCurrentRoom(data.roomId);
        
        // Get the current user's name from the store or use a default
        const currentUserName = useAppStore.getState().currentUser?.name || 'User';
        
        setCurrentUser({
          id: data.userId,
          name: currentUserName,
          isHost: data.isHost,
          joinedAt: new Date(),
        });
        setRoomUsers(data.users);
        setIsHost(data.isHost);
        
        toast.success(`Joined room ${data.roomId} successfully!`);
      };

      const handleUserJoined = (data: any) => {
        addUser(data.user);
        toast.success(`${data.user.name} joined the room`);
      };

      const handleUserReconnected = (data: any) => {
        addUser(data.user);
        toast(`${data.user.name} reconnected`);
      };

      const handleUserLeft = (data: any) => {
        removeUser(data.userId);
        toast(`${data.userName} left the room`);
      };

      const handleHostChanged = (data: any) => {
        updateHost(data.newHostId);
        toast(`${data.newHostName} is now the host`);
      };

      const handleVideoEvent = (data: any) => {
        // Only process video events from other users
        if (data.userId === currentUser?.id) {
          console.log('Ignoring video event from self:', data);
          return;
        }

        console.log('Received video event from another user:', data);

        switch (data.type) {
          case 'play':
            console.log('Processing play event:', data);
            updateVideoPlayerState({
              isPlaying: true,
              // Only update currentTime if it's provided and valid
              ...(data.time !== undefined && data.time >= 0 && { currentTime: data.time }),
            });
            break;
          case 'pause':
            console.log('Processing pause event:', data);
            updateVideoPlayerState({
              isPlaying: false,
              // Only update currentTime if it's provided and valid
              ...(data.time !== undefined && data.time >= 0 && { currentTime: data.time }),
            });
            break;
          case 'seek':
            console.log('Processing seek event:', data);
            if (data.time !== undefined && data.time >= 0) {
              updateVideoPlayerState({ currentTime: data.time });
            }
            break;
          case 'volume':
            console.log('Processing volume event:', data);
            if (data.volume !== undefined) {
              updateVideoPlayerState({
                volume: data.volume,
                isMuted: data.volume === 0,
              });
            }
            break;
          case 'speed':
            console.log('Processing speed event:', data);
            if (data.speed !== undefined) {
              updateVideoPlayerState({ playbackRate: data.speed });
            }
            break;
          default:
            console.log('Unknown video event type:', data.type);
        }
      };

      const handleChatMessage = (data: any) => {
        addChatMessage(data);
      };

      const handleError = (data: any) => {
        console.error('Socket error:', data.message);
        toast.error(data.message);
      };

      // Register event listeners
      socketManager.onAny('connect', () => handleConnection(true));
      socketManager.onAny('disconnect', () => handleConnection(false));
      socketManager.onAny('connect_error', handleConnectionError);
      socketManager.on('room-joined', handleRoomJoined);
      socketManager.on('user-joined', handleUserJoined);
      socketManager.on('user-reconnected', handleUserReconnected);
      socketManager.on('user-left', handleUserLeft);
      socketManager.on('host-changed', handleHostChanged);
      socketManager.on('video-event-received', handleVideoEvent);
      socketManager.on('chat-message-received', handleChatMessage);
      socketManager.on('error', handleError);

      setIsConnected(true);
      setConnectionState(true, false);
      
    } catch (error) {
      console.error('Failed to connect to server:', error);
      setConnectionError('Failed to connect to server');
      setConnectionState(false, false, 'Failed to connect to server');
      toast.error('Failed to connect to server');
    } finally {
      setIsConnecting(false);
    }
  };

  const reconnect = async () => {
    await connect();
  };

  useEffect(() => {
    connect();

    return () => {
      // Cleanup event listeners
      socketManager.offAny('connect', () => {});
      socketManager.offAny('disconnect', () => {});
      socketManager.offAny('connect_error', () => {});
      socketManager.off('room-joined', () => {});
      socketManager.off('user-joined', () => {});
      socketManager.off('user-reconnected', () => {});
      socketManager.off('user-left', () => {});
      socketManager.off('host-changed', () => {});
      socketManager.off('video-event-received', () => {});
      socketManager.off('chat-message-received', () => {});
      socketManager.off('error', () => {});
    };
  }, []);

  const value: SocketContextType = {
    isConnected,
    isConnecting,
    connectionError,
    reconnect,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
