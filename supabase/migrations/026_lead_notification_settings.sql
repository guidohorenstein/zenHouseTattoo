alter table public.inquiries
  add column if not exists notification_due_at timestamptz,
  add column if not exists notification_sent_at timestamptz,
  add column if not exists notification_attempted_at timestamptz,
  add column if not exists notification_error text;

alter table public.partial_inquiries
  add column if not exists notification_due_at timestamptz,
  add column if not exists notification_sent_at timestamptz,
  add column if not exists notification_attempted_at timestamptz,
  add column if not exists notification_error text;

create index if not exists inquiries_notification_due_idx
on public.inquiries (notification_due_at)
where notification_sent_at is null;

create index if not exists partial_inquiries_notification_due_idx
on public.partial_inquiries (notification_due_at)
where notification_sent_at is null and status = 'partial';

insert into public.app_settings (key, value)
values (
  'lead_notifications',
  '{
    "enabled": true,
    "recipients": [],
    "delayMinutes": 10
  }'::jsonb
)
on conflict (key) do update
set value = public.app_settings.value || excluded.value;

notify pgrst, 'reload schema';
