alter table public.inquiries
add column if not exists archived_at timestamptz;

create index if not exists inquiries_archived_at_created_at_idx
on public.inquiries (archived_at, created_at desc);

drop policy if exists "Public can read safe app settings" on public.app_settings;
create policy "Public can read safe app settings"
on public.app_settings
for select
to anon, authenticated
using (key = 'form');

insert into public.app_settings (key, value)
values (
  'form',
  '{
    "whatsappPhone": "972547505670",
    "defaultLanguage": "he",
    "formEnabled": true,
    "maxReferenceImages": 4,
    "maxPlacementBoxes": 3
  }'::jsonb
)
on conflict (key) do update
set value = public.app_settings.value || excluded.value;

notify pgrst, 'reload schema';
