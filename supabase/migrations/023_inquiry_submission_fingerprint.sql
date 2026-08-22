alter table public.inquiries
add column if not exists submission_fingerprint text;

create unique index if not exists inquiries_submission_fingerprint_unique_idx
on public.inquiries (submission_fingerprint)
where submission_fingerprint is not null;

create index if not exists inquiries_contact_created_at_idx
on public.inquiries (email, phone, created_at desc);

notify pgrst, 'reload schema';
