-- Zen House Tattoo initial Supabase schema
-- Run this in the Supabase SQL editor for the project connected to zenhousetattoo.com.

create extension if not exists pgcrypto;

create type inquiry_status as enum (
  'requested',
  'no_response',
  'quoted',
  'booked',
  'completed',
  'cancelled'
);

create table if not exists public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  is_super_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  source_language text not null default 'he',
  idea_description text not null,
  body_reference text,
  has_tattoos text,
  general_zone text,
  specific_zone text,
  placement_boxes jsonb not null default '[]'::jsonb,
  styles text[] not null default '{}',
  color_mode text,
  timing text,
  contact_times text[] not null default '{}',
  status inquiry_status not null default 'requested',
  estimated_price numeric(10,2),
  appointment_date timestamptz,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inquiry_reference_images (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  storage_path text not null,
  public_url text,
  original_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.inquiry_notes (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  admin_id uuid references auth.users(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.inquiry_status_events (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  admin_id uuid references auth.users(id) on delete set null,
  from_status inquiry_status,
  to_status inquiry_status not null,
  created_at timestamptz not null default now()
);

create table if not exists public.tattoo_styles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_en text not null,
  title_he text not null,
  placement_group text not null default 'main' check (placement_group in ('main', 'more')),
  sort_order integer not null default 0,
  color_image_path text,
  black_grey_image_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.body_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_en text not null,
  title_he text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.body_areas (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.body_categories(id) on delete cascade,
  slug text not null unique,
  title_en text not null,
  title_he text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.body_area_images (
  id uuid primary key default gen_random_uuid(),
  body_area_id uuid references public.body_areas(id) on delete cascade,
  category_id uuid references public.body_categories(id) on delete cascade,
  body_reference text not null check (body_reference in ('male', 'female')),
  image_role text not null default 'card' check (image_role in ('card', 'placement')),
  storage_path text not null,
  crop_data jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint body_area_or_category_required check (body_area_id is not null or category_id is not null)
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_inquiries_updated_at
before update on public.inquiries
for each row execute function public.set_updated_at();

create trigger set_tattoo_styles_updated_at
before update on public.tattoo_styles
for each row execute function public.set_updated_at();

create trigger set_body_categories_updated_at
before update on public.body_categories
for each row execute function public.set_updated_at();

create trigger set_body_areas_updated_at
before update on public.body_areas
for each row execute function public.set_updated_at();

create trigger set_app_settings_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1
    from public.admin_profiles
    where id = auth.uid()
  );
$$ language sql stable security definer;

alter table public.admin_profiles enable row level security;
alter table public.inquiries enable row level security;
alter table public.inquiry_reference_images enable row level security;
alter table public.inquiry_notes enable row level security;
alter table public.inquiry_status_events enable row level security;
alter table public.tattoo_styles enable row level security;
alter table public.body_categories enable row level security;
alter table public.body_areas enable row level security;
alter table public.body_area_images enable row level security;
alter table public.app_settings enable row level security;

create policy "Admins can read admin profiles"
on public.admin_profiles for select
to authenticated
using (public.is_admin());

create policy "Admins can manage inquiries"
on public.inquiries for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can create inquiries"
on public.inquiries for insert
to anon, authenticated
with check (true);

create policy "Admins can manage inquiry images"
on public.inquiry_reference_images for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can create inquiry images"
on public.inquiry_reference_images for insert
to anon, authenticated
with check (true);

create policy "Admins can manage notes"
on public.inquiry_notes for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage status events"
on public.inquiry_status_events for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read active tattoo styles"
on public.tattoo_styles for select
to anon, authenticated
using (is_active = true);

create policy "Admins can manage tattoo styles"
on public.tattoo_styles for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read active body categories"
on public.body_categories for select
to anon, authenticated
using (is_active = true);

create policy "Admins can manage body categories"
on public.body_categories for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read active body areas"
on public.body_areas for select
to anon, authenticated
using (is_active = true);

create policy "Admins can manage body areas"
on public.body_areas for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read active body area images"
on public.body_area_images for select
to anon, authenticated
using (is_active = true);

create policy "Admins can manage body area images"
on public.body_area_images for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage settings"
on public.app_settings for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.admin_profiles (id, email, display_name, is_super_admin)
select id, email, email, true
from auth.users
where lower(email) in ('guidohorenstein03@gmail.com', 'daginstruments@gmail.com')
on conflict (email) do update set is_super_admin = true;
