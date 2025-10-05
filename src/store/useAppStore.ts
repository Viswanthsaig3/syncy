import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { AppState, User, VideoPlayerState, ChatMessage } from '@/types';

interface AppStore extends AppState {
  // Connection actions
  setConnectionState: (isConnected: boolean, isConnecting?: boolean, error?: string | null) => void;

  // Room actions
  setCurrentRoom: (roomId: string | null) => void;
  setCurrentUser: (user: User | null) => void;
  setRoomUsers: (users: User[]) => void;
  setIsHost: (isHost: boolean) => void;
  addUser: (user: User) => void;
  removeUser: (userId: string) => void;
  updateHost: (newHostId: string) => void;

  // Video actions
  setVideoFile: (file: File | null) => void;
  setVideoUrl: (url: string | null) => void;
  updateVideoPlayerState: (updates: Partial<VideoPlayerState>) => void;
  resetVideoState: () => void;

  // Chat actions
  addChatMessage: (message: ChatMessage) => void;
  setChatMessages: (messages: ChatMessage[]) => void;
  setIsChatOpen: (isOpen: boolean) => void;

  // UI actions
  setIsFileSelectorOpen: (isOpen: boolean) => void;
  setIsRoomSelectorOpen: (isOpen: boolean) => void;

  // Reset actions
  resetApp: () => void;
  resetRoom: () => void;
}

const initialVideoPlayerState: VideoPlayerState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  playbackRate: 1,
  isMuted: false,
  isLoading: false,
  hasError: false,
};

const initialState: AppState = {
  // Connection state
  isConnected: false,
  isConnecting: false,
  connectionError: null,

  // Room state
  currentRoom: null,
  currentUser: null,
  roomUsers: [],
  isHost: false,

  // Video state
  videoFile: null,
  videoUrl: null,
  videoPlayerState: initialVideoPlayerState,

  // Chat state
  chatMessages: [],
  isChatOpen: false,

  // UI state
  isFileSelectorOpen: false,
  isRoomSelectorOpen: false,
};

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Connection actions
        setConnectionState: (isConnected, isConnecting = false, error = null) =>
          set((state) => ({
            isConnected,
            isConnecting,
            connectionError: error,
          })),

        // Room actions
        setCurrentRoom: (roomId) =>
          set((state) => ({ currentRoom: roomId })),

        setCurrentUser: (user) =>
          set((state) => ({ currentUser: user })),

        setRoomUsers: (users) =>
          set((state) => ({ roomUsers: users })),

        setIsHost: (isHost) =>
          set((state) => ({ isHost })),

        addUser: (user) =>
          set((state) => ({
            roomUsers: [...state.roomUsers, user],
          })),

        removeUser: (userId) =>
          set((state) => ({
            roomUsers: state.roomUsers.filter((user) => user.id !== userId),
          })),

        updateHost: (newHostId) =>
          set((state) => ({
            roomUsers: state.roomUsers.map((user) => ({
              ...user,
              isHost: user.id === newHostId,
            })),
            isHost: state.currentUser?.id === newHostId,
          })),

        // Video actions
        setVideoFile: (file) =>
          set((state) => ({ videoFile: file })),

        setVideoUrl: (url) =>
          set((state) => ({ videoUrl: url })),

        updateVideoPlayerState: (updates) =>
          set((state) => {
            const newState = { ...state.videoPlayerState, ...updates };
            console.log('Video player state updated:', {
              old: state.videoPlayerState,
              updates,
              new: newState
            });
            return {
              videoPlayerState: newState,
            };
          }),

        resetVideoState: () =>
          set((state) => ({
            videoFile: null,
            videoUrl: null,
            videoPlayerState: initialVideoPlayerState,
          })),

        // Chat actions
        addChatMessage: (message) =>
          set((state) => ({
            chatMessages: [...state.chatMessages, message],
          })),

        setChatMessages: (messages) =>
          set((state) => ({ chatMessages: messages })),

        setIsChatOpen: (isOpen) =>
          set((state) => ({ isChatOpen: isOpen })),

        // UI actions
        setIsFileSelectorOpen: (isOpen) =>
          set((state) => ({ isFileSelectorOpen: isOpen })),

        setIsRoomSelectorOpen: (isOpen) =>
          set((state) => ({ isRoomSelectorOpen: isOpen })),

        // Reset actions
        resetApp: () => set(initialState),

        resetRoom: () =>
          set((state) => ({
            currentRoom: null,
            currentUser: null,
            roomUsers: [],
            isHost: false,
            chatMessages: [],
            isChatOpen: false,
          })),
      }),
      {
        name: 'syncy-app-store',
        partialize: (state) => ({
          // Only persist user preferences, not connection/room state
          isChatOpen: state.isChatOpen,
        }),
      }
    ),
    {
      name: 'syncy-app-store',
    }
  )
);
