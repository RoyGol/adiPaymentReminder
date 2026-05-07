# Supabase Setup

## 1. Apply Migration
In Supabase dashboard → SQL Editor, run `supabase/migrations/001_initial.sql`.

## 2. Configure Google OAuth
1. Go to Authentication → Providers → Google
2. Enable Google provider
3. Enter Client ID and Secret from Google Cloud Console
4. Add scope: `https://www.googleapis.com/auth/calendar.readonly`
5. Copy the Supabase callback URL and add it to your Google OAuth app's Authorized Redirect URIs

## 3. Environment Variables
Copy `.env.local.example` to `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase project settings
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase project settings
