# Quick Start Guide

## 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your API keys
npm start
```

Backend will run on `http://localhost:3001`

## 2. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your Supabase credentials and API URL
npm run dev
```

Frontend will run on `http://localhost:5173`

## 3. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a project
2. Run the SQL from `SUPABASE_SCHEMA.sql` in the SQL editor
3. Copy your project URL and anon key to `frontend/.env`

## 4. Generate Icons (Optional)

See `ICON_GENERATION.md` for instructions on creating PWA icons.

## 5. Test the App

1. Open the frontend in your browser
2. Click "Record" to start recording
3. Speak your thought
4. Click "Stop" to process
5. Your thought will be transcribed, cleaned, tagged, and saved

## Troubleshooting

- **Backend not connecting**: Make sure backend is running on port 3001
- **API errors**: Check that your API keys are correctly set in `backend/.env`
- **Supabase errors**: Verify your Supabase credentials and that the table exists
- **Recording fails**: Check browser permissions for microphone access

