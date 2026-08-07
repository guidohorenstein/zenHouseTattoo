insert into public.tattoo_styles (
  slug,
  title_en,
  title_he,
  placement_group,
  sort_order,
  color_image_path,
  black_grey_image_path,
  is_active
)
values
  ('fineLine', 'Fine line', 'Fine line', 'main', 10, '/images/tattoo-styles/thumbs/fineLine.jpg', '/images/tattoo-styles/black-grey/thumbs/fineLine.jpg', true),
  ('realism', 'Realism', 'Realism', 'main', 20, '/images/tattoo-styles/thumbs/realism.jpg', '/images/tattoo-styles/black-grey/thumbs/realism.jpg', true),
  ('newAge', 'New age', 'New age', 'main', 30, '/images/tattoo-styles/thumbs/newAge.jpg', '/images/tattoo-styles/black-grey/thumbs/newAge.jpg', true),
  ('traditional', 'Old school', 'Old school', 'main', 40, '/images/tattoo-styles/thumbs/traditional.jpg', '/images/tattoo-styles/black-grey/thumbs/traditional.jpg', true),
  ('japanese', 'Japanese', 'Japanese', 'main', 50, '/images/tattoo-styles/thumbs/japanese.jpg', '/images/tattoo-styles/black-grey/thumbs/japanese.jpg', true),
  ('blackwork', 'Blackwork', 'Blackwork', 'main', 60, '/images/tattoo-styles/thumbs/blackwork.jpg', '/images/tattoo-styles/black-grey/thumbs/blackwork.jpg', true),
  ('surrealism', 'Surrealism', 'Surrealism', 'main', 70, '/images/tattoo-styles/thumbs/surrealism.jpg', '/images/tattoo-styles/black-grey/thumbs/surrealism.jpg', true),
  ('ornamental', 'Ornamental', 'Ornamental', 'main', 80, '/images/tattoo-styles/thumbs/ornamental.jpg', '/images/tattoo-styles/black-grey/thumbs/ornamental.jpg', true),
  ('neoTraditional', 'Neo traditional', 'Neo traditional', 'main', 90, '/images/tattoo-styles/thumbs/neoTraditional.jpg', '/images/tattoo-styles/black-grey/thumbs/neoTraditional.jpg', true),
  ('lettering', 'Lettering', 'Lettering', 'more', 110, '/images/tattoo-styles/thumbs/fineLine.jpg', '/images/tattoo-styles/black-grey/thumbs/fineLine.jpg', true),
  ('dotwork', 'Dotwork', 'Dotwork', 'more', 120, '/images/tattoo-styles/thumbs/ornamental.jpg', '/images/tattoo-styles/black-grey/thumbs/ornamental.jpg', true),
  ('microRealism', 'Micro realism', 'Micro realism', 'more', 130, '/images/tattoo-styles/thumbs/realism.jpg', '/images/tattoo-styles/black-grey/thumbs/realism.jpg', true),
  ('abstract', 'Abstract', 'Abstract', 'more', 140, '/images/tattoo-styles/thumbs/surrealism.jpg', '/images/tattoo-styles/black-grey/thumbs/surrealism.jpg', true),
  ('floral', 'Floral', 'Floral', 'more', 150, '/images/tattoo-styles/thumbs/neoTraditional.jpg', '/images/tattoo-styles/black-grey/thumbs/neoTraditional.jpg', true),
  ('mandala', 'Mandala', 'Mandala', 'more', 160, '/images/tattoo-styles/thumbs/ornamental.jpg', '/images/tattoo-styles/black-grey/thumbs/ornamental.jpg', true)
on conflict (slug) do update set
  title_en = excluded.title_en,
  title_he = excluded.title_he,
  placement_group = excluded.placement_group,
  sort_order = excluded.sort_order,
  color_image_path = excluded.color_image_path,
  black_grey_image_path = excluded.black_grey_image_path,
  is_active = excluded.is_active;
