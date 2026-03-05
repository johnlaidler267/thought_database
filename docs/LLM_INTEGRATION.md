# LLM Integration Guide

This document describes the modular LLM service architecture that has been integrated into the application.

## Overview

The application now uses real LLM APIs for:
1. **Transcription**: Whisper Large v3 via Groq (fastest, free tier)
2. **Text Cleaning**: Gemini 2.0 Flash via Google AI Studio (free tier)
3. **Tagging**: Llama 3.3 70B Versatile via Groq (blazing fast, free tier)

## Architecture

The system is designed to be **modular and easily swappable**:

- **Base Provider Class**: Common interface for all LLM providers
- **Provider Classes**: Implementations for specific APIs (Groq, Google AI)
- **Service Classes**: High-level services for each task (Transcription, Cleaning, Tagging)
- **Route Handlers**: Use services, not providers directly

This makes it easy to:
- Switch between models
- Change providers
- Add new LLM services
- Test with mocks

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

The `form-data` package has been added for Node.js FormData support.

### 2. Get API Keys

#### Groq API Key (for Transcription & Tagging)
1. Sign up at [console.groq.com](https://console.groq.com)
2. Create an API key
3. Free tier: 2,000 requests/day for Whisper, ~1,000 requests/day for Llama

#### Google AI Studio API Key (for Text Cleaning)
1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Click "Get API Key"
3. Create a new API key
4. Free tier: Up to 1,000 requests/day

### 3. Configure Environment Variables

Add to `backend/.env`:

```env
# Groq API (for transcription and tagging)
GROQ_API_KEY=your_groq_api_key_here

# Google AI Studio (for text cleaning)
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
```

## Current Models

### Transcription
- **Provider**: Groq
- **Model**: `whisper-large-v3`
- **Speed**: Fastest available
- **Free Tier**: 2,000 requests/day

### Text Cleaning
- **Provider**: Google AI Studio
- **Model**: `gemini-2.0-flash` (free tier model)
- **Context Window**: Up to 1,048,576 tokens (huge for long sessions)
- **Free Tier**: 1,000 requests/day

### Tagging
- **Provider**: Groq
- **Model**: `llama-3.3-70b-versatile` (update to `llama-4-scout` when available)
- **Speed**: Milliseconds
- **Free Tier**: ~1,000 requests/day

## Switching Models

To switch to a different model, edit the service file:

**Example: Change transcription model**

Edit `backend/services/llm/services/TranscriptionService.js`:

```javascript
this.model = config.model || 'whisper-large-v3' // Change here
```

**Example: Change provider**

Edit the service constructor:

```javascript
// Instead of GroqProvider
import { OpenAIProvider } from '../providers/OpenAIProvider.js'

this.provider = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY,
})
```

## Graceful Degradation

All services implement graceful degradation:

- **Transcription**: Returns 503 error if not configured (user sees error)
- **Cleaning**: Returns original transcript if service fails (user doesn't lose data)
- **Tagging**: Returns empty array if service fails (user doesn't lose data)

This ensures users never lose their thoughts even if LLM services are unavailable.

## Error Handling

- **Timeouts**: All services have configurable timeouts
- **API Errors**: Logged and handled gracefully
- **Missing Keys**: Services check configuration before attempting API calls

## Troubleshooting: "LLM calls do not appear to be going through"

If reflection questions, thought starters, distill, or tag suggestions never complete or show no result:

1. **Check the toast message**  
   The app now surfaces API errors in a toast. Look for messages like "Reflect service not configured", "Invalid or expired token", or "Failed to connect to server".

2. **Backend environment (including Render)**  
   Ensure the backend has:
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — without these, all protected routes return **503** ("Authentication not configured").
   - `GROQ_API_KEY` — required for reflect, thought-starters, tags, and transcription. Missing → **503** ("… service not configured").
   - `GOOGLE_AI_API_KEY` — required for transcript cleaning. Missing → clean route may return 503 or fail.

3. **Frontend API URL**  
   In `frontend/.env`, `VITE_API_URL` must point at your backend (e.g. `https://your-backend.onrender.com` with no trailing slash). Wrong or missing URL → requests fail or hit the wrong server.

4. **Auth**  
   Protected routes require a valid Supabase JWT in the `Authorization: Bearer …` header. If the user is logged out or the session expired, the backend returns **401** ("Invalid or expired token"). Log in again and retry.

5. **Rate limiting**  
   Default limit is 100 requests per 15 minutes per IP. **429** ("Too many requests") means you hit the limit; wait or set `RATE_LIMIT_MAX` on the backend.

6. **CORS**  
   In production, set `FRONTEND_URL` (or `CORS_ORIGIN`) on the backend to your frontend origin so the browser allows the requests.

## Testing

You can test without API keys:
- Transcription will return 503 (service not configured)
- Cleaning will return original transcript
- Tagging will return empty array

This allows development without requiring all API keys.

## File Structure

```
backend/
├── services/
│   └── llm/
│       ├── base/
│       │   └── BaseProvider.js
│       ├── providers/
│       │   ├── GroqProvider.js
│       │   └── GoogleAIProvider.js
│       ├── services/
│       │   ├── TranscriptionService.js
│       │   ├── CleaningService.js
│       │   └── TaggingService.js
│       ├── index.js
│       └── README.md
└── routes/
    ├── transcribe.js (uses TranscriptionService)
    ├── clean.js (uses CleaningService)
    └── tags.js (uses TaggingService)
```

## Next Steps

1. **Get API Keys**: Sign up for Groq and Google AI Studio
2. **Add to .env**: Add the API keys to your environment file
3. **Test**: Try recording a thought and see it transcribed, cleaned, and tagged
4. **Update Models**: When new models are available (Gemini 2.5 Flash-Lite, Llama 4 Scout), update the model names in the service files

## Notes

- The old local Whisper implementation has been replaced with Groq's API
- All audio processing (ffmpeg conversion) is no longer needed - Groq accepts audio directly
- The system is backward compatible - if API keys aren't set, services degrade gracefully
