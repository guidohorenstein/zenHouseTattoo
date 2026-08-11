-- Allows admins to choose which style image is used for the "More styles" card.

alter table public.tattoo_styles
add column if not exists is_more_styles_preview boolean not null default false;

create unique index if not exists one_more_styles_preview
on public.tattoo_styles (is_more_styles_preview)
where is_more_styles_preview;
