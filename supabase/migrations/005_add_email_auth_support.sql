-- Run this if you already created tables before switching from phone OTP to email OTP.

alter table public.users
  add column if not exists email text;

alter table public.workers
  add column if not exists email text;

update public.users
set email = coalesce(email, id::text || '@placeholder.kaamwala.local')
where email is null;

update public.workers w
set email = coalesce(w.email, u.email)
from public.users u
where w.user_id = u.id
  and w.email is null;

alter table public.users
  alter column email set not null;

alter table public.workers
  alter column email set not null;

do $$ begin
  alter table public.users
    add constraint users_email_key unique (email);
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter table public.users
    add constraint users_email_check check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter table public.workers
    add constraint workers_email_check check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$');
exception
  when duplicate_object then null;
end $$;

alter table public.users
  alter column phone drop not null;

alter table public.workers
  alter column phone drop not null;
