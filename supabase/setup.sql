-- Run in the SQL Editor of a NEW Pinehurst Supabase project.
-- Do not run this in the Scotland project. No service-role key belongs in the website.
begin;
create schema if not exists pinehurst_private;
revoke all on schema pinehurst_private from public, anon, authenticated;
create table if not exists pinehurst_private.members (
 email text primary key check (email=lower(email))
);
revoke all on pinehurst_private.members from public, anon, authenticated;

-- Add members in the Supabase SQL Editor, not in the public repository:
-- insert into pinehurst_private.members(email)
-- values (lower('MEMBER_EMAIL_HERE')) on conflict do nothing;
-- Existing memberships are preserved when this script is rerun.


create table if not exists public.pinehurst_fields (
 path text[] primary key,
 value jsonb,
 deleted boolean not null default false,
 version bigint not null default 1,
 updated_at timestamptz not null default now(),
 updated_by uuid not null
);
alter table public.pinehurst_fields enable row level security;
revoke all on public.pinehurst_fields from public, anon, authenticated;

create or replace function public.pinehurst_is_member()
returns boolean language sql stable security definer
set search_path=pg_catalog,public
as $$
 select auth.uid() is not null and exists(
  select 1 from pinehurst_private.members where email=lower(auth.jwt()->>'email')
 );
$$;
revoke all on function public.pinehurst_is_member() from public,anon;
grant execute on function public.pinehurst_is_member() to authenticated;

drop policy if exists pinehurst_member_read on public.pinehurst_fields;
create policy pinehurst_member_read on public.pinehurst_fields for select to authenticated
using(public.pinehurst_is_member());
grant select on public.pinehurst_fields to authenticated;

create or replace function public.pinehurst_read()
returns setof public.pinehurst_fields language plpgsql security definer
set search_path=pg_catalog,public
as $$
begin
 if not public.pinehurst_is_member() then raise exception 'Accès réservé aux membres du voyage.' using errcode='42501'; end if;
 return query select * from public.pinehurst_fields;
end;
$$;
revoke all on function public.pinehurst_read() from public,anon;
grant execute on function public.pinehurst_read() to authenticated;

create or replace function public.pinehurst_apply(p_changes jsonb)
returns setof public.pinehurst_fields language plpgsql security definer
set search_path=pg_catalog,public
as $$
declare
 item jsonb; target text[]; current_version bigint; expected bigint;
 -- Validation and writes are serialized for this single trip.
begin
 if not public.pinehurst_is_member() then raise exception 'Accès réservé aux membres du voyage.' using errcode='42501'; end if;
 if jsonb_typeof(p_changes) is distinct from 'array' or jsonb_array_length(p_changes)>5000 or octet_length(p_changes::text)>1048576 then
  raise exception 'Lot de modifications invalide.' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(2027,1318);
 for item in select * from jsonb_array_elements(p_changes) loop
  if jsonb_typeof(item->'path') is distinct from 'array' then raise exception 'Chemin invalide.' using errcode='22023'; end if;
  select array_agg(v) into target from jsonb_array_elements_text(item->'path') as t(v);
  if coalesce(cardinality(target),0) not between 1 and 8
     or target[1] not in ('selected','scores','packed','notes','rounds','cup','passports','chronicle','competitionReady')
     or target && array['__proto__','constructor','prototype']
     or exists(select 1 from unnest(target) v where length(v) not between 1 and 200 or v ~ '[[:cntrl:]]')
     or not (item ? 'value') or jsonb_typeof(item->'deleted') is distinct from 'boolean'
  then raise exception 'Champ invalide.' using errcode='22023'; end if;
  if item->'expectedVersion' is not null and item->'expectedVersion'<>'null'::jsonb and jsonb_typeof(item->'expectedVersion')<>'number' then raise exception 'Version invalide.' using errcode='22023'; end if;
  expected=(item->>'expectedVersion')::bigint;
  select version into current_version from public.pinehurst_fields where path=target;
  if current_version is distinct from expected then raise exception 'Un autre appareil a modifié le même champ.' using errcode='P0001'; end if;
 end loop;
 for item in select * from jsonb_array_elements(p_changes) loop
  select array_agg(v) into target from jsonb_array_elements_text(item->'path') as t(v);
  return query
   insert into public.pinehurst_fields as f(path,value,deleted,version,updated_by)
    values(target,item->'value',(item->>'deleted')::boolean,1,auth.uid())
   on conflict(path) do update set value=excluded.value,deleted=excluded.deleted,version=f.version+1,updated_at=now(),updated_by=auth.uid()
   returning f.*;
 end loop;
end;
$$;
revoke all on function public.pinehurst_apply(jsonb) from public,anon;
grant execute on function public.pinehurst_apply(jsonb) to authenticated;
commit;
