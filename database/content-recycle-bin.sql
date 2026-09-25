-- Soft deletion keeps content and dependent records recoverable.
alter table public.announcements add column if not exists deleted_at timestamptz;
alter table public.events add column if not exists deleted_at timestamptz;
alter table public.homework add column if not exists deleted_at timestamptz;
alter table public.board_posts add column if not exists deleted_at timestamptz;
alter table public.class_files add column if not exists deleted_at timestamptz;
alter table public.polls add column if not exists deleted_at timestamptz;

alter policy announcements_read on public.announcements using (app_private.is_active_user() and (deleted_at is null or app_private.is_super_admin()));
alter policy events_read on public.events using (app_private.is_active_user() and (deleted_at is null or app_private.is_super_admin()));
alter policy homework_read on public.homework using (app_private.is_active_user() and (deleted_at is null or app_private.is_super_admin()));
alter policy board_posts_read on public.board_posts using (app_private.is_active_user() and (deleted_at is null or app_private.is_super_admin()));
alter policy class_files_read on public.class_files using (app_private.is_active_user() and (deleted_at is null or app_private.is_super_admin()));
alter policy polls_read on public.polls using (app_private.is_active_user() and (deleted_at is null or app_private.is_super_admin()));

create or replace function public.admin_soft_delete_content(p_entity text, p_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $function$
declare actor_id uuid := (select auth.uid()); changed integer;
begin
  if actor_id is null or not app_private.is_admin() then return false; end if;
  if p_entity not in ('announcements','events','homework','board_posts','class_files','polls') then return false; end if;
  execute format('update public.%I set deleted_at = now() where id = $1 and deleted_at is null',p_entity) using p_id;
  get diagnostics changed = row_count;
  if changed <> 1 then return false; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(actor_id,'content.soft_delete',p_entity,p_id::text,'{}'::jsonb);
  return true;
end;
$function$;

create or replace function public.super_admin_restore_content(p_entity text, p_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $function$
declare actor_id uuid := (select auth.uid()); changed integer;
begin
  if actor_id is null or not app_private.is_super_admin() then return false; end if;
  if p_entity not in ('announcements','events','homework','board_posts','class_files','polls') then return false; end if;
  execute format('update public.%I set deleted_at = null where id = $1 and deleted_at is not null',p_entity) using p_id;
  get diagnostics changed = row_count;
  if changed <> 1 then return false; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(actor_id,'content.restored',p_entity,p_id::text,'{}'::jsonb);
  return true;
end;
$function$;

revoke all on function public.admin_soft_delete_content(text,uuid) from public, anon;
revoke all on function public.super_admin_restore_content(text,uuid) from public, anon;
grant execute on function public.admin_soft_delete_content(text,uuid) to authenticated;
grant execute on function public.super_admin_restore_content(text,uuid) to authenticated;
