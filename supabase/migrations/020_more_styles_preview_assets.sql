create table if not exists public.more_styles_previews (
  color_mode text primary key check (color_mode in ('color', 'blackGrey')),
  image_path text,
  crop_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_more_styles_previews_updated_at'
  ) then
    create trigger set_more_styles_previews_updated_at
    before update on public.more_styles_previews
    for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.more_styles_previews enable row level security;

drop policy if exists "Public can read more styles previews" on public.more_styles_previews;
create policy "Public can read more styles previews"
on public.more_styles_previews
for select
to anon, authenticated
using (true);

drop policy if exists "Admins can manage more styles previews" on public.more_styles_previews;
create policy "Admins can manage more styles previews"
on public.more_styles_previews
for all
to authenticated
using (public.can_manage_admin_content())
with check (public.can_manage_admin_content());

insert into public.more_styles_previews (color_mode)
values ('color'), ('blackGrey')
on conflict (color_mode) do nothing;
