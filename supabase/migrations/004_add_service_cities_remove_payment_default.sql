-- Run this only if you already ran the older migrations before city support was added.
-- Fresh projects can run 001, 002, 003 and do not need this compatibility migration.

alter table public.workers
  add column if not exists city text;

alter table public.bookings
  add column if not exists city text;

update public.workers
set city = 'Lucknow'
where city is null;

update public.bookings
set city = 'Lucknow'
where city is null;

alter table public.workers
  alter column city set not null;

alter table public.bookings
  alter column city set not null;

do $$ begin
  alter table public.workers
    add constraint workers_city_check check (city in ('Lucknow', 'Unnao', 'Kanpur', 'Basti', 'Gorakhpur'));
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter table public.bookings
    add constraint bookings_city_check check (city in ('Lucknow', 'Unnao', 'Kanpur', 'Basti', 'Gorakhpur'));
exception
  when duplicate_object then null;
end $$;

alter table public.bookings
  alter column amount set default 0;

alter table public.bookings
  alter column status set default 'confirmed';

create index if not exists idx_workers_status_city_category on public.workers(status, city, category);
