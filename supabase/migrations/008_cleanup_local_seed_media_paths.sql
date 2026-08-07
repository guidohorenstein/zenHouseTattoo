-- Local /images paths were useful as first placeholders, but admin-managed
-- styles should only show images uploaded through the admin panel.

update public.tattoo_styles
set color_image_path = null
where color_image_path like '/images/%';

update public.tattoo_styles
set black_grey_image_path = null
where black_grey_image_path like '/images/%';
