-- Date-specific changes leave the recurring timetable intact.
create table if not exists public.schedule_changes (
  id uuid primary key default gen_random_uuid(),
  class_date date not null,
  lesson_number smallint not null check (lesson_number between 1 and 12),
  kind text not null check (kind in ('CANCELLED','CHANGED','ADDED')),
  subject_id uuid references public.subjects(id),
  start_time time,
  end_time time,
  room text check (room is null or char_length(room) <= 50),
  note text check (note is null or char_length(note) <= 500),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_date, lesson_number),
  check (kind <> 'ADDED' or (subject_id is not null and start_time is not null and end_time is not null)),
  check (start_time is null or end_time is null or end_time > start_time)
);
create index if not exists schedule_changes_date_idx on public.schedule_changes(class_date);
alter table public.schedule_changes enable row level security;
revoke all on public.schedule_changes from public, anon, authenticated;
grant select, insert, delete on public.schedule_changes to authenticated;
grant update (kind, subject_id, start_time, end_time, room, note, updated_at) on public.schedule_changes to authenticated;
create policy schedule_changes_read on public.schedule_changes for select to authenticated
  using (app_private.is_active_user());
create policy schedule_changes_insert on public.schedule_changes for insert to authenticated
  with check (app_private.is_admin() and created_by = (select auth.uid()));
create policy schedule_changes_update on public.schedule_changes for update to authenticated
  using (app_private.is_admin()) with check (app_private.is_admin());
create policy schedule_changes_delete on public.schedule_changes for delete to authenticated
  using (app_private.is_admin());

-- Each member can report a visible message once. Only the super admin reviews it.
create table if not exists public.message_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id),
  reporter_id uuid not null references public.profiles(id),
  reason text not null check (reason in ('SPAM','HARASSMENT','INAPPROPRIATE','OTHER')),
  details text check (details is null or char_length(details) <= 500),
  status text not null default 'OPEN' check (status in ('OPEN','DISMISSED','RESOLVED')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (message_id, reporter_id)
);
create index if not exists message_reports_open_idx on public.message_reports(created_at desc) where status = 'OPEN';
alter table public.message_reports enable row level security;
revoke all on public.message_reports from public, anon, authenticated;
grant select on public.message_reports to authenticated;
grant insert (message_id, reporter_id, reason, details) on public.message_reports to authenticated;
grant update (status, reviewed_by, reviewed_at) on public.message_reports to authenticated;
create policy message_reports_read on public.message_reports for select to authenticated
  using (app_private.is_super_admin() or (app_private.is_active_user() and reporter_id = (select auth.uid())));
create policy message_reports_insert on public.message_reports for insert to authenticated
  with check (
    app_private.is_active_user() and reporter_id = (select auth.uid()) and
    exists (select 1 from public.messages m where m.id = message_id and m.deleted_at is null
      and app_private.is_conversation_member(m.conversation_id))
  );
create policy message_reports_review on public.message_reports for update to authenticated
  using (app_private.is_super_admin())
  with check (app_private.is_super_admin() and status in ('DISMISSED','RESOLVED')
    and reviewed_by = (select auth.uid()) and reviewed_at is not null);
