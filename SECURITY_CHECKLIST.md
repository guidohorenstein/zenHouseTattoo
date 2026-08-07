# Production Security Checklist

Last review: 2026-08-07

## Applied in code

- Public inquiry writes go through `supabase/functions/submit-inquiry` instead of direct browser inserts.
- The Edge Function uses an explicit allowlist payload to prevent mass assignment.
- The Edge Function validates email, phone, text lengths, option values, placement boxes, file count, file MIME type, and file size.
- Duplicate submissions are blocked with `submission_key`.
- Rate limiting exists by email, phone, and client IP.
- Supabase/internal errors are logged server-side and replaced with generic public errors.
- Reference and placement images stay in the private `inquiry-references` bucket.
- Admin media is stored separately in the public `admin-media` bucket.
- Cloudflare Pages security headers are defined in `public/_headers`.
- SPA routing fallback is defined in `public/_redirects`.
- `.env`, `.env.*`, and `*.local` are ignored by Git, while `.env.example` remains safe to commit.

## Must verify in Supabase before production

- Run all migrations through `012_add_rate_limit_metadata.sql`.
- Deploy `submit-inquiry` after the latest code changes.
- Keep `SUPABASE_SERVICE_ROLE_KEY` only as a Supabase Function secret.
- Confirm both admin emails exist in Supabase Auth and `admin_profiles`.
- Set Auth Site URL to `https://zenhousetattoo.com`.
- Add redirect URLs for `https://zenhousetattoo.com/admin`, `https://www.zenhousetattoo.com/admin`, and local dev.
- Review Auth settings for short-lived access tokens according to Supabase dashboard defaults/project policy.

## Must verify in Cloudflare before production

- Deploy with build command `npm run build` and output directory `dist`.
- Add only public frontend env vars: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Do not add service role keys to Cloudflare Pages.
- Confirm `public/_headers` is applied in the deployed response headers.
- Confirm HTTPS is enabled and `Always Use HTTPS` is active for the domain.
