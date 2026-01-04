# Thought Notary

A minimalist PWA Insight Engine for personal thoughts. Capture voice recordings, clean them up, and organize them in a clean, Kindle-like interface.

## Features

- **Voice Recording**: Large, prominent record button for easy capture
- **AI-Powered Cleaning**: Removes filler words and stutters while preserving your voice
- **Smart Tagging**: Automatically extracts category tags (#Idea, #Person, #Task)
- **Clean Interface**: Minimalist, high-contrast design inspired by e-readers
- **PWA Support**: Installable as a native app
- **Toggle Views**: Switch between cleaned and raw transcript versions

## Tech Stack

- **Frontend**: Vite + React + Tailwind CSS
- **Backend**: Node.js + Express
- **Storage**: Supabase
- **APIs**: OpenAI Whisper (transcription), Anthropic Claude (cleaning & tagging)

## Setup

### Prerequisites

- Node.js (v18 or higher) - Required for File API support in backend
- npm or yarn
- Supabase account
- OpenAI API key (for Whisper transcription)
- Anthropic API key (for Claude cleaning and tagging)

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file:
   ```bash
   cp .env.example .env
   ```

4. Fill in your environment variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_API_URL=http://localhost:3001/api
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file:
   ```bash
   cp .env.example .env
   ```

4. Fill in your environment variables:
   ```
   PORT=3001
   OPENAI_API_KEY=your_openai_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

5. Start the server:
   ```bash
   npm start
   ```

### Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. Run the SQL schemas in your Supabase SQL editor:
   - First run `SUPABASE_SCHEMA.sql` (for thoughts table)
   - Then run `SUPABASE_PROFILES_SCHEMA.sql` (for profiles table and auth setup)

3. Configure authentication providers:
   - Go to **Authentication** > **Providers** in Supabase dashboard
   - Enable Apple, Google, and Email (Magic Links)
   - See `SUPABASE_AUTH_SETUP.md` for detailed configuration

4. Copy your project URL and anon key to the frontend `.env` file

## Project Structure

```
thought_database/
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API and Supabase clients
│   │   └── App.jsx        # Main app component
│   └── public/            # Static assets and PWA files
├── backend/           # Express API server
│   ├── routes/           # API route handlers
│   └── server.js         # Express server setup
└── README.md
```

## Usage

1. Start both the frontend and backend servers
2. Open the app in your browser
3. Click the "Record" button at the bottom to start recording
4. Speak your thought
5. Click "Stop" to process the recording
6. Your thought will be transcribed, cleaned, tagged, and saved

## Design Philosophy

- **Minimalist**: Clean, uncluttered interface
- **High Contrast**: Easy to read in any lighting
- **Non-Addictive**: No notifications, no social features
- **Functional**: Focus on the core task of capturing and organizing thoughts

## License

ISC

