-- =====================================================================
-- 003  Row Level Security
--
--  Model:
--   • Private tables  → readable/writable ONLY by active admins.
--   • Public content  → anon may read published rows only.
--   • contact_messages→ anon may INSERT (limited columns), never read.
--   • audit_logs      → admins may read; nobody may write via the API.
--  Frontend route guards are a convenience; these policies are the wall.
-- =====================================================================

alter table public.admins            enable row level security;
alter table public.courses           enable row level security;
alter table public.students          enable row level security;
alter table public.student_courses   enable row level security;
alter table public.attendance        enable row level security;
alter table public.gallery_albums    enable row level security;
alter table public.gallery_images    enable row level security;
alter table public.updates           enable row level security;
alter table public.instructors       enable row level security;
alter table public.success_stories   enable row level security;
alter table public.faqs              enable row level security;
alter table public.contact_messages  enable row level security;
alter table public.site_settings     enable row level security;
alter table public.audit_logs        enable row level security;

-- Defence in depth: the anonymous role gets no table privileges at all
-- on private data, so even a policy mistake cannot leak it.
revoke all on public.admins, public.students, public.student_courses,
              public.attendance, public.audit_logs
  from anon;
revoke all on public.enrollment_progress, public.attendance_details from anon;
revoke all on public.contact_messages from anon;
grant insert (name, phone, email, subject, message) on public.contact_messages to anon;

-- ---------- Full admin access ---------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'courses','students','student_courses','attendance','gallery_albums',
    'gallery_images','updates','instructors','success_stories','faqs',
    'contact_messages','site_settings'
  ] loop
    execute format(
      'create policy "Admins have full access" on public.%I
         for all to authenticated
         using ((select public.is_admin()))
         with check ((select public.is_admin()))', t);
  end loop;
end $$;

-- ---------- Admins table --------------------------------------------
create policy "Admins can view admins" on public.admins
  for select to authenticated using ((select public.is_admin()));

create policy "Super admins can update admins" on public.admins
  for update to authenticated
  using ((select public.is_super_admin()))
  with check ((select public.is_super_admin()));
-- No insert/delete policies: new admins are added via grant_admin();
-- access is removed by deactivating (keeps the audit trail intact).
revoke update on public.admins from authenticated;
grant update (full_name, role, is_active) on public.admins to authenticated;

-- ---------- Audit log: read-only -------------------------------------
create policy "Admins can read audit log" on public.audit_logs
  for select to authenticated using ((select public.is_admin()));
revoke insert, update, delete on public.audit_logs from authenticated;

-- ---------- Public (website) read access -----------------------------
create policy "Public can view listed courses" on public.courses
  for select to anon, authenticated using (status in ('active', 'upcoming'));

create policy "Public can view published albums" on public.gallery_albums
  for select to anon, authenticated using (is_published);

create policy "Public can view images of published albums" on public.gallery_images
  for select to anon, authenticated using (
    exists (select 1 from public.gallery_albums al
            where al.id = gallery_images.album_id and al.is_published));

create policy "Public can view published updates" on public.updates
  for select to anon, authenticated using (is_published and publish_date <= now());

create policy "Public can view active instructors" on public.instructors
  for select to anon, authenticated using (is_active);

create policy "Public can view published stories" on public.success_stories
  for select to anon, authenticated using (is_published);

create policy "Public can view published FAQs" on public.faqs
  for select to anon, authenticated using (is_published);

create policy "Public can view site settings" on public.site_settings
  for select to anon, authenticated using (true);

-- ---------- Public contact form --------------------------------------
create policy "Public can send contact messages" on public.contact_messages
  for insert to anon, authenticated
  with check (status = 'new' and replied_at is null);
