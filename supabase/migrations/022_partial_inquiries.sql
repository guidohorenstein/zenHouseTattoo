create table if not exists public.partial_inquiries (
  id uuid primary key default gen_random_uuid(),
  submission_key text not null unique,
  full_name text not null,
  email text not null,
  phone text not null,
  source_language text not null default 'he' check (source_language in ('he', 'en')),
  status text not null default 'partial' check (status in ('partial', 'converted')),
  converted_inquiry_id uuid references public.inquiries(id) on delete set null,
  archived_at timestamptz,
  client_ip text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_partial_inquiries_updated_at on public.partial_inquiries;
create trigger set_partial_inquiries_updated_at
before update on public.partial_inquiries
for each row execute function public.set_updated_at();

alter table public.partial_inquiries enable row level security;

drop policy if exists "Admins can read partial inquiries" on public.partial_inquiries;
drop policy if exists "Admin editors can update partial inquiries" on public.partial_inquiries;
drop policy if exists "Admin editors can delete partial inquiries" on public.partial_inquiries;

create policy "Admins can read partial inquiries"
on public.partial_inquiries for select
to authenticated
using (public.is_admin());

create policy "Admin editors can update partial inquiries"
on public.partial_inquiries for update
to authenticated
using (public.can_manage_admin_content())
with check (public.can_manage_admin_content());

create policy "Admin editors can delete partial inquiries"
on public.partial_inquiries for delete
to authenticated
using (public.can_manage_admin_content());

create index if not exists partial_inquiries_status_created_at_idx
on public.partial_inquiries (status, created_at desc);

create index if not exists partial_inquiries_archived_at_created_at_idx
on public.partial_inquiries (archived_at, created_at desc);

notify pgrst, 'reload schema';
