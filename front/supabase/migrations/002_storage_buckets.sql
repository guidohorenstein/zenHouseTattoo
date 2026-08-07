-- Storage buckets and safe policies
-- Client reference uploads stay private and should be written by a secure Edge Function/API.
-- The public frontend must never receive a service_role key.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'inquiry-references',
  'inquiry-references',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'admin-media',
  'admin-media',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Admins can read inquiry reference images"
on storage.objects for select
to authenticated
using (bucket_id = 'inquiry-references' and public.is_admin());

create policy "Admins can delete inquiry reference images"
on storage.objects for delete
to authenticated
using (bucket_id = 'inquiry-references' and public.is_admin());

create policy "Anyone can read admin media"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'admin-media');

create policy "Admins can upload admin media"
on storage.objects for insert
to authenticated
with check (bucket_id = 'admin-media' and public.is_admin());

create policy "Admins can update admin media"
on storage.objects for update
to authenticated
using (bucket_id = 'admin-media' and public.is_admin())
with check (bucket_id = 'admin-media' and public.is_admin());

create policy "Admins can delete admin media"
on storage.objects for delete
to authenticated
using (bucket_id = 'admin-media' and public.is_admin());
