# Thought Notary

A minimalist PWA Insight Engine for personal thoughts. Capture voice recordings, clean them up, and organize them in a clean, Kindle-like interface.

## Features

- **Voice Recording**: Large, prominent record button for easy capture (with optional 5-minute auto-stop)
- **AI-Powered Cleaning**: Removes filler words and stutters while preserving your voice (Gemini)
- **Smart Tagging**: Automatically extracts category tags (#Idea, #Person, #Task) via Llama
- **People & Mentions**: Tag people in thoughts; link mentions to person profiles; add clarifiers (e.g. "Sarah from work") to disambiguate; view a Person Profile panel with all thoughts mentioning someone
- **Follow-ups**: Add follow-up notes to any thought (thread-style); edit and delete follow-ups
- **AI Reflection Question**: One-click button generates a probing follow-up question from the LLM to deepen reflection
- **Distill**: AI condenses a thought into a shorter summary; undo/redo through distillation history
- **Thought Starters**: AI prompts (Sparkles popover) to spark ideas when recording or drafting
- **Categories**: Organize thoughts with custom category tabs; filter by category
- **Search**: Search by tag and thought content
- **Translation**: Translate thoughts to another language; set preferred translation language in Settings
- **Clean Interface**: Minimalist, high-contrast design inspired by e-readers; light/dark theme
- **PWA Support**: Installable as a native app; works offline-capable with service worker
- **Toggle Views**: Switch between cleaned and raw transcript per thought
- **Auth**: Sign in with Apple, Google, or Email (Magic Links) via Supabase
- **Settings**: Theme, translation preferences, account management, optional Stripe subscription (Upgrade / Manage)
- **Confirmation Modals**: Delete thought, delete follow-up, and delete category use in-app confirmation dialogs (no browser `confirm`)
- **Free Tier**: Token limits for trial/apprentice tiers; upgrade to Pro for higher limits

## Tech Stack

- **Frontend**: Vite + React 19 + Tailwind CSS, React Router
- **Backend**: Node.js + Express
- **Storage**: Supabase (PostgreSQL, Auth, people/thought_people, optional Stripe-linked profiles)
- **APIs**: Groq (Whisper transcription, Llama tagging, reflect questions, distill), Google AI Studio (Gemini text cleaning), Google Translate (optional translation). See `docs/LLM_INTEGRATION.md` for details.

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
   Frontend runs at `http://localhost:5175` by default.

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
   **Required for API auth**: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (from Supabase Dashboard → Settings → API). All LLM/API routes require a valid Supabase JWT; without these, the backend returns 503.
   For **Person Profile Blurb** (AI-generated summaries): the same keys let the backend update people records.
   For Stripe (optional): see `docs/STRIPE_INTEGRATION_GUIDE.md` for `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and Supabase service role config.
   For rate limiting: optional `RATE_LIMIT_MAX` (default 100 requests per 15 min per IP).

4. Start the server:
   ```bash
   npm start
   ```
   Backend runs at `http://localhost:3001` by default.

### Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com).

2. Run the SQL in your Supabase SQL editor **in this order**:
   - **`supabase/SUPABASE_COMPLETE_SETUP.sql`** — Base setup (thoughts, profiles, RLS, auth trigger).
   - **`supabase/migrations/SUPABASE_ADD_CATEGORY_COLUMN.sql`** — Adds `category` to thoughts.
   - **`supabase/migrations/SUPABASE_ADD_MENTIONS_COLUMN.sql`** — Adds `mentions` (person names) to thoughts.
   - **`supabase/migrations/SUPABASE_ADD_PEOPLE_AND_THOUGHT_PEOPLE.sql`** — Creates `people` and `thought_people` tables.
   - **`supabase/migrations/SUPABASE_ADD_FOLLOW_UPS_COLUMN.sql`** — Adds `follow_ups` (JSONB) to thoughts.
   - **`supabase/migrations/SUPABASE_ADD_DISTILL_COLUMNS.sql`** — Adds `distilled_text` and `distill_history` to thoughts.
   - **`supabase/migrations/SUPABASE_ADD_RESPONDING_TO_COLUMN.sql`** — Adds `responding_to` (AI prompt) to thoughts.
   - **`supabase/migrations/SUPABASE_ADD_THOUGHT_TYPE_COLUMN.sql`** — Adds `thought_type` to thoughts.
   - **`supabase/migrations/SUPABASE_ADD_TOKENS_USED_COLUMN.sql`** — Adds `tokens_used` to profiles (if not already in base setup).
   - **`supabase/migrations/SUPABASE_ADD_PEOPLE_KEY_POINTS_AND_BLURB.sql`** — Adds `key_points` and `blurb` to people (Person Profile Blurb feature).

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
│   │   ├── components/   # ThoughtCard, RecordButton, PersonProfilePanel, ClarifierPrompt,
│   │   │                 # ThoughtStartersPopover, TranscriptEditor, ConfirmDialog, etc.
│   │   ├── contexts/     # AuthContext, ThemeContext
│   │   ├── hooks/        # useAudioRecorder, useThoughts, useCategories, usePeopleLink, useDistill
│   │   ├── pages/        # HomePage, SettingsPage, TermsPage, PrivacyPage
│   │   ├── services/     # API client, Supabase, translation
│   │   ├── main.jsx      # Entry point, routes, PWA registration
│   │   └── index.css
│   ├── public/           # Static assets, manifest.json, service-worker.js
│   └── tests/e2e/       # Playwright E2E specs
├── backend/              # Express API
│   ├── routes/          # transcribe, clean, tags, reflect, distill, stripe
│   ├── services/llm/    # Transcription, Cleaning, Tagging (Groq + Google AI)
│   └── server.js
├── docs/                # Setup and integration guides
│   ├── QUICK_START.md
│   ├── LLM_INTEGRATION.md
│   ├── SUPABASE_AUTH_SETUP.md
│   ├── STRIPE_INTEGRATION_GUIDE.md
│   ├── TESTING.md
│   └── ...
├── supabase/            # Database schema and migrations
│   ├── SUPABASE_COMPLETE_SETUP.sql   # Base setup (thoughts, profiles)
│   ├── migrations/      # Add category, people, thought_people, follow_ups, distill, etc.
│   └── archive/         # Legacy schema files (reference only)
```

## Usage

1. Start both frontend and backend (e.g. `npm run dev` from root).
2. Open the app (e.g. `http://localhost:5175`).
3. Sign in via **Welcome** (Apple, Google, or Magic Link).
4. On the home page: use **Record** to capture a thought, then **Stop** to transcribe, clean, and tag. Or use **Thought starters** (Sparkles) for prompts.
5. Edit the draft if needed, then save; the thought appears in your list with tags and optional category.
6. On each thought: add **follow-ups**, ask an **AI reflection question**, **distill** to a shorter summary, or click a **person** to open their profile panel and add a clarifier.
7. Use category tabs and search to filter; use the menu on a thought to copy, view raw, translate, or delete (with confirmation).
8. **Settings**: theme, translation language, account, and (if configured) Stripe subscription.

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
