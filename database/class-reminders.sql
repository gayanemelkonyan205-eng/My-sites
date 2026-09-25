-- Personal in-portal notification choices. Missing rows retain the default opt-in.
create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  schedule_alerts boolean not null default true,
  homework_reminders boolean not null default true
);
alter table public.notification_preferences enable row level security;
revoke all on public.notification_preferences from public, anon, authenticated;
grant select on public.notification_preferences to authenticated;
grant insert (user_id, schedule_alerts, homework_reminders) on public.notification_preferences to authenticated;
grant update (schedule_alerts, homework_reminders) on public.notification_preferences to authenticated;
create policy notification_preferences_read on public.notification_preferences for select to authenticated
  using (app_private.is_active_user() and user_id = (select auth.uid()));
create policy notification_preferences_insert on public.notification_preferences for insert to authenticated
  with check (app_private.is_active_user() and user_id = (select auth.uid()));
create policy notification_preferences_update on public.notification_preferences for update to authenticated
  using (app_private.is_active_user() and user_id = (select auth.uid()))
  with check (app_private.is_active_user() and user_id = (select auth.uid()));

create or replace function app_private.notify_schedule_change()
returns trigger language plpgsql security definer set search_path = '' as $function$
declare
  change_date date;
  lesson smallint;
  change_id uuid;
  alert_text text;
begin
  if tg_op = 'DELETE' then
    change_date := old.class_date;
    lesson := old.lesson_number;
    change_id := old.id;
  else
    change_date := new.class_date;
    lesson := new.lesson_number;
    change_id := new.id;
  end if;
  alert_text := case
    when tg_op = 'DELETE' then 'Օրվա փոփոխությունը հեռացվել է․ սովորական դասացուցակը վերականգնվել է։'
    when new.kind = 'CANCELLED' then 'Դասը չեղարկվել է։'
    when new.kind = 'ADDED' then 'Ավելացվել է նոր դաս։'
    else 'Դասի տվյալները փոխվել են։'
  end;
  insert into public.notifications(user_id, kind, title, body, href)
  select p.id, 'SCHEDULE_CHANGE', 'Դասացուցակի փոփոխություն',
    change_date::text || ' · ' || lesson::text || '-րդ դաս · ' || alert_text,
    '/schedule?date=' || change_date::text
  from public.profiles p
  left join public.notification_preferences pref on pref.user_id = p.id
  where p.is_active and coalesce(pref.schedule_alerts,true);
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values ((select auth.uid()),'schedule_change.' || lower(tg_op),'schedule_change',
    change_id::text,jsonb_build_object('date',change_date,'lesson',lesson));
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;
revoke all on function app_private.notify_schedule_change() from public, anon, authenticated;
create trigger schedule_change_notice after insert or update or delete on public.schedule_changes
  for each row execute function app_private.notify_schedule_change();

create or replace function app_private.send_homework_reminders()
returns void language plpgsql security definer set search_path = '' as $function$
begin
  insert into public.notifications(user_id,kind,title,body,href,dedupe_key)
  select p.id,'HOMEWORK_DUE','Վաղը տնայինի վերջնաժամկետն է',
    left(h.title,160),'/homework','homework:' || h.id::text || ':' ||
      (h.due_at at time zone 'Asia/Yerevan')::date::text
  from public.homework h
  cross join public.profiles p
  left join public.notification_preferences pref on pref.user_id = p.id
  where h.deleted_at is null and p.is_active and coalesce(pref.homework_reminders,true)
    and (h.due_at at time zone 'Asia/Yerevan')::date =
      (now() at time zone 'Asia/Yerevan')::date + 1
    and not exists (select 1 from public.homework_completion c
      where c.homework_id=h.id and c.student_id=p.id)
    and not exists (select 1 from public.notifications n
      where n.user_id=p.id and n.dedupe_key='homework:' || h.id::text || ':' ||
        (h.due_at at time zone 'Asia/Yerevan')::date::text);
end;
$function$;
revoke all on function app_private.send_homework_reminders() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('class-portal-homework-reminders','0 14 * * *',
  'select app_private.send_homework_reminders()');
