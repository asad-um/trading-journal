# Wyckoff Journal

A professional, data-dense, dark-themed personal trading journal application designed specifically for Wyckoff traders.

## Project Overview

Built with Next.js 14 (App Router), Supabase, Cloudinary, Tailwind CSS, Recharts, and shadcn/ui. 
The application allows you to track, analyze, and review trades with deep statistics focusing on Wyckoff principles.

## Prerequisites

- Node.js 18.x or newer
- A free Supabase account (https://supabase.com)
- A free Cloudinary account (https://cloudinary.com)
- Vercel account (optional, for deployment)

## Step-by-step Local Setup

1. **Clone the repository** (or download the project files).
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Copy environment variables**:
   ```bash
   cp .env.example .env.local
   ```
4. Fill in the environment variables (see below).
5. **Run the development server**:
   ```bash
   npm run dev
   ```

## Step-by-step Supabase Configuration

1. **Create a project** in Supabase.
2. Go to **SQL Editor** in the dashboard and run the complete contents of `supabase/migrations/schema.sql` (found in the root directory).
3. Under **Authentication -> Providers**, ensure Email provider is enabled.
4. **Row Level Security (RLS)** is enabled for all tables in the provided schema. 
5. Grab your keys from **Project Settings -> API** and put them in your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (use for server-only processes or triggers if necessary)

## Step-by-step Cloudinary Configuration

1. **Sign up** at Cloudinary and note your Cloud Name on the dashboard.
2. Go to **Settings -> Upload**.
3. Scroll down to **Upload presets** and click "Add upload preset".
4. Set **Signing Mode** to "Unsigned".
5. Name your preset (e.g., `wyckoff_journal`) and save.
6. Add the Cloud Name and Preset name to your `.env.local`:
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
   - `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

## Step-by-step Vercel Deployment

1. Push your repository to GitHub, GitLab, or Bitbucket.
2. Go to Vercel and **Import Project**.
3. Under **Environment Variables**, add all the variables from your `.env.local`.
4. Click **Deploy**. Vercel will build and host your Next.js application.

## Brief User Guide

- **Registration:** Upon signing up, your profile and default user settings (Wyckoff defaults, assets, timeframes) are seeded automatically.
- **Dashboard:** Provides an overview of your current performance, open trades, and recent trades.
- **New Trade:** Go to "Trades" -> "+ New Trade" to log a trade. The wizard handles multiple steps, calculating Risk:Reward and automatically tagging trading sessions in UTC based on your execution time.
- **Quick Update:** From the dashboard or trade log, you can quickly update open/partial trades without navigating away.
- **Account:** Manage starting balances, deposits, and withdrawals.
- **Settings:** Customise your list of trade entry criteria, setups, assets, and export your trade data (CSV/PDF).

## Troubleshooting Common Issues

- **Supabase Pause:** Supabase pauses free projects after 1 week of inactivity. If the app shows a connection error, login to Supabase and reactivate your project.
- **Image Upload Failures:** Ensure your Cloudinary upload preset is strictly set to **Unsigned**.
- **Auth Issues:** If login loops or fails, try clearing your local storage/cookies, or check if the email confirmation is required (can be disabled in Supabase Auth settings).
