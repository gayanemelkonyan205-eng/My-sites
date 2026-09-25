-- One service-worker subscription belongs to the account currently signed in
-- on that browser. The browser must prove possession of its subscription keys
-- before an existing endpoint can be reassigned.
create or replace function public.claim_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_subscription_id uuid;
begin
  if v_user_id is null or not exists (
    select 1 from public.profiles
    where id = v_user_id and is_active and deleted_at is null
  ) then
    return false;
  end if;
  if p_endpoint is null or left(p_endpoint, 8) <> 'https://'
     or length(p_endpoint) > 2048
     or p_p256dh is null or length(p_p256dh) not between 1 and 256
     or p_auth is null or length(p_auth) not between 1 and 256 then
    return false;
  end if;

  insert into public.push_subscriptions(user_id, endpoint, p256dh, auth, user_agent, updated_at)
  values (v_user_id, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 512), now())
  on conflict (endpoint) do update
  set user_id = excluded.user_id,
      user_agent = excluded.user_agent,
      updated_at = now()
  where public.push_subscriptions.p256dh = excluded.p256dh
    and public.push_subscriptions.auth = excluded.auth
  returning id into v_subscription_id;

  return v_subscription_id is not null;
end;
$$;

revoke all on function public.claim_push_subscription(text,text,text,text) from public, anon;
grant execute on function public.claim_push_subscription(text,text,text,text) to authenticated;
