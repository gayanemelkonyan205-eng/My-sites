insert into public.site_settings(key,value) values
('appearance.theme_mode','"dark"'::jsonb),
('appearance.accent','"#0A84FF"'::jsonb),
('appearance.radius','24'::jsonb),
('appearance.glass_opacity','0.58'::jsonb),
('appearance.glass_blur','28'::jsonb),
('appearance.surface_contrast','1'::jsonb),
('appearance.background_style','"pure"'::jsonb),
('motion.enabled','true'::jsonb),
('motion.speed','1'::jsonb),
('motion.spring_strength','1'::jsonb),
('identity.site_name','"Դասարան"'::jsonb),
('identity.logo_path','null'::jsonb)
on conflict(key) do nothing;

create or replace function public.get_public_site_settings()
returns table(key text,value jsonb)
language sql
stable
security definer
set search_path=''
as $$
  select s.key,s.value from public.site_settings s
  where s.key in (
    'appearance.theme_mode','appearance.accent','appearance.radius','appearance.glass_opacity',
    'appearance.glass_blur','appearance.surface_contrast','appearance.background_style',
    'motion.enabled','motion.speed','motion.spring_strength','identity.site_name','identity.logo_path'
  ) order by s.key;
$$;

create or replace function public.super_admin_set_site_setting(p_key text,p_value jsonb)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid := (select auth.uid());
  sval text;
  nval numeric;
begin
  if not app_private.is_super_admin() then return false; end if;
  if p_key not in (
    'appearance.theme_mode','appearance.accent','appearance.radius','appearance.glass_opacity',
    'appearance.glass_blur','appearance.surface_contrast','appearance.background_style',
    'motion.enabled','motion.speed','motion.spring_strength','identity.site_name','identity.logo_path'
  ) then return false; end if;

  if p_key='appearance.theme_mode' then
    sval := p_value #>> '{}';
    if sval not in ('dark','light','system') then return false; end if;
  elsif p_key='appearance.accent' then
    sval := p_value #>> '{}';
    if sval !~ '^#[0-9A-Fa-f]{6}$' then return false; end if;
  elsif p_key='appearance.background_style' then
    sval := p_value #>> '{}';
    if sval not in ('pure','soft-gradient') then return false; end if;
  elsif p_key='identity.site_name' then
    sval := p_value #>> '{}';
    if sval is null or char_length(sval) not between 2 and 60 or sval ~ '[[:cntrl:]]' then return false; end if;
  elsif p_key='identity.logo_path' then
    if p_value <> 'null'::jsonb then
      sval := p_value #>> '{}';
      if sval is null or char_length(sval)>500 or lower(sval) like 'javascript:%' then return false; end if;
    end if;
  elsif p_key='motion.enabled' then
    if jsonb_typeof(p_value)<>'boolean' then return false; end if;
  elsif p_key in ('appearance.radius','appearance.glass_opacity','appearance.glass_blur','appearance.surface_contrast','motion.speed','motion.spring_strength') then
    if jsonb_typeof(p_value)<>'number' then return false; end if;
    nval := (p_value #>> '{}')::numeric;
    if p_key='appearance.radius' and (nval<14 or nval>34) then return false; end if;
    if p_key='appearance.glass_opacity' and (nval<0.36 or nval>0.92) then return false; end if;
    if p_key='appearance.glass_blur' and (nval<12 or nval>48) then return false; end if;
    if p_key='appearance.surface_contrast' and (nval<0.5 or nval>1.5) then return false; end if;
    if p_key='motion.speed' and (nval<0.6 or nval>1.6) then return false; end if;
    if p_key='motion.spring_strength' and (nval<0.6 or nval>1.5) then return false; end if;
  end if;

  insert into public.site_settings(key,value,updated_by)
  values(p_key,p_value,uid)
  on conflict(key) do update set value=excluded.value,updated_by=excluded.updated_by,updated_at=now();

  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(uid,'settings.updated','site_setting',p_key,jsonb_build_object('value',p_value));
  return true;
end;
$$;

revoke all on function public.get_public_site_settings() from public,anon;
revoke all on function public.super_admin_set_site_setting(text,jsonb) from public,anon;
grant execute on function public.get_public_site_settings() to authenticated;
grant execute on function public.super_admin_set_site_setting(text,jsonb) to authenticated;
