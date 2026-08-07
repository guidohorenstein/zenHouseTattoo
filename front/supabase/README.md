# Supabase setup - Zen House Tattoo

1. Create/open the Supabase project for `zenhousetattoo.com`.
2. In Auth, create users for:
   - guidohorenstein03@gmail.com
   - daginstruments@gmail.com
3. Run `supabase/migrations/001_initial_schema.sql` in the SQL editor.
4. Run `supabase/migrations/002_storage_buckets.sql` in the SQL editor.
5. Copy Project URL and anon key into `.env.local`.

Reference image upload from the public form is intentionally not enabled directly from the browser yet. We will add it through a secure Edge Function/API before production.

Never put the Supabase `service_role` key in the frontend.
