import { io, Socket } from 'socket.io-client';
import { SocketEvents } from '@/types';

class SocketManager {
  private socket: Socket<SocketEvents, SocketEvents> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(serverUrl: string = process.env.NEXT_PUBLIC_WS_SERVER_URL || 'https://syncy-h7ro.onrender.com'): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Don't create a new connection if one already exists
        if (this.socket && this.socket.connected) {
          console.log('Socket already connected');
          resolve();
          return;
        }

        this.socket = io(serverUrl, {
          transports: ['websocket', 'polling'],
          timeout: 30000,
          forceNew: false,
          reconnection: true,
          reconnectionDelay: 2000,
          reconnectionDelayMax: 10000,
          reconnectionAttempts: 10,
          randomizationFactor: 0.5,
          autoConnect: true,
          upgrade: true,
          rememberUpgrade: true,
        });

        this.socket.on('connect', () => {
          console.log('Connected to server');
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('Disconnected from server:', reason);
          // Only handle reconnection for specific reasons
          if (reason === 'io server disconnect' || reason === 'transport close') {
            console.log('Server disconnected, will attempt reconnection...');
          }
        });

        (this.socket as any).on('reconnect', (attemptNumber: number) => {
          console.log('Reconnected after', attemptNumber, 'attempts');
          this.reconnectAttempts = 0;
        });

        (this.socket as any).on('reconnect_error', (error: any) => {
          console.error('Reconnection error:', error);
          this.handleReconnect();
        });

        (this.socket as any).on('reconnect_failed', () => {
          console.error('Failed to reconnect after maximum attempts');
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 10000);
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        if (this.socket && !this.socket.connected) {
          this.socket.connect();
        }
      }, delay);
    } else {
      console.log('Max reconnection attempts reached');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinRoom(roomId: string, userName: string) {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('join-room', { roomId, userName });
  }

  sendVideoEvent(data: {
    roomId: string;
    type: 'play' | 'pause' | 'seek' | 'volume' | 'speed';
    time?: number;
    volume?: number;
    speed?: number;
  }) {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('video-event', data);
  }

  sendChatMessage(roomId: string, message: string) {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('chat-message', { roomId, message });
  }

  on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]) {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    this.socket.on(event, callback as any);
  }

  onAny(event: string, callback: (...args: any[]) => void) {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    (this.socket as any).on(event, callback);
  }

  off<K extends keyof SocketEvents>(event: K, callback?: SocketEvents[K]) {
    if (!this.socket) {
      return;
    }
    if (callback) {
      this.socket.off(event, callback as any);
    } else {
      this.socket.off(event);
    }
  }

  offAny(event: string, callback?: (...args: any[]) => void) {
    if (!this.socket) {
      return;
    }
    if (callback) {
      (this.socket as any).off(event, callback);
    } else {
      (this.socket as any).off(event);
    }
  }

  get isConnected() {
    return this.socket?.connected || false;
  }

  get socketId() {
    return this.socket?.id || null;
  }
}

export const socketManager = new SocketManager();
