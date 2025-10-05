# 🎬 Syncy - Local Video Sync

> **Watch local videos in perfect sync with friends. No uploads, no streaming - just synchronized playback.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org/)

## ✨ Features

- 🎥 **Local Video Playback** - No file uploads, videos stay on your device
- 🔄 **Real-time Synchronization** - Perfect sync across all participants
- 💬 **Live Chat** - Chat with friends while watching
- 👥 **Room Management** - Create/join rooms with simple codes
- 🎮 **Host Controls** - One person controls playback for everyone
- 📱 **Responsive Design** - Works on desktop and mobile
- ⚡ **WebSocket Technology** - Low-latency real-time communication
- 🛡️ **Error Handling** - Robust connection management and error recovery

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm 8+

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/syncy.git
   cd syncy
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   Edit `.env.local` with your configuration:
   ```env
   PORT=3001
   NEXT_PUBLIC_SERVER_URL=http://localhost:3001
   CLIENT_URL=http://localhost:3000
   ```

4. **Start the development servers**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   - Frontend: http://localhost:3000
   - WebSocket Server: http://localhost:3001

## 🎯 How It Works

### The Magic Behind Syncy

1. **Local File Selection** - Everyone selects the same video file locally
2. **Room Creation** - One person creates a room and shares the code
3. **Synchronized Playback** - Host controls are broadcast via WebSocket
4. **Real-time Sync** - All participants receive and execute the same commands

### Architecture

```
┌─────────────────┐    WebSocket    ┌─────────────────┐    WebSocket    ┌─────────────────┐
│   User A        │◄──────────────►│  Node.js Server │◄──────────────►│   User B        │
│   (Browser)     │                 │  (Socket.IO)    │                 │   (Browser)     │
│                 │                 │                 │                 │                 │
│ Local Video     │                 │ Room Management │                 │ Local Video     │
│ Playback Events │                 │ Sync Signals    │                 │ Playback Events │
└─────────────────┘                 └─────────────────┘                 └─────────────────┘
```

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Zustand** - State management
- **Socket.IO Client** - Real-time communication

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **Socket.IO** - WebSocket server
- **TypeScript** - Type-safe server code

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Concurrently** - Run multiple processes
- **Nodemon** - Development server

## 📖 Usage Guide

### For Hosts (Room Creator)

1. **Create a Room**
   - Click "Join Room" → "Create Room"
   - Enter your name
   - Share the room code with friends

2. **Select Video**
   - Click "Select Video File"
   - Choose the same video file everyone will watch
   - Ensure everyone has the exact same file

3. **Control Playback**
   - Use video controls to play, pause, seek
   - All actions are synchronized to other participants
   - Chat with friends while watching

### For Participants

1. **Join Room**
   - Get the room code from the host
   - Click "Join Room" → Enter code and your name

2. **Select Same Video**
   - Choose the exact same video file as the host
   - File must be identical (same name, size, content)

3. **Watch Together**
   - Video will sync automatically with host controls
   - Use chat to communicate
   - Enjoy synchronized viewing!

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev              # Start both client and server
npm run dev:client       # Start Next.js client only
npm run dev:server       # Start WebSocket server only

# Production
npm run build           # Build for production
npm run start           # Start production servers
npm run start:client    # Start production client
npm run start:server    # Start production server

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint errors
npm run type-check      # Run TypeScript checks
```

### Project Structure

```
syncy/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── globals.css      # Global styles
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Home page
│   ├── components/          # React components
│   │   ├── VideoPlayer.tsx  # Main video player
│   │   ├── RoomSelector.tsx # Room management
│   │   ├── FileSelector.tsx # File selection
│   │   ├── Chat.tsx         # Chat component
│   │   └── UserList.tsx     # User list
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility functions
│   ├── store/               # Zustand store
│   └── types/               # TypeScript types
├── server/                  # WebSocket server
│   └── index.ts            # Socket.IO server
├── public/                  # Static assets
└── docs/                   # Documentation
```

## 🚀 Deployment

### Docker Deployment

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **Access the application**
   - Frontend: http://localhost:3000
   - WebSocket: http://localhost:3001

### Manual Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start with PM2**
   ```bash
   npm install -g pm2
   pm2 start ecosystem.config.js
   ```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | WebSocket server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `NEXT_PUBLIC_SERVER_URL` | WebSocket server URL | `http://localhost:3001` |
| `CLIENT_URL` | Client URL for CORS | `http://localhost:3000` |

## 🔒 Security Considerations

- **CORS Protection** - Configured for specific origins
- **Input Validation** - All inputs are validated and sanitized
- **Rate Limiting** - Consider implementing for production
- **HTTPS** - Use HTTPS in production for secure WebSocket connections
- **Room Codes** - 6-character codes provide reasonable security

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Follow the existing code style

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Socket.IO** - For excellent WebSocket implementation
- **Next.js Team** - For the amazing React framework
- **Tailwind CSS** - For the utility-first CSS framework
- **Framer Motion** - For smooth animations

## 🐛 Troubleshooting

### Common Issues

**Q: Video doesn't sync properly**
A: Ensure all participants have the exact same video file (same name, size, and content).

**Q: Connection keeps dropping**
A: Check your internet connection and firewall settings. WebSocket connections require stable connectivity.

**Q: Can't join a room**
A: Verify the room code is correct and the room hasn't expired (rooms auto-cleanup after 30 minutes of inactivity).

**Q: Video won't play**
A: Check that the video format is supported (MP4, WebM, OGG, AVI, MOV, WMV, FLV, MKV).

### Getting Help

- Check the [Issues](https://github.com/your-username/syncy/issues) page
- Create a new issue with detailed information
- Join our community discussions

## 🎉 What's Next?

- [ ] **Voice Chat** - Add WebRTC voice communication
- [ ] **Screen Sharing** - Share your screen while watching
- [ ] **Playlist Support** - Queue multiple videos
- [ ] **Mobile App** - Native mobile applications
- [ ] **User Accounts** - Persistent user profiles
- [ ] **Video Bookmarks** - Save favorite moments
- [ ] **Subtitle Sync** - Synchronized subtitles
- [ ] **Room History** - Save and restore room states

---

**Made with ❤️ for movie nights and shared experiences**

*Star this repo if you find it useful!*
