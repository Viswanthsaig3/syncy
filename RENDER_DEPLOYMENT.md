# 🚀 Render Deployment Guide for Syncy

## Prerequisites
- Render account (free at [render.com](https://render.com))
- GitHub/GitLab repository with your code

## Quick Deploy

### Option 1: Using render.yaml (Recommended)

1. **Push your code to GitHub/GitLab**
   ```bash
   git add .
   git commit -m "Add Render deployment configuration"
   git push origin main
   ```

2. **Connect to Render**
   - Go to [dashboard.render.com](https://dashboard.render.com)
   - Click "New" → "Blueprint"
   - Connect your repository
   - Render will automatically detect `render.yaml` and create both services

3. **Set Environment Variables** (if needed)
   - WebSocket server and client URLs will be automatically set
   - Add any additional environment variables in Render dashboard

### Option 2: Manual Setup

#### Step 1: Deploy WebSocket Server

1. Go to Render Dashboard
2. Click "New" → "Web Service"
3. Connect your repository
4. Configure:
   - **Name**: `syncy-server`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:server`
   - **Environment Variables**:
     - `PORT=3001`
     - `NODE_ENV=production`
     - `CLIENT_URL=https://syncy-client.onrender.com` (update after frontend deployment)

#### Step 2: Deploy Frontend

1. Click "New" → "Web Service" again
2. Connect the same repository
3. Configure:
   - **Name**: `syncy-client`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:client`
   - **Environment Variables**:
     - `NEXT_PUBLIC_WS_SERVER_URL=https://syncy-server.onrender.com`
     - `NODE_ENV=production`

#### Step 3: Update URLs

1. Copy the WebSocket server URL from Render
2. Update the frontend's `NEXT_PUBLIC_WS_SERVER_URL` environment variable
3. Copy the frontend URL and update the server's `CLIENT_URL` environment variable
4. Redeploy both services

## Important Notes

### WebSocket Configuration
- Render automatically supports WebSocket connections
- No additional configuration needed for Socket.IO
- Both `websocket` and `polling` transports will work

### Free Tier Limitations
- Free services spin down after 15 minutes of inactivity
- First request after spin-down may take 30-60 seconds
- Upgrade to paid plan for always-on services

### Production Build
Ensure your package.json has the correct build scripts:
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:client": "next dev",
    "dev:server": "nodemon server/index.ts",
    "build": "next build",
    "start": "concurrently \"npm run start:server\" \"npm run start:client\"",
    "start:client": "next start",
    "start:server": "node dist/server/index.js"
  }
}
```

## Monitoring

### Health Checks
- Server health endpoint: `https://syncy-server.onrender.com/health`
- Check connection status and room count

### Logs
- View logs in Render dashboard
- Monitor WebSocket connections
- Track errors and performance

## Troubleshooting

### WebSocket Connection Issues
1. Check environment variables are set correctly
2. Verify CORS settings in server/index.ts
3. Ensure both services are running
4. Check Render logs for errors

### Deployment Failures
1. Verify all dependencies are in package.json
2. Check build logs in Render dashboard
3. Ensure Node.js version is compatible (>=18.0.0)

### Performance Issues
1. Upgrade from free tier if experiencing lag
2. Consider using Redis for session storage
3. Monitor resource usage in Render dashboard

## Upgrade Recommendations

For production use:
- **Paid Plan**: Always-on services, no spin-down
- **Redis**: Persistent room storage
- **Database**: User management and history
- **CDN**: Static asset delivery

## Support

- Render Docs: https://render.com/docs
- Syncy Issues: https://github.com/your-repo/issues
- Socket.IO Docs: https://socket.io/docs
