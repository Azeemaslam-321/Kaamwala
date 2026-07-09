-- KaamNest security hardening.
-- Run after 001 and 008. This closes role/status/payment tampering gaps that RLS alone cannot express.

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

create or replace function public.guard_users_protected_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.current_user_is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.id <> auth.uid() then
      raise exception 'Users can only create their own profile';
    end if;
    if new.role = 'admin' then
      raise exception 'Admin role can only be granted by an existing admin/backend';
    end if;
    new.is_blocked := false;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.id <> auth.uid() then
      raise exception 'Users can only update their own profile';
    end if;
    if new.role is distinct from old.role
      or new.is_blocked is distinct from old.is_blocked
      or new.id is distinct from old.id
      or new.created_at is distinct from old.created_at then
      raise exception 'Protected user fields cannot be changed by non-admin users';
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_users_protected_fields on public.users;
create trigger guard_users_protected_fields
before insert or update on public.users
for each row execute function public.guard_users_protected_fields();

create or replace function public.guard_workers_protected_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.current_user_is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.user_id <> auth.uid() then
      raise exception 'Workers can only create their own profile';
    end if;
    new.status := 'pending';
    new.verified := false;
    new.rating := 0;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'workers' and column_name = 'verification_status') then
      new.verification_status := 'pending';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.user_id <> auth.uid() then
      raise exception 'Workers can only update their own profile';
    end if;
    if new.user_id is distinct from old.user_id
      or new.status is distinct from old.status
      or new.verified is distinct from old.verified
      or new.rating is distinct from old.rating
      or new.created_at is distinct from old.created_at then
      raise exception 'Worker verification fields can only be changed by admin';
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'workers' and column_name = 'verification_status')
      and new.verification_status is distinct from old.verification_status then
      raise exception 'Worker verification status can only be changed by admin';
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_workers_protected_fields on public.workers;
create trigger guard_workers_protected_fields
before insert or update on public.workers
for each row execute function public.guard_workers_protected_fields();

create or replace function public.service_min_price(service_name_input text, service_id_input uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((
    select greatest(0, estimated_price_min)::integer
    from public.services
    where (service_id_input is not null and id = service_id_input)
       or (service_name_input is not null and lower(name) = lower(service_name_input))
    order by case when service_id_input is not null and id = service_id_input then 0 else 1 end
    limit 1
  ), 0);
$$;

create or replace function public.guard_bookings_protected_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owns_worker boolean;
  safe_amount integer;
begin
  if auth.uid() is null or public.current_user_is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.user_id <> auth.uid() then
      raise exception 'Customers can only create their own bookings';
    end if;
    safe_amount := public.service_min_price(new.service_name, new.service_id);
    new.status := 'pending';
    new.worker_id := null;
    new.amount := safe_amount;
    new.estimated_price := safe_amount;
    new.final_price := null;
    new.payment_status := 'cash_on_service';
    return new;
  end if;

  if tg_op = 'UPDATE' then
    select exists (
      select 1 from public.workers w
      where w.id = old.worker_id and w.user_id = auth.uid()
    ) into owns_worker;

    if old.user_id = auth.uid() and not owns_worker then
      if new.status is distinct from old.status and new.status <> 'cancelled' then
        raise exception 'Customers can only cancel their own booking';
      end if;
      if new.worker_id is distinct from old.worker_id
        or new.amount is distinct from old.amount
        or new.estimated_price is distinct from old.estimated_price
        or new.final_price is distinct from old.final_price
        or new.payment_status is distinct from old.payment_status then
        raise exception 'Booking assignment, amount and payment fields are protected';
      end if;
      return new;
    end if;

    if owns_worker then
      if new.status not in ('accepted', 'on_the_way', 'in_progress', 'completed') then
        raise exception 'Worker cannot set this booking status';
      end if;
      if new.user_id is distinct from old.user_id
        or new.worker_id is distinct from old.worker_id
        or new.amount is distinct from old.amount
        or new.estimated_price is distinct from old.estimated_price
        or new.final_price is distinct from old.final_price
        or new.payment_status is distinct from old.payment_status then
        raise exception 'Workers can only update service progress status';
      end if;
      return new;
    end if;

    raise exception 'Not allowed to update this booking';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_bookings_protected_fields on public.bookings;
create trigger guard_bookings_protected_fields
before insert or update on public.bookings
for each row execute function public.guard_bookings_protected_fields();

drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own"
on public.users for insert
with check (public.current_user_is_admin() or (id = auth.uid() and role in ('customer', 'worker')));

drop policy if exists "users_update_own_or_admin" on public.users;
create policy "users_update_own_or_admin"
on public.users for update
using (id = auth.uid() or public.current_user_is_admin())
with check (id = auth.uid() or public.current_user_is_admin());

drop policy if exists "workers_insert_own" on public.workers;
create policy "workers_insert_own"
on public.workers for insert
with check (
  public.current_user_is_admin()
  or (user_id = auth.uid() and public.current_user_role() in ('worker', 'admin') and status = 'pending' and verified = false)
);

drop policy if exists "workers_update_own_or_admin" on public.workers;
create policy "workers_update_own_or_admin"
on public.workers for update
using (user_id = auth.uid() or public.current_user_is_admin())
with check (user_id = auth.uid() or public.current_user_is_admin());

drop policy if exists "bookings_insert_customer_own" on public.bookings;
create policy "bookings_insert_customer_own"
on public.bookings for insert
with check (user_id = auth.uid() and coalesce(public.current_user_role(), 'customer') in ('customer', 'admin'));

drop policy if exists "bookings_update_involved_or_admin" on public.bookings;
create policy "bookings_update_involved_or_admin"
on public.bookings for update
using (
  public.current_user_is_admin()
  or user_id = auth.uid()
  or exists (
    select 1 from public.workers w
    where w.id = bookings.worker_id and w.user_id = auth.uid()
  )
)
with check (
  public.current_user_is_admin()
  or user_id = auth.uid()
  or exists (
    select 1 from public.workers w
    where w.id = bookings.worker_id and w.user_id = auth.uid()
  )
);
