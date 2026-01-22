# LLM Integration Guide

This document describes the modular LLM service architecture that has been integrated into the application.

## Overview

The application now uses real LLM APIs for:
1. **Transcription**: Whisper Large v3 via Groq (fastest, free tier)
2. **Text Cleaning**: Gemini 2.0 Flash Exp via Google AI Studio (large context, free tier)
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
- **Model**: `gemini-2.0-flash-exp` (update to `gemini-2.5-flash-lite` when available)
- **Context Window**: 1M tokens (huge for long sessions)
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
