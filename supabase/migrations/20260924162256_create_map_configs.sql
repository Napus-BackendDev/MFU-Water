create table public.map_configs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  config jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.map_configs enable row level security;

create policy "Public can read published map configs"
  on public.map_configs
  for select
  to anon
  using (is_published = true);

revoke all on table public.map_configs from anon, authenticated;
grant select on table public.map_configs to anon;
