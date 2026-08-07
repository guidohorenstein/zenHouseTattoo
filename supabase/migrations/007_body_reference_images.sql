create table if not exists public.body_reference_images (
  id uuid primary key default gen_random_uuid(),
  body_reference text not null unique check (body_reference in ('male', 'female')),
  storage_path text not null,
  crop_data jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.body_reference_images enable row level security;

drop policy if exists "Public can read active body reference images"
on public.body_reference_images;

create policy "Public can read active body reference images"
on public.body_reference_images for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins can manage body reference images"
on public.body_reference_images;

create policy "Admins can manage body reference images"
on public.body_reference_images for all
to authenticated
using (public.is_admin())
with check (public.is_admin());