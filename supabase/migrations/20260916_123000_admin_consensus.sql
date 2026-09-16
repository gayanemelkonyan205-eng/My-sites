create table if not exists public.admin_role_requests(
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'PENDING' check(status in ('PENDING','APPROVED','REJECTED','CANCELLED')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create unique index if not exists admin_role_requests_one_pending_per_target
  on public.admin_role_requests(target_user_id) where status='PENDING';

create table if not exists public.admin_role_request_votes(
  request_id uuid not null references public.admin_role_requests(id) on delete cascade,
  voter_id uuid not null references public.profiles(id) on delete cascade,
  decision text not null check(decision in ('APPROVE','REJECT')),
  created_at timestamptz not null default now(),
  primary key(request_id,voter_id)
);

alter table public.admin_role_requests enable row level security;
alter table public.admin_role_request_votes enable row level security;

drop policy if exists admin_role_requests_read_admins on public.admin_role_requests;
create policy admin_role_requests_read_admins on public.admin_role_requests
for select to authenticated
using (app_private.current_role() in ('ADMIN','SUPER_ADMIN'));

drop policy if exists admin_role_request_votes_read_admins on public.admin_role_request_votes;
create policy admin_role_request_votes_read_admins on public.admin_role_request_votes
for select to authenticated
using (app_private.current_role() in ('ADMIN','SUPER_ADMIN'));

create or replace function public.create_admin_role_request(p_target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid := (select auth.uid());
  rid uuid;
begin
  if app_private.current_role() not in ('ADMIN','SUPER_ADMIN') then return null; end if;
  if p_target_user_id is null or p_target_user_id=uid then return null; end if;
  if not exists(select 1 from public.profiles where id=p_target_user_id and is_active and role='STUDENT') then return null; end if;
  if exists(select 1 from public.admin_role_requests where target_user_id=p_target_user_id and status='PENDING') then return null; end if;
  insert into public.admin_role_requests(target_user_id,requested_by)
  values(p_target_user_id,uid) returning id into rid;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(uid,'admin.request.created','admin_role_request',rid::text,jsonb_build_object('target_user_id',p_target_user_id));
  return rid;
end;
$$;

create or replace function public.vote_admin_role_request(p_request_id uuid,p_decision text)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid := (select auth.uid());
  req public.admin_role_requests%rowtype;
begin
  if app_private.current_role() not in ('ADMIN','SUPER_ADMIN') then return false; end if;
  if p_decision not in ('APPROVE','REJECT') then return false; end if;
  select * into req from public.admin_role_requests where id=p_request_id for update;
  if not found or req.status<>'PENDING' then return false; end if;
  if req.requested_by=uid then return false; end if;
  if not exists(select 1 from public.profiles where id=req.target_user_id and is_active and role='STUDENT') then return false; end if;

  insert into public.admin_role_request_votes(request_id,voter_id,decision)
  values(p_request_id,uid,p_decision)
  on conflict(request_id,voter_id) do nothing;
  if not found then return false; end if;

  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(uid,'admin.request.vote','admin_role_request',p_request_id::text,jsonb_build_object('decision',p_decision));

  if p_decision='REJECT' then
    update public.admin_role_requests set status='REJECTED',resolved_at=now() where id=p_request_id;
    return true;
  end if;

  -- The request itself is the requester's approval. One distinct active Admin/Super Admin approval completes consensus.
  update public.profiles set role='ADMIN',updated_at=now() where id=req.target_user_id;
  update public.admin_role_requests set status='APPROVED',resolved_at=now() where id=p_request_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(uid,'admin.request.approved','profile',req.target_user_id::text,jsonb_build_object('request_id',p_request_id,'requested_by',req.requested_by));
  return true;
end;
$$;

create or replace function public.cancel_admin_role_request(p_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid := (select auth.uid());
  req public.admin_role_requests%rowtype;
begin
  if app_private.current_role() not in ('ADMIN','SUPER_ADMIN') then return false; end if;
  select * into req from public.admin_role_requests where id=p_request_id for update;
  if not found or req.status<>'PENDING' then return false; end if;
  if req.requested_by<>uid and app_private.current_role()<>'SUPER_ADMIN' then return false; end if;
  update public.admin_role_requests set status='CANCELLED',resolved_at=now() where id=p_request_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(uid,'admin.request.cancelled','admin_role_request',p_request_id::text,'{}'::jsonb);
  return true;
end;
$$;

revoke all on public.admin_role_requests from anon;
revoke all on public.admin_role_request_votes from anon;
revoke insert,update,delete on public.admin_role_requests from authenticated;
revoke insert,update,delete on public.admin_role_request_votes from authenticated;
grant select on public.admin_role_requests to authenticated;
grant select on public.admin_role_request_votes to authenticated;

revoke all on function public.create_admin_role_request(uuid) from public,anon;
revoke all on function public.vote_admin_role_request(uuid,text) from public,anon;
revoke all on function public.cancel_admin_role_request(uuid) from public,anon;
grant execute on function public.create_admin_role_request(uuid) to authenticated;
grant execute on function public.vote_admin_role_request(uuid,text) to authenticated;
grant execute on function public.cancel_admin_role_request(uuid) to authenticated;
