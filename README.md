# Thought Notary

A minimalist PWA Insight Engine for personal thoughts. Capture voice recordings, clean them up, and organize them in a clean, Kindle-like interface.

## Features

- **Voice Recording**: Large, prominent record button for easy capture (with optional 5-minute auto-stop)
- **AI-Powered Cleaning**: Removes filler words and stutters while preserving your voice (Gemini)
- **Smart Tagging**: Automatically extracts category tags (#Idea, #Person, #Task) via Llama
- **Categories**: Organize thoughts with custom category tabs; filter by category
- **Search**: Search by tag and thought content
- **Clean Interface**: Minimalist, high-contrast design inspired by e-readers; light/dark theme
- **PWA Support**: Installable as a native app; works offline-capable with service worker
- **Toggle Views**: Switch between cleaned and raw transcript per thought
- **Auth**: Sign in with Apple, Google, or Email (Magic Links) via Supabase
- **Settings**: Theme, translation preferences, account management, optional Stripe subscription (Upgrade / Manage)
- **Confirmation Modals**: Delete thought and delete category use in-app confirmation dialogs (no browser `confirm`)

## Tech Stack

- **Frontend**: Vite + React 19 + Tailwind CSS, React Router
- **Backend**: Node.js + Express
- **Storage**: Supabase (PostgreSQL, Auth, optional Stripe-linked profiles)
- **APIs**: Groq (Whisper transcription + Llama tagging), Google AI Studio (Gemini text cleaning). See `docs/LLM_INTEGRATION.md` for details.

## Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account
- **Groq API key** (transcription + tagging) — [console.groq.com](https://console.groq.com)
- **Google AI Studio API key** (text cleaning) — [aistudio.google.com](https://aistudio.google.com)

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in `frontend/` with:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_API_URL=http://localhost:3001/api
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```
   Frontend runs at `http://localhost:5173` by default.

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in `backend/` with:
   ```
   PORT=3001
   GROQ_API_KEY=your_groq_api_key
   GOOGLE_AI_API_KEY=your_google_ai_api_key
   ```
   For Stripe (optional): see `docs/STRIPE_INTEGRATION_GUIDE.md` for `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and Supabase service role config.

4. Start the server:
   ```bash
   npm start
   ```
   Backend runs at `http://localhost:3001` by default.

### Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com).

2. Run the SQL in your Supabase SQL editor (in order):
   - Use **`supabase/SUPABASE_COMPLETE_SETUP.sql`** for a single-file setup (recommended), **or**
   - See **`supabase/README.md`** for separate schema/migration files.

3. Configure authentication:
   - Go to **Authentication** > **Providers** and enable Apple, Google, and Email (Magic Links) as needed.
   - See `docs/SUPABASE_AUTH_SETUP.md` and `docs/GOOGLE_OAUTH_SETUP.md` for provider details.

4. Copy your project URL and anon key into `frontend/.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## Running the App (from repo root)

```bash
# Run frontend and backend together
npm run dev

# Run tests
npm test              # unit tests (frontend + backend)
npm run test:e2e      # Playwright E2E (frontend)
npm run test:all      # unit + E2E

# Environment mode (dev vs prod API URLs, etc.)
npm run mode:dev
npm run mode:prod
```

## Project Structure

```
thought_database/
├── frontend/              # React frontend (Vite)
│   ├── src/
│   │   ├── components/   # UI components (ConfirmDialog, RecordButton, ThoughtBubble, etc.)
│   │   ├── contexts/     # AuthContext, ThemeContext
│   │   ├── hooks/        # useAudioRecorder
│   │   ├── pages/        # HomePage, SettingsPage
│   │   ├── services/     # API client, Supabase, translation
│   │   ├── main.jsx      # Entry point, routes, PWA registration
│   │   └── index.css
│   ├── public/           # Static assets, manifest.json, service-worker.js
│   └── tests/e2e/       # Playwright E2E specs
├── backend/              # Express API
│   ├── routes/          # transcribe, clean, tags, stripe
│   ├── services/llm/     # Transcription, Cleaning, Tagging (Groq + Google AI)
│   └── server.js
├── docs/                # Setup and integration guides
│   ├── QUICK_START.md
│   ├── LLM_INTEGRATION.md
│   ├── SUPABASE_AUTH_SETUP.md
│   ├── STRIPE_INTEGRATION_GUIDE.md
│   ├── TESTING.md
│   └── ...
├── supabase/            # Database schema and migrations
│   ├── SUPABASE_COMPLETE_SETUP.sql   # Single-file setup (use this for new installs)
│   ├── README.md
│   ├── migrations/      # Optional incremental migrations
│   └── archive/        # Legacy schema files (reference only)
```

## Usage

1. Start both frontend and backend (e.g. `npm run dev` from root).
2. Open the app (e.g. `http://localhost:5173`).
3. Sign in via **Welcome** (Apple, Google, or Magic Link).
4. On the home page: use **Record** to capture a thought, then **Stop** to transcribe, clean, and tag.
5. Edit the draft if needed, then save; the thought appears in your list with tags and optional category.
6. Use category tabs and search to filter; use the menu on a thought to copy, view raw, translate, or delete (with confirmation).
7. **Settings**: theme, translation, account, and (if configured) Stripe subscription.

## Design Philosophy

- **Minimalist**: Clean, uncluttered interface
- **High Contrast**: Easy to read in any lighting; theme support
- **Non-Addictive**: No notifications, no social features
- **Functional**: Focus on capturing and organizing thoughts

## More documentation

| Topic | File |
|-------|------|
| Short setup steps | [`docs/QUICK_START.md`](docs/QUICK_START.md) |
| LLM providers (Groq, Google AI), keys, models | [`docs/LLM_INTEGRATION.md`](docs/LLM_INTEGRATION.md) |
| Supabase auth (Apple, Google, Email) | [`docs/SUPABASE_AUTH_SETUP.md`](docs/SUPABASE_AUTH_SETUP.md), [`docs/GOOGLE_OAUTH_SETUP.md`](docs/GOOGLE_OAUTH_SETUP.md) |
| Stripe subscription setup | [`docs/STRIPE_INTEGRATION_GUIDE.md`](docs/STRIPE_INTEGRATION_GUIDE.md) |
| Unit & E2E testing | [`docs/TESTING.md`](docs/TESTING.md), [`docs/TESTING_QUICK_START.md`](docs/TESTING_QUICK_START.md) |
| Mobile issues (HTTPS, mic, service worker) | [`docs/MOBILE_TROUBLESHOOTING.md`](docs/MOBILE_TROUBLESHOOTING.md) |
| PWA icons | [`docs/ICON_GENERATION.md`](docs/ICON_GENERATION.md) |
| Database schema and migrations | [`supabase/README.md`](supabase/README.md) |

## License

ISC
