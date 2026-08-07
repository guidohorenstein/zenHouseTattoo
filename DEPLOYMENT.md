# Deployment - Zen House Tattoo

This project is ready to deploy as a static React/Vite app. Supabase stays as the backend for auth, database, storage, and the secure `submit-inquiry` Edge Function.

## Recommended Deploy: Cloudflare Pages

Use these settings in Cloudflare Pages:

- Project name: `zen-house-tattoo`
- Production branch: your main branch
- Root directory: leave empty or `/`
- Build command: `npm run build`
- Build output directory: `dist`
- Node version: `22`

Add these environment variables in Cloudflare Pages:

```txt
VITE_SUPABASE_URL=https://rjhdbfvljpxxvpssyttu.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
```

For Workers deploy, `wrangler.jsonc` uses `not_found_handling = single-page-application` so React routes like `/admin` work on refresh. The file `public/_headers` adds production security headers.

## Domain

When the Pages project is live, connect:

```txt
zenhousetattoo.com
www.zenhousetattoo.com
```

Then update Supabase Auth URL settings:

- Site URL: `https://zenhousetattoo.com`
- Redirect URLs:
  - `https://zenhousetattoo.com/admin`
  - `https://www.zenhousetattoo.com/admin`
  - `http://localhost:5173/admin`

## Supabase Function

The public form submits through the Edge Function:

```bash
supabase functions deploy submit-inquiry --project-ref rjhdbfvljpxxvpssyttu
```

The `service_role` key must stay only in Supabase secrets. Never put it in `.env.local`, Cloudflare Pages variables, or frontend code.

## Pre-deploy Check

Run this before publishing:

```bash
npm run lint
npm run build
```

If both pass, the frontend is safe to deploy.
