alter table public.subjects add column if not exists icon text;
alter table public.subjects add column if not exists color text;
alter table public.subjects add column if not exists is_active boolean not null default true;
alter table public.subjects add column if not exists display_order integer not null default 0;

create or replace function public.update_my_profile_safe(
  p_first_name text,
  p_last_name text,
  p_username text,
  p_bio text default null
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  clean_first text := btrim(coalesce(p_first_name,''));
  clean_last text := btrim(coalesce(p_last_name,''));
  clean_username text := btrim(coalesce(p_username,''));
begin
  if uid is null or not app_private.is_active_user() then return false; end if;
  if char_length(clean_first) not between 1 and 60 then return false; end if;
  if char_length(clean_last) not between 1 and 60 then return false; end if;
  if char_length(clean_username) not between 3 and 32 then return false; end if;
  if clean_username ~ '[[:space:][:cntrl:]]' then return false; end if;
  if p_bio is not null and char_length(p_bio) > 500 then return false; end if;
  update public.profiles
     set first_name = clean_first,
         last_name = clean_last,
         username = clean_username,
         bio = nullif(btrim(coalesce(p_bio,'')),''),
         updated_at = now()
   where id = uid;
  return found;
end;
$$;

create or replace function public.admin_create_subject(
  p_name text,
  p_short_name text default null,
  p_icon text default null,
  p_color text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  new_id uuid;
  clean_name text := btrim(coalesce(p_name,''));
  clean_short text := nullif(btrim(coalesce(p_short_name,'')),'');
begin
  if app_private.current_role() not in ('ADMIN','SUPER_ADMIN') then return null; end if;
  if char_length(clean_name) not between 2 and 80 then return null; end if;
  if clean_short is not null and char_length(clean_short) > 24 then return null; end if;
  if p_color is not null and p_color !~ '^#[0-9A-Fa-f]{6}$' then return null; end if;
  if p_icon is not null and char_length(p_icon) > 16 then return null; end if;
  insert into public.subjects(name,short_name,icon,color,is_active,display_order)
  values(clean_name,clean_short,nullif(p_icon,''),nullif(p_color,''),true,coalesce((select max(display_order)+1 from public.subjects),0))
  returning id into new_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(uid,'subject.created','subject',new_id::text,jsonb_build_object('name',clean_name));
  return new_id;
end;
$$;

create or replace function public.admin_update_subject(
  p_id uuid,
  p_name text,
  p_short_name text default null,
  p_icon text default null,
  p_color text default null,
  p_is_active boolean default true,
  p_display_order integer default 0
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  clean_name text := btrim(coalesce(p_name,''));
  clean_short text := nullif(btrim(coalesce(p_short_name,'')),'');
begin
  if app_private.current_role() not in ('ADMIN','SUPER_ADMIN') then return false; end if;
  if p_id is null or char_length(clean_name) not between 2 and 80 then return false; end if;
  if clean_short is not null and char_length(clean_short) > 24 then return false; end if;
  if p_color is not null and p_color !~ '^#[0-9A-Fa-f]{6}$' then return false; end if;
  if p_icon is not null and char_length(p_icon) > 16 then return false; end if;
  update public.subjects
     set name=clean_name,
         short_name=clean_short,
         icon=nullif(p_icon,''),
         color=nullif(p_color,''),
         is_active=coalesce(p_is_active,true),
         display_order=greatest(coalesce(p_display_order,0),0),
         updated_at=now()
   where id=p_id;
  if not found then return false; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(uid,'subject.updated','subject',p_id::text,jsonb_build_object('name',clean_name,'active',p_is_active,'order',p_display_order));
  return true;
end;
$$;

revoke all on function public.update_my_profile_safe(text,text,text,text) from public, anon;
revoke all on function public.admin_create_subject(text,text,text,text) from public, anon;
revoke all on function public.admin_update_subject(uuid,text,text,text,text,boolean,integer) from public, anon;
grant execute on function public.update_my_profile_safe(text,text,text,text) to authenticated;
grant execute on function public.admin_create_subject(text,text,text,text) to authenticated;
grant execute on function public.admin_update_subject(uuid,text,text,text,text,boolean,integer) to authenticated;
