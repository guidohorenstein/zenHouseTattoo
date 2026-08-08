-- Makes viewer a real read-only role.
-- Owners and admins can edit operational content; viewers can only read.

create or replace function public.can_manage_admin_content()
returns boolean as $$
  select exists (
    select 1
    from public.admin_profiles
    where id = auth.uid()
      and is_active = true
      and (is_super_admin = true or role in ('owner', 'admin'))
  );
$$ language sql stable security definer;

create or replace function public.can_manage_admin_users()
returns boolean as $$
  select exists (
    select 1
    from public.admin_profiles
    where id = auth.uid()
      and is_active = true
      and (is_super_admin = true or role = 'owner')
  );
$$ language sql stable security definer;

drop policy if exists "Admins can manage inquiries" on public.inquiries;
drop policy if exists "Admins can read inquiries" on public.inquiries;
drop policy if exists "Admin editors can update inquiries" on public.inquiries;
drop policy if exists "Admin editors can delete inquiries" on public.inquiries;

create policy "Admins can read inquiries"
on public.inquiries for select
to authenticated
using (public.is_admin());

create policy "Admin editors can update inquiries"
on public.inquiries for update
to authenticated
using (public.can_manage_admin_content())
with check (public.can_manage_admin_content());

create policy "Admin editors can delete inquiries"
on public.inquiries for delete
to authenticated
using (public.can_manage_admin_content());

drop policy if exists "Admins can manage inquiry images" on public.inquiry_reference_images;
drop policy if exists "Admins can read inquiry images" on public.inquiry_reference_images;
drop policy if exists "Admin editors can manage inquiry images" on public.inquiry_reference_images;

create policy "Admins can read inquiry images"
on public.inquiry_reference_images for select
to authenticated
using (public.is_admin());

create policy "Admin editors can manage inquiry images"
on public.inquiry_reference_images for all
to authenticated
using (public.can_manage_admin_content())
with check (public.can_manage_admin_content());

drop policy if exists "Admins can manage notes" on public.inquiry_notes;
drop policy if exists "Admins can read notes" on public.inquiry_notes;
drop policy if exists "Admin editors can manage notes" on public.inquiry_notes;

create policy "Admins can read notes"
on public.inquiry_notes for select
to authenticated
using (public.is_admin());

create policy "Admin editors can manage notes"
on public.inquiry_notes for all
to authenticated
using (public.can_manage_admin_content())
with check (public.can_manage_admin_content());

drop policy if exists "Admins can manage status events" on public.inquiry_status_events;
drop policy if exists "Admins can read status events" on public.inquiry_status_events;
drop policy if exists "Admin editors can manage status events" on public.inquiry_status_events;

create policy "Admins can read status events"
on public.inquiry_status_events for select
to authenticated
using (public.is_admin());

create policy "Admin editors can manage status events"
on public.inquiry_status_events for all
to authenticated
using (public.can_manage_admin_content())
with check (public.can_manage_admin_content());

drop policy if exists "Admins can manage tattoo styles" on public.tattoo_styles;
drop policy if exists "Admin editors can manage tattoo styles" on public.tattoo_styles;

create policy "Admin editors can manage tattoo styles"
on public.tattoo_styles for all
to authenticated
using (public.can_manage_admin_content())
with check (public.can_manage_admin_content());

drop policy if exists "Admins can manage body categories" on public.body_categories;
drop policy if exists "Admin editors can manage body categories" on public.body_categories;

create policy "Admin editors can manage body categories"
on public.body_categories for all
to authenticated
using (public.can_manage_admin_content())
with check (public.can_manage_admin_content());

drop policy if exists "Admins can manage body areas" on public.body_areas;
drop policy if exists "Admin editors can manage body areas" on public.body_areas;

create policy "Admin editors can manage body areas"
on public.body_areas for all
to authenticated
using (public.can_manage_admin_content())
with check (public.can_manage_admin_content());

drop policy if exists "Admins can manage body area images" on public.body_area_images;
drop policy if exists "Admin editors can manage body area images" on public.body_area_images;

create policy "Admin editors can manage body area images"
on public.body_area_images for all
to authenticated
using (public.can_manage_admin_content())
with check (public.can_manage_admin_content());

drop policy if exists "Admins can manage body reference images" on public.body_reference_images;
drop policy if exists "Admin editors can manage body reference images" on public.body_reference_images;

create policy "Admin editors can manage body reference images"
on public.body_reference_images for all
to authenticated
using (public.can_manage_admin_content())
with check (public.can_manage_admin_content());

drop policy if exists "Admins can manage settings" on public.app_settings;
drop policy if exists "Admins can read settings" on public.app_settings;
drop policy if exists "Admin editors can manage settings" on public.app_settings;

create policy "Admins can read settings"
on public.app_settings for select
to authenticated
using (public.is_admin());

create policy "Admin editors can manage settings"
on public.app_settings for all
to authenticated
using (public.can_manage_admin_content())
with check (public.can_manage_admin_content());

drop policy if exists "Admins can upload admin media" on storage.objects;
drop policy if exists "Admins can update admin media" on storage.objects;
drop policy if exists "Admins can delete admin media" on storage.objects;
drop policy if exists "Admin editors can upload admin media" on storage.objects;
drop policy if exists "Admin editors can update admin media" on storage.objects;
drop policy if exists "Admin editors can delete admin media" on storage.objects;

create policy "Admin editors can upload admin media"
on storage.objects for insert
to authenticated
with check (bucket_id = 'admin-media' and public.can_manage_admin_content());

create policy "Admin editors can update admin media"
on storage.objects for update
to authenticated
using (bucket_id = 'admin-media' and public.can_manage_admin_content())
with check (bucket_id = 'admin-media' and public.can_manage_admin_content());

create policy "Admin editors can delete admin media"
on storage.objects for delete
to authenticated
using (bucket_id = 'admin-media' and public.can_manage_admin_content());

drop policy if exists "Admins can delete inquiry reference images" on storage.objects;
drop policy if exists "Admin editors can delete inquiry reference images" on storage.objects;

create policy "Admin editors can delete inquiry reference images"
on storage.objects for delete
to authenticated
using (bucket_id = 'inquiry-references' and public.can_manage_admin_content());
