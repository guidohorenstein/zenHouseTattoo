insert into public.body_categories (slug, title_en, title_he, sort_order, is_active)
values
  ('torso', 'Torso', 'Torso', 10, true),
  ('arm', 'Arm', 'Arm', 20, true),
  ('leg', 'Leg', 'Leg', 30, true),
  ('hand', 'Hand', 'Hand', 40, true),
  ('face', 'Face / neck', 'Face / neck', 50, true)
on conflict (slug) do update set
  title_en = excluded.title_en,
  title_he = excluded.title_he,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.body_areas (category_id, slug, title_en, title_he, sort_order, is_active)
values
  ((select id from public.body_categories where slug = 'torso'), 'torsoFront', 'Torso front', 'Torso front', 10, true),
  ((select id from public.body_categories where slug = 'torso'), 'torsoBack', 'Torso back', 'Torso back', 20, true),
  ((select id from public.body_categories where slug = 'torso'), 'torsoRibs', 'Ribs', 'Ribs', 30, true),
  ((select id from public.body_categories where slug = 'arm'), 'armInner', 'Inner arm', 'Inner arm', 10, true),
  ((select id from public.body_categories where slug = 'arm'), 'armOuter', 'Outer arm', 'Outer arm', 20, true),
  ((select id from public.body_categories where slug = 'arm'), 'sleeve', 'Sleeve', 'Sleeve', 30, true),
  ((select id from public.body_categories where slug = 'leg'), 'legsFront', 'Legs front', 'Legs front', 10, true),
  ((select id from public.body_categories where slug = 'leg'), 'legBack', 'Leg back', 'Leg back', 20, true),
  ((select id from public.body_categories where slug = 'leg'), 'legSide', 'Leg side', 'Leg side', 30, true),
  ((select id from public.body_categories where slug = 'hand'), 'handInner', 'Palm side', 'Palm side', 10, true),
  ((select id from public.body_categories where slug = 'hand'), 'handOuter', 'Top of hand', 'Top of hand', 20, true),
  ((select id from public.body_categories where slug = 'face'), 'faceFront', 'Front', 'Front', 10, true),
  ((select id from public.body_categories where slug = 'face'), 'faceBack', 'Back', 'Back', 20, true),
  ((select id from public.body_categories where slug = 'face'), 'faceSide', 'Side', 'Side', 30, true)
on conflict (slug) do update set
  category_id = excluded.category_id,
  title_en = excluded.title_en,
  title_he = excluded.title_he,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;
