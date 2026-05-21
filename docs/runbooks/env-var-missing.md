# Runbook: Missing Environment Variables

**Symptom:** App throws `Error: Missing Supabase environment variables` on startup. White screen.

**Root cause:** `.env.local` not created, or required vars not set.

## Fix

```sh
cp .env.example .env.local
# Edit .env.local:
# VITE_SUPABASE_URL  — Supabase Dashboard → Project Settings → API → Project URL
# VITE_SUPABASE_ANON_KEY — Supabase Dashboard → Project Settings → API → anon/public key
npm run dev
```

## Verification

App loads at `http://localhost:5173` without console errors.

## Note

`.env.local` is gitignored and must be created on each development machine. See `.env.example` for the full variable list.
