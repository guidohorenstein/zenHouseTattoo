# Zen House Tattoo

Frontend and admin panel for Zen House Tattoo tattoo inquiries.

The public form lets clients request a tattoo quote, upload reference images, mark the body placement, and open WhatsApp with a clean pre-filled message. The admin panel lets the studio manage requests, statuses, notes, tattoo styles, body categories, and body reference images.

## Stack

- React
- Vite
- JSX
- Plain CSS
- Supabase Auth, Database, Storage, and Edge Functions
- Cloudflare Pages for hosting

## Project Structure

```txt
zenHouseTattoo/
  public/
    _redirects
    images/
  src/
    features/
      admin/
      tattoo-form/
    lib/
  supabase/
    functions/
    migrations/
  DEPLOYMENT.md
  package.json
```

## Local Development

From this folder:

```bash
cd C:\Users\Administrador\Desktop\zenHouseTattoo
npm install
npm run dev
```

Create `.env.local` using `.env.example`:

```txt
VITE_SUPABASE_URL=https://rjhdbfvljpxxvpssyttu.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
```

Never add the Supabase `service_role` key to frontend env files.

## Validation

Before deploy, run:

```bash
npm run lint
npm run build
```

## Supabase

Read the setup guide here:

```txt
supabase/README.md
```

The public inquiry form submits through the secure Edge Function `submit-inquiry`. Reference images and marked placement images are stored in the private `inquiry-references` bucket and shown in the admin panel through signed URLs.

## Cloudflare Deploy

Read the deployment guide here:

```txt
DEPLOYMENT.md
```

Recommended Cloudflare Pages settings:

- Root directory: leave empty or `/`
- Build command: `npm run build`
- Build output directory: `dist`
- Environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

`wrangler.jsonc` keeps React routes working on refresh for Workers deploy. `public/_headers` adds security headers.
