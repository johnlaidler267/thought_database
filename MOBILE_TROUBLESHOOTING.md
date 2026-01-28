# Mobile Troubleshooting Guide

## Common Mobile Issues

### 1. App Not Loading
- **Check HTTPS**: Mobile browsers require HTTPS for audio recording (except localhost)
- **Check Service Worker**: Clear browser cache and reload
- **Check Console**: Open browser dev tools (Chrome: chrome://inspect, Safari: Settings > Advanced > Web Inspector)

### 2. Audio Recording Not Working
- **Permission Denied**: Go to browser settings and allow microphone access
- **HTTPS Required**: Ensure you're using HTTPS (not HTTP) on mobile
- **Browser Support**: Use Chrome, Safari, or Firefox (not older browsers)

### 3. API Connection Errors
- **Check VITE_API_URL**: Ensure environment variable is set in Vercel
- **CORS Issues**: Backend must allow requests from your frontend domain
- **Network**: Check mobile data/WiFi connection

### 4. Service Worker Issues
- **Clear Cache**: Settings > Clear browsing data > Cached images and files
- **Unregister**: Go to Application > Service Workers in dev tools and unregister
- **Hard Reload**: Long-press reload button > "Empty Cache and Hard Reload"

## Environment Variables for Mobile

Make sure these are set in Vercel:
- `VITE_API_URL` - Your backend API URL (e.g., `https://your-backend.onrender.com`)
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key

## Testing on Mobile

1. **Chrome DevTools**: Use remote debugging
   - Connect phone via USB
   - Enable USB debugging
   - Go to `chrome://inspect` on desktop

2. **Safari Web Inspector** (iOS):
   - Settings > Safari > Advanced > Web Inspector
   - Connect to Mac via USB
   - Safari > Develop > [Your Device] > [Your Site]

3. **Vercel Preview**: Test on actual device using Vercel preview URL
