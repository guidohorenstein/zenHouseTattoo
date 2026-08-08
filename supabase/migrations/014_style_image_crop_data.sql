-- Stores non-destructive framing data for style images.

alter table public.tattoo_styles
add column if not exists color_crop_data jsonb not null default '{}'::jsonb;

alter table public.tattoo_styles
add column if not exists black_grey_crop_data jsonb not null default '{}'::jsonb;
