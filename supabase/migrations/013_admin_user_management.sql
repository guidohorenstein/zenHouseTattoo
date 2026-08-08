-- Admin user management hardening.
-- Adds roles and active flags so admin access can be managed from the app.

alter table public.admin_profiles
add column if not exists role text not null default 'admin'
check (role in ('owner', 'admin', 'viewer'));

alter table public.admin_profiles
add column if not exists is_active boolean not null default true;

alter table public.admin_profiles
add column if not exists last_sign_in_at timestamptz;

update public.admin_profiles
set role = case when is_super_admin then 'owner' else role end,
    is_active = true
where role is null or is_active is null;

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1
    from public.admin_profiles
    where id = auth.uid()
      and is_active = true
  );
$$ language sql stable security definer;

create or replace function public.is_admin_owner()
returns boolean as $$
  select exists (
    select 1
    from public.admin_profiles
    where id = auth.uid()
      and is_active = true
      and (is_super_admin = true or role = 'owner')
  );
$$ language sql stable security definer;

drop policy if exists "Admins can read admin profiles" on public.admin_profiles;
drop policy if exists "Owners can manage admin profiles" on public.admin_profiles;

create policy "Admins can read admin profiles"
on public.admin_profiles for select
to authenticated
using (public.is_admin());

create policy "Owners can manage admin profiles"
on public.admin_profiles for all
to authenticated
using (public.is_admin_owner())
with check (public.is_admin_owner());


insert into public.admin_profiles (id, email, display_name, is_super_admin, role, is_active)
select id, email, email, true, 'owner', true
from auth.users
where lower(email) in ('guidohorenstein03@gmail.com', 'daginstruments@gmail.com')
on conflict (email) do update
set is_super_admin = true,
    role = 'owner',
    is_active = true;
