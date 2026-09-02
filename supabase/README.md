# Supabase setup - Zen House Tattoo

Supabase handles auth, database, storage, and the secure public form submission function.

## 1. Project

Use the Supabase project for `zenhousetattoo.com`.

Allowed admin emails:

- `guidohorenstein03@gmail.com`
- `daginstruments@gmail.com`

Create both users in Supabase Auth. If a user is deleted and recreated, make sure its new Auth user id is also present in the admin access table/policy data used by the project.

## 2. Database migrations

Run the migrations in order from the SQL editor or with the Supabase CLI:

```txt
001_initial_schema.sql
002_storage_buckets.sql
003_harden_reference_image_policy.sql
004_prepare_marked_placement_image.sql
005_seed_tattoo_styles.sql
006_seed_body_photos.sql
007_body_reference_images.sql
008_cleanup_local_seed_media_paths.sql
009_add_inquiry_submission_key.sql
010_harden_public_inquiry_writes.sql
011_ensure_marked_placement_fields.sql
012_add_rate_limit_metadata.sql
```

If Supabase says a policy or column already exists, do not delete data manually. Check whether the migration already ran and continue with the next pending migration.

## 3. Frontend environment

Copy Project URL and anon/publishable key into `.env.local`:

```txt
VITE_SUPABASE_URL=https://rjhdbfvljpxxvpssyttu.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
```

The frontend can use the anon/publishable key safely because Row Level Security controls what public users can do.

## 4. Edge Function

The public form must submit through `submit-inquiry`. This function uses the service role key server-side so the browser never writes directly to protected tables/storage.

Deploy it with:

```bash
supabase functions deploy submit-inquiry --project-ref rjhdbfvljpxxvpssyttu
```

Lead notifications use a delayed processor so partial leads can become complete before an email is sent. Deploy all public lead functions after notification changes:

```bash
supabase functions deploy save-partial-inquiry --project-ref rjhdbfvljpxxvpssyttu
supabase functions deploy submit-inquiry --project-ref rjhdbfvljpxxvpssyttu
supabase functions deploy process-lead-notifications --project-ref rjhdbfvljpxxvpssyttu
```

Configure notification secrets in Supabase before running the processor:

```bash
supabase secrets set RESEND_API_KEY=your-resend-api-key --project-ref rjhdbfvljpxxvpssyttu
supabase secrets set LEAD_NOTIFICATION_FROM="Zen House Tattoo <notifications@zenhousetattoo.com>" --project-ref rjhdbfvljpxxvpssyttu
supabase secrets set LEAD_NOTIFICATION_SECRET=your-long-random-secret --project-ref rjhdbfvljpxxvpssyttu
supabase secrets set PUBLIC_SITE_URL=https://zenhousetattoo.com --project-ref rjhdbfvljpxxvpssyttu
```

Schedule `process-lead-notifications` to run every few minutes from Supabase scheduled functions, cron, or another trusted scheduler. The request must include the secret header:

```txt
x-lead-notification-secret: your-long-random-secret
```

The `service_role` key must stay only in Supabase secrets. Never put it in frontend code, `.env.local`, GitHub, or Cloudflare Pages variables.

## 5. Storage

Reference images and marked placement images are stored in the private `inquiry-references` bucket. The admin panel reads them through signed URLs.

## 6. Local verification

```bash
npm run lint
npm run build
npm run dev
```

Submit one test inquiry, confirm WhatsApp opens, and confirm the request appears in the admin panel with reference images and placement preview.
