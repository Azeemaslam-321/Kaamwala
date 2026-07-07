create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('customer', 'worker', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.worker_status as enum ('pending', 'approved', 'rejected', 'inactive');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.booking_status as enum ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  phone text not null unique check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  role public.user_role not null default 'customer',
  is_blocked boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) between 2 and 60),
  icon text not null default 'wrench',
  created_at timestamptz not null default now()
);

create table if not exists public.workers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  category text not null,
  city text not null check (city in ('Lucknow', 'Unnao', 'Kanpur', 'Basti', 'Gorakhpur')),
  bio text not null default '',
  verified boolean not null default false,
  status public.worker_status not null default 'pending',
  rating numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5),
  photo_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  worker_id uuid references public.workers(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  city text not null check (city in ('Lucknow', 'Unnao', 'Kanpur', 'Basti', 'Gorakhpur')),
  status public.booking_status not null default 'confirmed',
  amount integer not null default 0 check (amount >= 0),
  scheduled_date timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_workers_status_city_category on public.workers(status, city, category);
create index if not exists idx_workers_search on public.workers using gin (to_tsvector('simple', name || ' ' || category || ' ' || city || ' ' || bio));
create index if not exists idx_bookings_user_id on public.bookings(user_id);
create index if not exists idx_bookings_worker_id on public.bookings(worker_id);
create index if not exists idx_bookings_category_id on public.bookings(category_id);
create index if not exists idx_reviews_booking_id on public.reviews(booking_id);

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid() and is_blocked = false;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    left join public.admins a on a.user_id = u.id
    where u.id = auth.uid()
      and u.is_blocked = false
      and (u.role = 'admin' or a.user_id is not null)
  );
$$;

alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.workers enable row level security;
alter table public.bookings enable row level security;
alter table public.reviews enable row level security;
alter table public.admins enable row level security;

drop policy if exists "users_select_own_or_admin" on public.users;
create policy "users_select_own_or_admin"
on public.users for select
using (id = auth.uid() or public.is_admin());

drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own"
on public.users for insert
with check (id = auth.uid());

drop policy if exists "users_update_own_or_admin" on public.users;
create policy "users_update_own_or_admin"
on public.users for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read"
on public.categories for select
using (true);

drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write"
on public.categories for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "workers_public_read_approved" on public.workers;
create policy "workers_public_read_approved"
on public.workers for select
using (status = 'approved' or user_id = auth.uid() or public.is_admin());

drop policy if exists "workers_insert_own" on public.workers;
create policy "workers_insert_own"
on public.workers for insert
with check (user_id = auth.uid() and public.current_user_role() in ('worker', 'admin'));

drop policy if exists "workers_update_own_or_admin" on public.workers;
create policy "workers_update_own_or_admin"
on public.workers for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "bookings_select_involved_or_admin" on public.bookings;
create policy "bookings_select_involved_or_admin"
on public.bookings for select
using (
  user_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.workers w
    where w.id = bookings.worker_id and w.user_id = auth.uid()
  )
);

drop policy if exists "bookings_insert_customer_own" on public.bookings;
create policy "bookings_insert_customer_own"
on public.bookings for insert
with check (user_id = auth.uid() and coalesce(public.current_user_role(), 'customer') in ('customer', 'admin'));

drop policy if exists "bookings_update_involved_or_admin" on public.bookings;
create policy "bookings_update_involved_or_admin"
on public.bookings for update
using (
  public.is_admin()
  or user_id = auth.uid()
  or exists (
    select 1 from public.workers w
    where w.id = bookings.worker_id and w.user_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or user_id = auth.uid()
  or exists (
    select 1 from public.workers w
    where w.id = bookings.worker_id and w.user_id = auth.uid()
  )
);

drop policy if exists "reviews_select_visible" on public.reviews;
create policy "reviews_select_visible"
on public.reviews for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.bookings b
    join public.workers w on w.id = b.worker_id
    where b.id = reviews.booking_id
      and (b.user_id = auth.uid() or w.user_id = auth.uid() or w.status = 'approved')
  )
);

drop policy if exists "reviews_insert_customer_completed_booking" on public.reviews;
create policy "reviews_insert_customer_completed_booking"
on public.reviews for insert
with check (
  exists (
    select 1 from public.bookings b
    where b.id = reviews.booking_id
      and b.user_id = auth.uid()
      and b.status = 'completed'
  )
);

drop policy if exists "reviews_admin_update" on public.reviews;
create policy "reviews_admin_update"
on public.reviews for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins_admin_read" on public.admins;
create policy "admins_admin_read"
on public.admins for select
using (public.is_admin() or user_id = auth.uid());

drop policy if exists "admins_admin_write" on public.admins;
create policy "admins_admin_write"
on public.admins for all
using (public.is_admin())
with check (public.is_admin());
