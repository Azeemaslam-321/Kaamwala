-- KaamNest professional schema upgrade.
-- Run after earlier migrations. It keeps existing public.users/workers/bookings compatible.

alter type public.booking_status add value if not exists 'accepted';
alter type public.booking_status add value if not exists 'assigned';
alter type public.booking_status add value if not exists 'on_the_way';

create or replace function public.current_user_is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
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

alter table public.users
  add column if not exists area text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.workers
  add column if not exists area text,
  add column if not exists experience_years integer not null default 0,
  add column if not exists service_areas text,
  add column if not exists availability_status text not null default 'available',
  add column if not exists verification_status text not null default 'pending',
  add column if not exists average_rating numeric(3,2) not null default 0,
  add column if not exists total_jobs integer not null default 0,
  add column if not exists profile_photo text,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.service_areas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  city text not null default 'Lucknow',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null unique,
  slug text not null unique,
  description text,
  base_price numeric(10,2) not null default 0,
  estimated_price_min numeric(10,2) not null default 0,
  estimated_price_max numeric(10,2) not null default 0,
  icon text not null default 'wrench',
  image text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.worker_service_areas (
  worker_id uuid references public.workers(id) on delete cascade,
  area_id uuid references public.service_areas(id) on delete cascade,
  primary key (worker_id, area_id)
);

alter table public.bookings
  add column if not exists service_id uuid references public.services(id) on delete set null,
  add column if not exists service_name text,
  add column if not exists area text,
  add column if not exists address text,
  add column if not exists notes text,
  add column if not exists image_url text,
  add column if not exists estimated_price numeric(10,2),
  add column if not exists final_price numeric(10,2),
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.booking_status_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  status text not null,
  changed_by uuid references public.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  amount numeric(10,2) not null default 0,
  status text not null default 'unpaid',
  provider text not null default 'placeholder',
  provider_order_id text,
  provider_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_type text not null default 'flat',
  discount_value numeric(10,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  title text not null,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_queries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  mobile text,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.worker_documents (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid references public.workers(id) on delete cascade,
  document_type text not null,
  document_url text,
  verification_status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references public.users(id) on delete set null,
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.service_areas enable row level security;
alter table public.services enable row level security;
alter table public.worker_service_areas enable row level security;
alter table public.booking_status_history enable row level security;
alter table public.payments enable row level security;
alter table public.coupons enable row level security;
alter table public.notifications enable row level security;
alter table public.blog_posts enable row level security;
alter table public.contact_queries enable row level security;
alter table public.worker_documents enable row level security;
alter table public.settings enable row level security;
alter table public.admin_audit_logs enable row level security;

drop policy if exists "public_services_read" on public.services;
create policy "public_services_read" on public.services for select using (is_active = true or public.current_user_is_admin());
drop policy if exists "admin_services_write" on public.services;
create policy "admin_services_write" on public.services for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

drop policy if exists "public_areas_read" on public.service_areas;
create policy "public_areas_read" on public.service_areas for select using (is_active = true or public.current_user_is_admin());
drop policy if exists "admin_areas_write" on public.service_areas;
create policy "admin_areas_write" on public.service_areas for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

drop policy if exists "contact_insert_public" on public.contact_queries;
create policy "contact_insert_public" on public.contact_queries for insert with check (true);
drop policy if exists "contact_admin_read" on public.contact_queries;
create policy "contact_admin_read" on public.contact_queries for select using (public.current_user_is_admin());

drop policy if exists "notifications_own_read" on public.notifications;
create policy "notifications_own_read" on public.notifications for select using (user_id = auth.uid() or public.current_user_is_admin());

drop policy if exists "admin_all_payments" on public.payments;
create policy "admin_all_payments" on public.payments for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

drop policy if exists "booking_history_related_read" on public.booking_status_history;
create policy "booking_history_related_read"
on public.booking_status_history for select
using (
  public.current_user_is_admin()
  or exists (
    select 1 from public.bookings b
    left join public.workers w on w.id = b.worker_id
    where b.id = booking_id and (b.user_id = auth.uid() or w.user_id = auth.uid())
  )
);

create index if not exists idx_services_slug on public.services(slug);
create index if not exists idx_service_areas_slug on public.service_areas(slug);
create index if not exists idx_bookings_area_status on public.bookings(area, status);
create index if not exists idx_workers_area_category on public.workers(area, category);
