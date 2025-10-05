# 🚀 Vercel Deployment Guide

## Prerequisites
- Vercel CLI installed (`npm install -g vercel`)
- Vercel account (free at [vercel.com](https://vercel.com))

## Step 1: Link Project to Vercel

```bash
# Link your project to Vercel (creates .vercel folder)
vercel link

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? (select your account)
# - Link to existing project? N
# - Project name: syncy (or your preferred name)
# - Directory: ./
```

## Step 2: Deploy to Vercel

```bash
# Deploy to production
vercel --prod

# Or deploy to preview
vercel
```

## Step 3: Set Environment Variables

After deployment, set these environment variables in Vercel dashboard:

1. Go to your project in Vercel dashboard
2. Go to Settings → Environment Variables
3. Add these variables:

```
NEXT_PUBLIC_WS_SERVER_URL=https://your-app.vercel.app
NODE_ENV=production
```

## Step 4: Update Socket Configuration

The app will automatically use the production URL when deployed. The socket connection will work with the serverless API.

## Project Structure for Vercel

```
syncy/
├── api/
│   └── index.ts          # Serverless Socket.IO server
├── src/
│   ├── app/              # Next.js app directory
│   ├── components/       # React components
│   └── lib/              # Utilities
├── vercel.json           # Vercel configuration
└── package.json          # Dependencies
```

## How It Works

1. **Frontend**: Next.js app deployed as static site
2. **Backend**: Socket.IO server as Vercel serverless function
3. **WebSocket**: Handled by Vercel's serverless functions
4. **Real-time**: Full WebSocket support with room management

## Commands Summary

```bash
# 1. Link project
vercel link

# 2. Deploy
vercel --prod

# 3. Set environment variables in Vercel dashboard
# NEXT_PUBLIC_WS_SERVER_URL=https://your-app.vercel.app

# 4. Redeploy if needed
vercel --prod
```

## Features Supported

✅ **Real-time video sync**  
✅ **Room management**  
✅ **Chat functionality**  
✅ **User management**  
✅ **WebSocket connections**  
✅ **Auto-scaling**  

## Limitations

- **Serverless functions** have a 30-second timeout
- **In-memory storage** (rooms reset on function restart)
- **No persistent storage** (use Redis for production)

## Production Recommendations

For production use, consider:
- **Redis** for persistent room storage
- **Database** for user management
- **CDN** for static assets
- **Monitoring** with Vercel Analytics

## Troubleshooting

### Socket Connection Issues
- Check environment variables
- Verify CORS settings
- Check Vercel function logs

### Deployment Issues
- Ensure all dependencies are in package.json
- Check vercel.json configuration
- Verify API routes are correct

## Support

- Vercel Docs: https://vercel.com/docs
- Socket.IO Docs: https://socket.io/docs
- Next.js Docs: https://nextjs.org/docs
