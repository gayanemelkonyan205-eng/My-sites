alter policy conversations_read_member on public.conversations
using (app_private.is_conversation_member(id) or app_private.is_super_admin());

alter policy conversation_members_read_member on public.conversation_members
using (app_private.is_conversation_member(conversation_id) or app_private.is_super_admin());

alter policy messages_read_member on public.messages
using ((deleted_at is null and app_private.is_conversation_member(conversation_id)) or app_private.is_super_admin());

alter policy pinned_messages_read_member on public.pinned_messages
using (app_private.is_conversation_member(conversation_id) or app_private.is_super_admin());

alter policy reactions_read_member on public.message_reactions
using (exists(select 1 from public.messages m where m.id=message_reactions.message_id and (app_private.is_conversation_member(m.conversation_id) or app_private.is_super_admin())));

create or replace function public.delete_message(p_message_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $function$
declare actor_id uuid := (select auth.uid()); row_message public.messages%rowtype;
begin
  if actor_id is null or not app_private.is_active_user() then return false; end if;
  select * into row_message from public.messages where id=p_message_id for update;
  if not found or row_message.deleted_at is not null then return false; end if;
  if row_message.sender_id is distinct from actor_id or not app_private.is_conversation_member(row_message.conversation_id) then return false; end if;
  update public.messages set deleted_at=now() where id=p_message_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(actor_id,'message.delete_own','message',p_message_id::text,jsonb_build_object('conversation_id',row_message.conversation_id));
  return true;
end;
$function$;

create or replace function public.super_admin_restore_message(p_message_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $function$
declare actor_id uuid := (select auth.uid()); changed integer;
begin
  if actor_id is null or not app_private.is_super_admin() then return false; end if;
  update public.messages set deleted_at=null where id=p_message_id and deleted_at is not null;
  get diagnostics changed = row_count;
  if changed<>1 then return false; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(actor_id,'message.restored','message',p_message_id::text,'{}'::jsonb);
  return true;
end;
$function$;
