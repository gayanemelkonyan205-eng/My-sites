-- Keep moderation reversible. The actor must be an active SUPER_ADMIN in the
-- existing private role lookup; client-side button visibility is not authority.
create or replace function public.admin_delete_message(p_message_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  message_row public.messages%rowtype;
begin
  if actor_id is null or not app_private.is_super_admin() then return false; end if;
  select * into message_row from public.messages where id = p_message_id for update;
  if not found or message_row.deleted_at is not null then return false; end if;

  update public.messages set deleted_at = now() where id = p_message_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values(actor_id, 'message.moderated_delete', 'message', p_message_id::text,
         jsonb_build_object('conversation_id', message_row.conversation_id,
                            'sender_id', message_row.sender_id));
  return true;
end;
$function$;

revoke all on function public.admin_delete_message(uuid) from public, anon;
grant execute on function public.admin_delete_message(uuid) to authenticated;
