-- Run this after creating/signing up with azeemaslam761@gmail.com in Supabase Auth.
-- Password is managed by Supabase Auth, not stored in public tables or SQL.
-- This creates/updates the public profile row, then grants admin access.

insert into public.users (id, name, email, role, is_blocked)
select
  au.id,
  coalesce(au.raw_user_meta_data->>'full_name', 'Azeem Aslam'),
  au.email,
  'admin',
  false
from auth.users au
where au.email = 'azeemaslam761@gmail.com'
on conflict (id) do update
set
  name = excluded.name,
  email = excluded.email,
  role = 'admin',
  is_blocked = false;

insert into public.admins (user_id)
select id
from public.users
where email = 'azeemaslam761@gmail.com'
on conflict (user_id) do nothing;
