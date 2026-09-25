create or replace function public.super_admin_delete_entity(p_entity_type text,p_entity_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $function$
begin
  if not app_private.is_super_admin() then return false; end if;
  if p_entity_type='messages' then
    return public.admin_delete_message(p_entity_id);
  end if;
  if p_entity_type in ('announcements','events','homework','board_posts','class_files','polls') then
    return public.admin_soft_delete_content(p_entity_type,p_entity_id);
  end if;
  return false;
end;
$function$;
revoke all on function public.super_admin_delete_entity(text,uuid) from public,anon;
grant execute on function public.super_admin_delete_entity(text,uuid) to authenticated;
