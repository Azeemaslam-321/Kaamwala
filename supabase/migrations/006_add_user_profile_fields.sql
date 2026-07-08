alter table public.users
  add column if not exists city text,
  add column if not exists address text,
  add column if not exists avatar_url text;

do $$ begin
  alter table public.users
    add constraint users_city_check check (city is null or city in ('Lucknow', 'Unnao', 'Kanpur', 'Basti', 'Gorakhpur'));
exception
  when duplicate_object then null;
end $$;
