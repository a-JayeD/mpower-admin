-- =====================================================================
-- 002  Functions, triggers, views, RPCs
-- =====================================================================

-- ---------- updated_at maintenance -----------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'admins','courses','students','student_courses','attendance','gallery_albums',
    'gallery_images','updates','instructors','success_stories','faqs',
    'contact_messages','site_settings','audit_logs'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------- Role helpers (used by RLS) --------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admins a
    where a.id = (select auth.uid()) and a.is_active
  );
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admins a
    where a.id = (select auth.uid()) and a.is_active and a.role = 'super_admin'
  );
$$;

revoke all on function public.is_admin()       from public;
revoke all on function public.is_super_admin() from public;
grant execute on function public.is_admin()       to anon, authenticated;
grant execute on function public.is_super_admin() to authenticated;

-- ---------- Audit trail ----------------------------------------------
-- Written by a SECURITY DEFINER trigger so the browser can never insert,
-- edit or delete audit rows itself. Only column NAMES are stored.
create or replace function public.audit_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_uid      uuid := auth.uid();
  v_admin    public.admins%rowtype;
  v_action   text;
  v_row      jsonb;
  v_fields   text[] := '{}';
  v_summary  text;
begin
  if v_uid is null then
    -- Anonymous (public contact form) or maintenance via SQL editor.
    return coalesce(new, old);
  end if;

  select * into v_admin from public.admins where id = v_uid;

  if tg_op = 'INSERT' then
    v_action := 'create';  v_row := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    v_action := 'update';  v_row := to_jsonb(new);
    select coalesce(array_agg(n.key order by n.key), '{}') into v_fields
    from jsonb_each(to_jsonb(new)) n
    where n.key not in ('updated_at', 'created_at')
      and n.value is distinct from (to_jsonb(old) -> n.key);
    if cardinality(v_fields) = 0 then
      return new;
    end if;
  else
    v_action := 'delete';  v_row := to_jsonb(old);
  end if;

  if tg_table_name = 'attendance' then
    select s.full_name || ' · ' || (v_row ->> 'class_date') || ' · ' || (v_row ->> 'status')
      into v_summary
    from public.student_courses sc
    join public.students s on s.id = sc.student_id
    where sc.id = (v_row ->> 'enrollment_id')::uuid;
  elsif tg_table_name = 'student_courses' then
    select s.full_name || ' → ' || c.course_name_en || ' (' || (v_row ->> 'status') || ')'
      into v_summary
    from public.students s, public.courses c
    where s.id = (v_row ->> 'student_id')::uuid and c.id = (v_row ->> 'course_id')::uuid;
  end if;

  v_summary := coalesce(
    v_summary,
    v_row ->> 'full_name', v_row ->> 'course_name_en', v_row ->> 'title_en',
    v_row ->> 'name_en', v_row ->> 'question_en', v_row ->> 'student_name',
    v_row ->> 'caption_en', v_row ->> 'name', v_row ->> 'email', ''
  );

  insert into public.audit_logs (admin_id, admin_email, action, entity, entity_id, summary, changed_fields)
  values (v_admin.id, coalesce(v_admin.email, (auth.jwt() ->> 'email')), v_action, tg_table_name,
          (v_row ->> 'id')::uuid, left(v_summary, 200), v_fields);

  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'admins','courses','students','student_courses','attendance','gallery_albums',
    'gallery_images','updates','instructors','success_stories','faqs',
    'contact_messages','site_settings'
  ] loop
    execute format(
      'create trigger audit_changes after insert or update or delete on public.%I
         for each row execute function public.audit_trigger()', t);
  end loop;
end $$;

-- ---------- Enrollment normalisation ---------------------------------
-- • copies total_classes from the course when not supplied
-- • keeps status / completion_date consistent
create or replace function public.student_courses_before_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.total_classes is null then
    select c.total_classes into new.total_classes
    from public.courses c where c.id = new.course_id;
  end if;

  if new.status = 'completed' then
    new.completion_date := coalesce(new.completion_date, (now() at time zone 'Asia/Dhaka')::date);
  else
    new.completion_date := null;
    new.completed_automatically := false;
  end if;
  return new;
end $$;

create trigger student_courses_before_write
  before insert or update on public.student_courses
  for each row execute function public.student_courses_before_write();

-- ---------- Completion logic -----------------------------------------
-- Only PRESENT records count. Absences never reduce classes_remaining.
create or replace function public.refresh_enrollment_completion(p_enrollment_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_total    integer;
  v_status   public.enrollment_status;
  v_auto     boolean;
  v_attended integer;
  v_last     date;
begin
  select total_classes, status, completed_automatically
    into v_total, v_status, v_auto
  from public.student_courses where id = p_enrollment_id;
  if not found then return; end if;

  select count(*), max(class_date)
    into v_attended, v_last
  from public.attendance
  where enrollment_id = p_enrollment_id and status = 'present';

  if v_status = 'active' and v_attended >= v_total then
    update public.student_courses
       set status = 'completed',
           completion_date = coalesce(v_last, (now() at time zone 'Asia/Dhaka')::date),
           completed_automatically = true
     where id = p_enrollment_id;
  elsif v_status = 'completed' and v_auto and v_attended < v_total then
    -- An attendance correction undid an automatic completion.
    update public.student_courses
       set status = 'active'
     where id = p_enrollment_id;
  end if;
end $$;

create or replace function public.attendance_before_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.class_date > (now() at time zone 'Asia/Dhaka')::date then
    raise exception 'Attendance cannot be recorded for a future date' using errcode = '22023';
  end if;
  -- Record who marked it. Server-side jobs (e.g. the restore script, which has
  -- no signed-in user) keep the value supplied in the row instead.
  if auth.uid() is not null then
    new.marked_by := (select a.id from public.admins a where a.id = auth.uid());
  end if;
  return new;
end $$;

create trigger attendance_before_write
  before insert or update on public.attendance
  for each row execute function public.attendance_before_write();

create or replace function public.attendance_after_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_enrollment_completion(new.enrollment_id);
  end if;
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.enrollment_id <> new.enrollment_id) then
    perform public.refresh_enrollment_completion(old.enrollment_id);
  end if;
  return null;
end $$;

create trigger attendance_completion
  after insert or update or delete on public.attendance
  for each row execute function public.attendance_after_change();

-- Changing total_classes re-evaluates completion (e.g. 20 → 25 reopens).
create or replace function public.student_courses_after_total_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  perform public.refresh_enrollment_completion(new.id);
  return null;
end $$;

create trigger student_courses_total_change
  after update of total_classes on public.student_courses
  for each row execute function public.student_courses_after_total_change();

-- Keep the student's overall status in step with their enrollments.
create or replace function public.sync_student_status()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_open integer;
  v_done integer;
begin
  select count(*) filter (where status in ('active', 'paused')),
         count(*) filter (where status = 'completed')
    into v_open, v_done
  from public.student_courses where student_id = new.student_id;

  if v_open = 0 and v_done > 0 then
    update public.students set status = 'completed'
     where id = new.student_id and status = 'active';
  elsif v_open > 0 then
    update public.students set status = 'active'
     where id = new.student_id and status = 'completed';
  end if;
  return null;
end $$;

create trigger student_courses_sync_student
  after insert or update of status on public.student_courses
  for each row execute function public.sync_student_status();

-- ---------- Admin safety ---------------------------------------------
create or replace function public.admins_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null and old.id = auth.uid()
     and (new.is_active is distinct from old.is_active or new.role is distinct from old.role) then
    raise exception 'You cannot deactivate or change the role of your own account' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger admins_guard before update on public.admins
  for each row execute function public.admins_guard();

-- Grant dashboard access to an existing Supabase Auth user (super admin only).
create or replace function public.grant_admin(
  p_email text, p_full_name text default '', p_role public.admin_role default 'admin'
) returns public.admins
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid;
  v_row     public.admins;
begin
  if not public.is_super_admin() then
    raise exception 'Only a super admin can grant admin access' using errcode = '42501';
  end if;

  select u.id into v_user_id from auth.users u where lower(u.email) = lower(btrim(p_email));
  if v_user_id is null then
    raise exception 'No login exists for %. Create the user in Supabase → Authentication first.', p_email
      using errcode = 'P0002';
  end if;

  insert into public.admins (id, email, full_name, role, is_active)
  values (v_user_id, lower(btrim(p_email)), left(coalesce(p_full_name, ''), 120), p_role, true)
  on conflict (id) do update
    set is_active = true,
        role = excluded.role,
        full_name = coalesce(nullif(excluded.full_name, ''), public.admins.full_name)
  returning * into v_row;

  return v_row;
end $$;

revoke all on function public.grant_admin(text, text, public.admin_role) from public, anon;
grant execute on function public.grant_admin(text, text, public.admin_role) to authenticated;

-- ---------- Reporting views (RLS of base tables applies) -------------
create or replace view public.enrollment_progress with (security_invoker = true) as
select
  sc.id                      as enrollment_id,
  sc.student_id,
  s.full_name                as student_name,
  s.phone                    as student_phone,
  s.photo_path               as student_photo_path,
  s.status                   as student_status,
  sc.course_id,
  c.course_name_en,
  c.course_name_bn,
  sc.join_date,
  sc.total_classes,
  sc.status,
  sc.completion_date,
  sc.completed_automatically,
  sc.notes,
  coalesce(a.attended, 0)::int                                   as classes_attended,
  coalesce(a.absent, 0)::int                                     as classes_absent,
  greatest(sc.total_classes - coalesce(a.attended, 0), 0)::int   as classes_remaining,
  round(least(coalesce(a.attended, 0)::numeric * 100 / sc.total_classes, 100), 1) as attendance_percentage,
  a.last_attended
from public.student_courses sc
join public.students s on s.id = sc.student_id
join public.courses  c on c.id = sc.course_id
left join lateral (
  select count(*) filter (where at.status = 'present') as attended,
         count(*) filter (where at.status = 'absent')  as absent,
         max(at.class_date) filter (where at.status = 'present') as last_attended
  from public.attendance at
  where at.enrollment_id = sc.id
) a on true;

create or replace view public.attendance_details with (security_invoker = true) as
select
  a.id, a.enrollment_id, a.class_date, a.status, a.marked_by, a.created_at, a.updated_at,
  sc.student_id, s.full_name as student_name,
  sc.course_id, c.course_name_en, c.course_name_bn
from public.attendance a
join public.student_courses sc on sc.id = a.enrollment_id
join public.students s on s.id = sc.student_id
join public.courses  c on c.id = sc.course_id;

-- ---------- Dashboard (single round trip) ----------------------------
create or replace function public.dashboard_summary(p_today date default null)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  v_today     date := coalesce(p_today, (now() at time zone 'Asia/Dhaka')::date);
  v_threshold integer;
  v_dow       integer;
  v_result    jsonb;
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select s.completion_warning_threshold into v_threshold from public.site_settings s limit 1;
  v_threshold := coalesce(v_threshold, 3);
  v_dow := extract(dow from v_today)::int;

  select jsonb_build_object(
    'today', v_today,
    'threshold', v_threshold,
    'total_students',   (select count(*) from public.students where status <> 'archived'),
    'active_students',  (select count(*) from public.students where status = 'active'),
    'active_courses',   (select count(*) from public.courses  where status = 'active'),
    'today_present',    (select count(*) from public.attendance where class_date = v_today and status = 'present'),
    'today_absent',     (select count(*) from public.attendance where class_date = v_today and status = 'absent'),
    'unread_messages',  (select count(*) from public.contact_messages where status = 'new'),
    'near_completion', coalesce((
      select jsonb_agg(x order by x.classes_remaining, x.student_name) from (
        select enrollment_id, student_id, student_name, course_id, course_name_en,
               classes_attended, classes_remaining, total_classes
        from public.enrollment_progress
        where status = 'active' and classes_remaining <= v_threshold
        limit 50
      ) x), '[]'::jsonb),
    'recently_completed', coalesce((
      select jsonb_agg(x order by x.completion_date desc) from (
        select enrollment_id, student_id, student_name, course_name_en, completion_date
        from public.enrollment_progress
        where status = 'completed' and completion_date >= v_today - 7
        order by completion_date desc
        limit 10
      ) x), '[]'::jsonb),
    'missing_attendance', coalesce((
      select jsonb_agg(jsonb_build_object('course_id', c.id, 'course_name_en', c.course_name_en))
      from public.courses c
      where c.status = 'active'
        and v_dow = any (c.class_days)
        and exists (select 1 from public.student_courses sc where sc.course_id = c.id and sc.status = 'active')
        and not exists (
          select 1 from public.attendance a
          join public.student_courses sc on sc.id = a.enrollment_id
          where sc.course_id = c.id and a.class_date = v_today)
      ), '[]'::jsonb),
    'recent_students', coalesce((
      select jsonb_agg(x) from (
        select id, full_name, phone, joined_on, status, created_at
        from public.students order by created_at desc limit 5
      ) x), '[]'::jsonb),
    'recent_updates', coalesce((
      select jsonb_agg(x) from (
        select id, title_en, type, is_published, publish_date
        from public.updates order by created_at desc limit 5
      ) x), '[]'::jsonb)
  ) into v_result;

  return v_result;
end $$;

revoke all on function public.dashboard_summary(date) from public, anon;
grant execute on function public.dashboard_summary(date) to authenticated;
revoke all on function public.refresh_enrollment_completion(uuid) from public, anon;
grant execute on function public.refresh_enrollment_completion(uuid) to authenticated;
