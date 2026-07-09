-- Run this after creating/signing up with your admin email in Supabase Auth.
-- Replace CHANGE_ADMIN_EMAIL@example.com before running this file.
-- Password is managed by Supabase Auth, not stored in public tables or SQL.
-- This creates/updates the public profile row, then grants admin access.

insert into public.users (id, name, email, role, is_blocked)
select
  au.id,
  coalesce(au.raw_user_meta_data->>'full_name', 'KaamNest Admin'),
  au.email,
  'admin',
  false
from auth.users au
where au.email = 'CHANGE_ADMIN_EMAIL@example.com'
on conflict (id) do update
set
  name = excluded.name,
  email = excluded.email,
  role = 'admin',
  is_blocked = false;

insert into public.admins (user_id)
select id
from public.users
where email = 'CHANGE_ADMIN_EMAIL@example.com'
on conflict (user_id) do nothing;
