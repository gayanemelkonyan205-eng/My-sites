create or replace function public.admin_pin_message(p_message_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $function$
declare actor_id uuid := (select auth.uid()); cid uuid;
begin
  if actor_id is null or app_private.current_role() not in ('ADMIN','SUPER_ADMIN') then return false; end if;
  select conversation_id into cid from public.messages where id=p_message_id and deleted_at is null;
  if cid is null or (not app_private.is_super_admin() and not app_private.is_conversation_member(cid)) then return false; end if;
  insert into public.pinned_messages(conversation_id,message_id,pinned_by)
  values(cid,p_message_id,actor_id)
  on conflict(conversation_id,message_id) do update set pinned_by=excluded.pinned_by,pinned_at=now();
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(actor_id,'message.pinned','message',p_message_id::text,jsonb_build_object('conversation_id',cid));
  return true;
end;
$function$;

create or replace function public.admin_unpin_message(p_message_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $function$
declare actor_id uuid := (select auth.uid()); cid uuid; changed integer;
begin
  if actor_id is null or app_private.current_role() not in ('ADMIN','SUPER_ADMIN') then return false; end if;
  select conversation_id into cid from public.pinned_messages where message_id=p_message_id;
  if cid is null or (not app_private.is_super_admin() and not app_private.is_conversation_member(cid)) then return false; end if;
  delete from public.pinned_messages where message_id=p_message_id;
  get diagnostics changed = row_count;
  if changed<>1 then return false; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(actor_id,'message.unpinned','message',p_message_id::text,jsonb_build_object('conversation_id',cid));
  return true;
end;
$function$;
