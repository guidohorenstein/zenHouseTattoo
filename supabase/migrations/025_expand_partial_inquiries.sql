alter table public.partial_inquiries
  add column if not exists idea_description text not null default '',
  add column if not exists body_reference text,
  add column if not exists general_zone text,
  add column if not exists specific_zone text,
  add column if not exists placement_boxes jsonb not null default '[]'::jsonb,
  add column if not exists styles text[] not null default '{}',
  add column if not exists color_mode text,
  add column if not exists placement_marked_image_path text;

create table if not exists public.partial_inquiry_reference_images (
  id uuid primary key default gen_random_uuid(),
  partial_inquiry_id uuid not null references public.partial_inquiries(id) on delete cascade,
  storage_path text not null,
  public_url text,
  original_name text,
  created_at timestamptz not null default now()
);

alter table public.partial_inquiry_reference_images enable row level security;

drop policy if exists "Admins can read partial inquiry images" on public.partial_inquiry_reference_images;
drop policy if exists "Admin editors can delete partial inquiry images" on public.partial_inquiry_reference_images;

create policy "Admins can read partial inquiry images"
on public.partial_inquiry_reference_images for select
to authenticated
using (public.is_admin());

create policy "Admin editors can delete partial inquiry images"
on public.partial_inquiry_reference_images for delete
to authenticated
using (public.can_manage_admin_content());

create index if not exists partial_inquiry_reference_images_partial_idx
on public.partial_inquiry_reference_images (partial_inquiry_id, created_at desc);

notify pgrst, 'reload schema';
