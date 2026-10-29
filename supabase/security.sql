-- Hidden Cost Calculator: database hardening (checklist items 2.1 - 2.5).
-- Run in the Supabase SQL Editor, then run the verification queries at the bottom.
-- Safe to re-run. Nothing here deletes rows. Mirrors the limits in lib/validate-property.ts.

-- 0    Columns the app writes that older copies of the table may not have yet (safe if they exist).
alter table public.properties add column if not exists carpet_area_sqft numeric;
alter table public.properties add column if not exists bhk numeric;

-- 0b   Deleting an account should delete its properties (checklist 10.4). The original foreign key had
--      no ON DELETE action, so account deletion would be blocked by saved rows.
alter table public.properties drop constraint if exists properties_user_id_fkey;
alter table public.properties add constraint properties_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;

-- 2.1  Row Level Security on.
alter table public.properties enable row level security;
alter table public.properties force row level security;

-- 2.2  Replace every existing policy with four strict ones: signed-in owner only, never anon.
do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'properties' loop
    execute format('drop policy %I on public.properties', pol.policyname);
  end loop;
end $$;

create policy "Users can read own properties"
  on public.properties for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own properties"
  on public.properties for insert to authenticated
  with check (auth.uid() = user_id);

-- Both clauses matter: without WITH CHECK a user could re-assign their row to someone else.
create policy "Users can update own properties"
  on public.properties for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own properties"
  on public.properties for delete to authenticated
  using (auth.uid() = user_id);

-- Belt and braces: the anon role gets no table privileges at all.
revoke all on public.properties from anon;

-- 2.3  user_id comes from the session, not from the client.
alter table public.properties alter column user_id set default auth.uid();
alter table public.properties alter column user_id set not null;

-- 2.4  Constraints as the last line of defence. NOT VALID = applies to new/changed rows
--      immediately without failing on old data; the VALIDATE lines then check old rows too
--      (if one fails, fix or delete that row, then re-run).
alter table public.properties drop constraint if exists properties_sane_values;
alter table public.properties add constraint properties_sane_values check (
      coalesce(rent, 0)              between 0 and 10000000
  and coalesce(maintenance, 0)       between 0 and 10000000
  and coalesce(parking, 0)           between 0 and 10000000
  and coalesce(deposit, 0)           between 0 and 10000000
  and coalesce(brokerage, 0)         between 0 and 10000000
  and coalesce(furnishing, 0)        between 0 and 10000000
  and coalesce(moving, 0)            between 0 and 10000000
  and coalesce(agreement_charges, 0) between 0 and 10000000
  and coalesce(utilities, 0)         between 0 and 10000000
  and coalesce(true_monthly_cost, 0) between 0 and 1000000000
  and coalesce(cost_per_person, 0)   between 0 and 1000000000
  and coalesce(cost_per_km, 0)       between 0 and 1000
  and coalesce(commute_distance_km, 0) between 0 and 500
  and coalesce(carpet_area_sqft, 0)  between 0 and 100000
  and coalesce(bhk, 0)               between 0 and 20
  and (stay_months is null or stay_months between 1 and 120)
  and (number_of_people is null or number_of_people between 1 and 20)
  and (property_name is null or char_length(property_name) <= 100)
  and (city is null or char_length(city) <= 60)
) not valid;
alter table public.properties validate constraint properties_sane_values;

-- 2.5  At most 50 saved properties per user (a trigger, so it also covers direct REST calls).
create or replace function public.enforce_property_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.properties where user_id = new.user_id) >= 50 then
    raise exception 'Property limit reached (50)' using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists properties_limit on public.properties;
create trigger properties_limit before insert on public.properties
  for each row execute function public.enforce_property_limit();

-- ---------------------------------------------------------------------------
-- Verification (run separately; paste the results back if anything looks off)
-- ---------------------------------------------------------------------------
-- select tablename, rowsecurity from pg_tables where schemaname = 'public';             -- every row: true
-- select policyname, cmd, roles, qual, with_check from pg_policies where tablename = 'properties';
-- select conname from pg_constraint where conrelid = 'public.properties'::regclass;     -- includes properties_sane_values
-- select column_default from information_schema.columns
--   where table_name = 'properties' and column_name = 'user_id';                         -- auth.uid()
-- on delete cascade (10.4): select confdeltype from pg_constraint
--   where conrelid = 'public.properties'::regclass and contype = 'f';                   -- 'c' = cascade
