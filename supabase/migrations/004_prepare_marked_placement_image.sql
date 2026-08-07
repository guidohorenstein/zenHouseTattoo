-- Future storage fields for the generated body image with placement boxes drawn on top.
-- The current frontend still stores only placement_boxes; the rendered image will be added later.

alter table public.inquiries
add column if not exists placement_marked_image_path text,
add column if not exists placement_marked_image_url text;
