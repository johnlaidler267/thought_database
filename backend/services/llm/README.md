# LLM Services Architecture

This directory contains a modular LLM service architecture that makes it easy to switch between different providers and models.

## Architecture Overview

```
services/llm/
├── base/
│   └── BaseProvider.js       # Base class for all providers
├── providers/
│   ├── GroqProvider.js       # Groq API provider (Whisper, Llama)
│   └── GoogleAIProvider.js   # Google AI Studio provider (Gemini)
├── services/
│   ├── TranscriptionService.js  # Audio transcription service
│   ├── CleaningService.js       # Text cleaning service
│   └── TaggingService.js        # Tag extraction service
└── index.js                    # Centralized exports
```

## Current Configuration

### Transcription
- **Provider**: Groq
- **Model**: Whisper Large v3
- **API Key**: `GROQ_API_KEY`
- **Free Tier**: Up to 2,000 requests/day
- **Speed**: Fastest transcription engine available

### Text Cleaning
- **Provider**: Google AI Studio
- **Model**: Gemini 2.0 Flash Exp (update to 2.5 Flash-Lite when available)
- **API Key**: `GOOGLE_AI_API_KEY`
- **Free Tier**: Generous free tier (up to 1,000 requests/day)
- **Context Window**: 1M tokens (huge context for long sessions)

### Tagging
- **Provider**: Groq
- **Model**: Llama 3.3 70B Versatile (update to Llama 4 Scout when available)
- **API Key**: `GROQ_API_KEY`
- **Free Tier**: ~1,000 requests/day
- **Speed**: Blazing fast (milliseconds)

## Environment Variables

Add these to your `.env` file:

```env
# Groq API (for transcription and tagging)
GROQ_API_KEY=your_groq_api_key_here

# Google AI Studio (for text cleaning)
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
```

## Getting API Keys

### Groq API Key
1. Sign up at [console.groq.com](https://console.groq.com)
2. Navigate to API Keys section
3. Create a new API key
4. Copy and add to `.env` as `GROQ_API_KEY`

### Google AI Studio API Key
1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Click on "Get API Key"
3. Create a new API key
4. Copy and add to `.env` as `GOOGLE_AI_API_KEY`

## Switching Models/Providers

The architecture is designed to make switching easy:

### Example: Switch Transcription Model

Edit `services/llm/services/TranscriptionService.js`:

```javascript
constructor(config = {}) {
  this.provider = new GroqProvider({
    apiKey: config.groqApiKey || process.env.GROQ_API_KEY,
    timeout: config.timeout || 300000,
  })
  this.model = config.model || 'whisper-large-v3' // Change model here
}
```

### Example: Switch to Different Provider

To switch transcription to a different provider, create a new provider class or modify the service:

```javascript
// Use a different provider
import { OpenAIProvider } from '../providers/OpenAIProvider.js'

this.provider = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY,
})
```

## Adding a New Provider

1. Create a new provider class extending `BaseProvider`:

```javascript
import { BaseProvider } from '../base/BaseProvider.js'

export class NewProvider extends BaseProvider {
  constructor(config = {}) {
    super(config)
    this.baseUrl = 'https://api.example.com'
  }

  async complete(prompt, model, options = {}) {
    this.validateApiKey()
    // Implement API call
  }
}
```

2. Update the service to use the new provider:

```javascript
import { NewProvider } from '../providers/NewProvider.js'

this.provider = new NewProvider({
  apiKey: process.env.NEW_API_KEY,
})
```

## Error Handling

All services implement graceful degradation:
- **Transcription**: Returns error if service not configured
- **Cleaning**: Returns original transcript if service fails or not configured
- **Tagging**: Returns empty array if service fails or not configured

This ensures users never lose data even if LLM services are unavailable.

## Timeouts

Default timeouts:
- **Transcription**: 5 minutes (300,000ms)
- **Cleaning**: 30 seconds (30,000ms)
- **Tagging**: 10 seconds (10,000ms)

These can be configured per service in the constructor.

## Testing

To test without API keys, services will gracefully degrade:
- Transcription: Returns 503 error
- Cleaning: Returns original transcript
- Tagging: Returns empty array

This allows development and testing without requiring API keys for all services.
