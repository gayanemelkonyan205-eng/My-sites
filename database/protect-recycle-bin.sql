create or replace function app_private.protect_content_deletion()
returns trigger language plpgsql security invoker set search_path = ''
as $function$
begin
  if current_user = 'postgres' then return new; end if;
  if new.deleted_at is distinct from old.deleted_at then
    raise exception 'Use the moderated content RPC for deletion or restoration';
  end if;
  return new;
end;
$function$;

create trigger protect_announcements_deletion before update on public.announcements for each row execute function app_private.protect_content_deletion();
create trigger protect_events_deletion before update on public.events for each row execute function app_private.protect_content_deletion();
create trigger protect_homework_deletion before update on public.homework for each row execute function app_private.protect_content_deletion();
create trigger protect_board_posts_deletion before update on public.board_posts for each row execute function app_private.protect_content_deletion();
create trigger protect_class_files_deletion before update on public.class_files for each row execute function app_private.protect_content_deletion();
create trigger protect_polls_deletion before update on public.polls for each row execute function app_private.protect_content_deletion();

alter policy announcements_admin_delete on public.announcements using (false);
alter policy events_admin_delete on public.events using (false);
alter policy homework_admin_delete on public.homework using (false);
alter policy board_posts_admin_delete on public.board_posts using (false);
alter policy class_files_admin_delete on public.class_files using (false);
alter policy polls_admin_delete on public.polls using (false);
