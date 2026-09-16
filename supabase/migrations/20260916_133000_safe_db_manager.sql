create or replace function public.super_admin_list_db_resources()
returns table(resource text,label text,can_edit boolean,can_delete boolean)
language sql
stable
security definer
set search_path=''
as $$
  select * from (values
    ('profiles','Users / Profiles',true,false),
    ('subjects','Subjects',true,false),
    ('schedule_entries','Schedule',false,false),
    ('homework','Homework',true,true),
    ('announcements','Announcements',true,true),
    ('events','Events',true,true),
    ('polls','Polls',true,true),
    ('class_files','Files metadata',false,false),
    ('conversations','Conversations',false,false),
    ('messages','Messages',false,false),
    ('site_settings','Site Settings',false,false),
    ('audit_logs','Audit Log',false,false)
  ) v(resource,label,can_edit,can_delete)
  where app_private.is_super_admin();
$$;

create or replace function public.super_admin_read_resource(
  p_resource text,
  p_limit integer default 50,
  p_offset integer default 0
) returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  lim integer := least(greatest(coalesce(p_limit,50),1),100);
  off integer := greatest(coalesce(p_offset,0),0);
  result jsonb;
begin
  if not app_private.is_super_admin() then return '[]'::jsonb; end if;
  case p_resource
    when 'profiles' then select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result from (select id,first_name,last_name,username,role,bio,is_active,created_at,updated_at from public.profiles order by created_at desc limit lim offset off) x;
    when 'subjects' then select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result from (select id,name,short_name,icon,color,is_active,display_order,created_at,updated_at from public.subjects order by display_order,name limit lim offset off) x;
    when 'schedule_entries' then select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result from (select * from public.schedule_entries order by weekday,lesson_number limit lim offset off) x;
    when 'homework' then select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result from (select * from public.homework order by created_at desc limit lim offset off) x;
    when 'announcements' then select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result from (select * from public.announcements order by created_at desc limit lim offset off) x;
    when 'events' then select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result from (select * from public.events order by starts_at desc limit lim offset off) x;
    when 'polls' then select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result from (select * from public.polls order by created_at desc limit lim offset off) x;
    when 'class_files' then select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result from (select id,subject_id,title,description,storage_path,original_name,mime_type,size_bytes,uploader_id,created_at from public.class_files order by created_at desc limit lim offset off) x;
    when 'conversations' then select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result from (select id,type,title,created_by,created_at,updated_at from public.conversations order by updated_at desc limit lim offset off) x;
    when 'messages' then select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result from (select id,conversation_id,sender_id,type,body,created_at,edited_at,deleted_at from public.messages order by created_at desc limit lim offset off) x;
    when 'site_settings' then select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result from (select key,value,updated_by,updated_at from public.site_settings order by key limit lim offset off) x;
    when 'audit_logs' then select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result from (select id,actor_id,action,entity_type,entity_id,metadata,created_at from public.audit_logs order by id desc limit lim offset off) x;
    else return '[]'::jsonb;
  end case;
  return coalesce(result,'[]'::jsonb);
end;
$$;

create or replace function public.super_admin_update_content(
  p_resource text,
  p_id uuid,
  p_payload jsonb
) returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid := (select auth.uid());
  ok boolean := false;
begin
  if not app_private.is_super_admin() or p_id is null or jsonb_typeof(p_payload)<>'object' then return false; end if;
  begin
    case p_resource
      when 'announcements' then
        update public.announcements set
          title=case when p_payload ? 'title' then left(btrim(p_payload->>'title'),160) else title end,
          body=case when p_payload ? 'body' then left(p_payload->>'body',10000) else body end,
          is_pinned=case when p_payload ? 'is_pinned' then (p_payload->>'is_pinned')::boolean else is_pinned end,
          is_important=case when p_payload ? 'is_important' then (p_payload->>'is_important')::boolean else is_important end,
          updated_at=now()
        where id=p_id;
      when 'homework' then
        update public.homework set
          title=case when p_payload ? 'title' then left(btrim(p_payload->>'title'),180) else title end,
          description=case when p_payload ? 'description' then left(coalesce(p_payload->>'description',''),10000) else description end,
          due_at=case when p_payload ? 'due_at' then (p_payload->>'due_at')::timestamptz else due_at end,
          updated_at=now()
        where id=p_id;
      when 'events' then
        update public.events set
          title=case when p_payload ? 'title' then left(btrim(p_payload->>'title'),180) else title end,
          description=case when p_payload ? 'description' then left(coalesce(p_payload->>'description',''),10000) else description end,
          starts_at=case when p_payload ? 'starts_at' then (p_payload->>'starts_at')::timestamptz else starts_at end,
          ends_at=case when p_payload ? 'ends_at' and nullif(p_payload->>'ends_at','') is not null then (p_payload->>'ends_at')::timestamptz when p_payload ? 'ends_at' then null else ends_at end,
          location=case when p_payload ? 'location' then nullif(left(btrim(coalesce(p_payload->>'location','')),240),'') else location end,
          updated_at=now()
        where id=p_id;
      when 'polls' then
        update public.polls set
          question=case when p_payload ? 'question' then left(btrim(p_payload->>'question'),500) else question end,
          closes_at=case when p_payload ? 'closes_at' and nullif(p_payload->>'closes_at','') is not null then (p_payload->>'closes_at')::timestamptz when p_payload ? 'closes_at' then null else closes_at end,
          show_results_after_vote=case when p_payload ? 'show_results_after_vote' then (p_payload->>'show_results_after_vote')::boolean else show_results_after_vote end,
          updated_at=now()
        where id=p_id;
      else return false;
    end case;
    ok := found;
  exception when others then
    return false;
  end;
  if ok then
    insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(uid,'db.content.updated',p_resource,p_id::text,jsonb_build_object('keys',(select jsonb_agg(k) from jsonb_object_keys(p_payload) k)));
  end if;
  return ok;
end;
$$;

create or replace function public.super_admin_delete_content(p_resource text,p_id uuid)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare uid uuid := (select auth.uid()); ok boolean := false;
begin
  if not app_private.is_super_admin() or p_id is null then return false; end if;
  case p_resource
    when 'announcements' then delete from public.announcements where id=p_id;
    when 'homework' then delete from public.homework where id=p_id;
    when 'events' then delete from public.events where id=p_id;
    when 'polls' then delete from public.polls where id=p_id;
    else return false;
  end case;
  ok := found;
  if ok then insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(uid,'db.content.deleted',p_resource,p_id::text,'{}'::jsonb); end if;
  return ok;
end;
$$;

revoke all on function public.super_admin_list_db_resources() from public,anon;
revoke all on function public.super_admin_read_resource(text,integer,integer) from public,anon;
revoke all on function public.super_admin_update_content(text,uuid,jsonb) from public,anon;
revoke all on function public.super_admin_delete_content(text,uuid) from public,anon;
grant execute on function public.super_admin_list_db_resources() to authenticated;
grant execute on function public.super_admin_read_resource(text,integer,integer) to authenticated;
grant execute on function public.super_admin_update_content(text,uuid,jsonb) to authenticated;
grant execute on function public.super_admin_delete_content(text,uuid) to authenticated;
