alter table public.inquiries
add column if not exists placement_marked_image_path text,
add column if not exists placement_marked_image_url text;

notify pgrst, 'reload schema';
