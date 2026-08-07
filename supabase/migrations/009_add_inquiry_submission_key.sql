alter table public.inquiries
add column if not exists submission_key text;

create unique index if not exists inquiries_submission_key_unique
on public.inquiries (submission_key)
where submission_key is not null;

notify pgrst, 'reload schema';
