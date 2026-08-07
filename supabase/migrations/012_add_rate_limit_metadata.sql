-- Store minimal request metadata for rate limiting and operational audit.
-- Do not expose these fields in the public form or WhatsApp message.

alter table public.inquiries
add column if not exists client_ip text,
add column if not exists user_agent text;

create index if not exists inquiries_client_ip_created_at_idx
on public.inquiries (client_ip, created_at desc)
where client_ip is not null;

create index if not exists inquiries_email_created_at_idx
on public.inquiries (email, created_at desc);

create index if not exists inquiries_phone_created_at_idx
on public.inquiries (phone, created_at desc);

notify pgrst, 'reload schema';
