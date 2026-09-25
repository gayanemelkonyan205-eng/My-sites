create or replace function public.submit_poll_vote(p_poll_id uuid, p_option_ids uuid[])
returns boolean language plpgsql security definer set search_path = ''
as $function$
declare uid uuid := (select auth.uid()); mode public.poll_choice_mode; closes timestamptz; ballot uuid; option_count integer; valid_count integer;
begin
  if uid is null or not app_private.is_active_user() then return false; end if;
  select p.choice_mode,p.closes_at into mode,closes from public.polls p where p.id=p_poll_id and p.deleted_at is null;
  if not found or (closes is not null and closes<=now()) then return false; end if;
  select count(distinct x) into option_count from unnest(coalesce(p_option_ids,'{}'::uuid[])) x;
  if option_count<1 or (mode='SINGLE' and option_count<>1) or option_count>20 then return false; end if;
  select count(*) into valid_count from (select distinct unnest(p_option_ids) x) s join public.poll_options o on o.id=s.x and o.poll_id=p_poll_id;
  if valid_count<>option_count then return false; end if;
  delete from public.poll_ballots where poll_id=p_poll_id and voter_id=uid;
  insert into public.poll_ballots(poll_id,voter_id) values(p_poll_id,uid) returning id into ballot;
  insert into public.poll_ballot_options(ballot_id,poll_id,option_id)
  select ballot,p_poll_id,x from (select distinct unnest(p_option_ids) x) s;
  return true;
end;
$function$;

create or replace function public.get_poll_results(p_poll_id uuid)
returns table(option_id uuid,vote_count bigint) language sql stable security definer set search_path = ''
as $function$
with allowed as (
  select 1 from public.polls p
  where p.id=p_poll_id and p.deleted_at is null and app_private.is_active_user()
    and (p.show_results_after_vote=true or app_private.is_admin()
      or exists(select 1 from public.poll_ballots b where b.poll_id=p.id and b.voter_id=(select auth.uid())))
)
select o.id,count(pbo.option_id)
from public.poll_options o cross join allowed
left join public.poll_ballot_options pbo on pbo.poll_id=o.poll_id and pbo.option_id=o.id
where o.poll_id=p_poll_id
group by o.id,o.position order by o.position,o.id;
$function$;
