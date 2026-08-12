-- Allows Color and Black & grey style previews to have independent ordering
-- and independent Main / Show more placement.

alter table public.tattoo_styles
add column if not exists color_placement_group text not null default 'main'
  check (color_placement_group in ('main', 'more'));

alter table public.tattoo_styles
add column if not exists color_sort_order integer not null default 0;

alter table public.tattoo_styles
add column if not exists black_grey_placement_group text not null default 'main'
  check (black_grey_placement_group in ('main', 'more'));

alter table public.tattoo_styles
add column if not exists black_grey_sort_order integer not null default 0;

update public.tattoo_styles
set
  color_placement_group = placement_group,
  color_sort_order = sort_order,
  black_grey_placement_group = placement_group,
  black_grey_sort_order = sort_order
where color_sort_order = 0
  and black_grey_sort_order = 0;
