import { SocketEvents } from '@/types';

class HttpSocketManager {
  private baseUrl: string;
  private roomId: string | null = null;
  private userId: string | null = null;
  private isConnected = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private eventListeners: Map<string, Function[]> = new Map();
  private lastVideoState: any = null;
  private lastChatMessages: any[] = [];

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_WS_SERVER_URL || 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  async connect(): Promise<void> {
    console.log('HTTP Socket Manager connecting...');
    this.isConnected = true;
    return Promise.resolve();
  }

  disconnect(): void {
    console.log('HTTP Socket Manager disconnecting...');
    this.isConnected = false;
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  async joinRoom(roomId: string, userName: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/rooms?action=join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomId, userName }),
      });

      if (!response.ok) {
        throw new Error(`Failed to join room: ${response.statusText}`);
      }

      const data = await response.json();
      this.roomId = roomId;
      this.userId = data.userId;
      this.isConnected = true;

      // Start polling for updates
      this.startPolling();

      // Emit room joined event
      this.emit('room-joined', {
        roomId: data.roomId,
        userId: data.userId,
        isHost: data.isHost,
        users: data.users,
      });

      console.log(`Joined room ${roomId} as ${userName}`);
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  }

  async leaveRoom(): Promise<void> {
    if (!this.roomId || !this.userId) return;

    try {
      await fetch(`${this.baseUrl}/api/rooms?action=leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomId: this.roomId, userId: this.userId }),
      });

      this.roomId = null;
      this.userId = null;
      this.isConnected = false;

      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }

      console.log('Left room');
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  }

  async sendVideoEvent(event: {
    type: 'play' | 'pause' | 'seek' | 'volume' | 'speed';
    time?: number;
    volume?: number;
    speed?: number;
  }): Promise<void> {
    if (!this.roomId || !this.userId) {
      console.error('Not in a room');
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/rooms?action=video-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: this.roomId,
          userId: this.userId,
          ...event,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send video event: ${response.statusText}`);
      }

      console.log('Video event sent:', event);
    } catch (error) {
      console.error('Error sending video event:', error);
    }
  }

  async sendChatMessage(message: string): Promise<void> {
    if (!this.roomId || !this.userId) {
      console.error('Not in a room');
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/rooms?action=chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: this.roomId,
          userId: this.userId,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send chat message: ${response.statusText}`);
      }

      console.log('Chat message sent:', message);
    } catch (error) {
      console.error('Error sending chat message:', error);
    }
  }

  private startPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(async () => {
      if (!this.roomId || !this.isConnected) return;

      try {
        const response = await fetch(`${this.baseUrl}/api/rooms?action=state&roomId=${this.roomId}`);
        if (!response.ok) return;

        const data = await response.json();
        if (!data.success) return;

        const room = data.room;

        // Check for video state changes
        if (this.lastVideoState) {
          const currentState = room.videoState;
          if (
            this.lastVideoState.isPlaying !== currentState.isPlaying ||
            Math.abs(this.lastVideoState.currentTime - currentState.currentTime) > 0.5 ||
            this.lastVideoState.volume !== currentState.volume ||
            this.lastVideoState.playbackRate !== currentState.playbackRate
          ) {
            this.emit('video-event-received', {
              type: currentState.isPlaying ? 'play' : 'pause',
              time: currentState.currentTime,
              volume: currentState.volume,
              speed: currentState.playbackRate,
              userId: room.host,
              timestamp: Date.now(),
            });
          }
        }
        this.lastVideoState = room.videoState;

        // Check for user changes
        const currentUsers = room.users;
        const lastUsers = this.lastUsers || [];
        
        // Check for new users
        for (const user of currentUsers) {
          if (!lastUsers.find((u: any) => u.id === user.id)) {
            this.emit('user-joined', { user });
          }
        }

        // Check for users who left
        for (const user of lastUsers) {
          if (!currentUsers.find((u: any) => u.id === user.id)) {
            this.emit('user-left', { userId: user.id, userName: user.name });
          }
        }

        this.lastUsers = currentUsers;

      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 1000); // Poll every second
  }

  private lastUsers: any[] = [];

  // Event system
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Compatibility methods
  get isConnected(): boolean {
    return this.isConnected;
  }

  // Mock methods for compatibility
  onAny(event: string, callback: Function): void {
    this.on(event, callback);
  }

  offAny(event: string, callback: Function): void {
    this.off(event, callback);
  }
}

export const httpSocketManager = new HttpSocketManager();
