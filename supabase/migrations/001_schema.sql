-- =====================================================================
-- M.Power Engineering Admin  ·  001  Schema (tables, enums, indexes)
-- Run files 001 → 005 in order in the Supabase SQL Editor.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Enumerations ---------------------------------------------
create type public.admin_role        as enum ('super_admin', 'admin');
create type public.student_status    as enum ('active', 'completed', 'paused', 'dropped', 'archived');
create type public.course_status     as enum ('active', 'upcoming', 'inactive', 'completed', 'archived');
create type public.enrollment_status as enum ('active', 'completed', 'paused', 'dropped');
create type public.attendance_status as enum ('present', 'absent');
create type public.update_type       as enum ('announcement', 'news', 'notice', 'event');
create type public.message_status    as enum ('new', 'read', 'replied', 'archived');
create type public.album_category    as enum ('training', 'industrial_visit', 'workshop', 'event', 'students', 'facilities', 'other');

-- ---------- Administrators -------------------------------------------
-- One row per Supabase Auth user who is allowed into the dashboard.
create table public.admins (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,
  full_name   text not null default '' check (char_length(full_name) <= 120),
  role        public.admin_role not null default 'admin',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- Courses --------------------------------------------------
create table public.courses (
  id              uuid primary key default gen_random_uuid(),
  course_name_en  text not null check (char_length(btrim(course_name_en)) between 2 and 150),
  course_name_bn  text not null default '' check (char_length(course_name_bn) <= 150),
  description_en  text not null default '' check (char_length(description_en) <= 5000),
  description_bn  text not null default '' check (char_length(description_bn) <= 5000),
  joining_fee     numeric(10, 2) not null default 0 check (joining_fee >= 0),
  total_classes   integer not null check (total_classes between 1 and 500),
  duration_en     text not null default '' check (char_length(duration_en) <= 60),
  duration_bn     text not null default '' check (char_length(duration_bn) <= 60),
  -- Weekdays the class normally meets (0 = Sunday … 6 = Saturday).
  -- Used only to warn "attendance not recorded today".
  class_days      smallint[] not null default '{}'
                  check (class_days <@ array[0,1,2,3,4,5,6]::smallint[]),
  image_path      text check (char_length(image_path) <= 300),
  status          public.course_status not null default 'active',
  display_order   integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index courses_status_order_idx on public.courses (status, display_order);

-- ---------- Students (internal records, never public) ----------------
create table public.students (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null check (char_length(btrim(full_name)) between 2 and 120),
  phone       text not null check (phone ~ '^\+?[0-9][0-9 -]{5,19}$'),
  address     text not null default '' check (char_length(address) <= 500),
  photo_path  text check (char_length(photo_path) <= 300),
  joined_on   date not null default current_date,
  notes       text not null default '' check (char_length(notes) <= 2000),
  status      public.student_status not null default 'active',
  created_by  uuid references public.admins (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index students_status_idx     on public.students (status);
create index students_created_at_idx on public.students (created_at desc);
create index students_phone_idx      on public.students (phone);

-- ---------- Enrollments ----------------------------------------------
-- total_classes is copied from the course at enrollment time so that
-- later course changes do not rewrite history.
create table public.student_courses (
  id                       uuid primary key default gen_random_uuid(),
  student_id               uuid not null references public.students (id) on delete cascade,
  course_id                uuid not null references public.courses (id) on delete restrict,
  join_date                date not null default current_date,
  total_classes            integer not null check (total_classes between 1 and 500),
  status                   public.enrollment_status not null default 'active',
  completion_date          date,
  completed_automatically  boolean not null default false,
  notes                    text not null default '' check (char_length(notes) <= 2000),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint student_courses_student_course_key unique (student_id, course_id),
  constraint student_courses_completion_consistent
    check ((status = 'completed') = (completion_date is not null))
);
create index student_courses_course_status_idx on public.student_courses (course_id, status);
create index student_courses_status_idx        on public.student_courses (status);

-- ---------- Attendance -----------------------------------------------
-- One record per enrollment per date ⇒ unique student + course + date.
create table public.attendance (
  id             uuid primary key default gen_random_uuid(),
  enrollment_id  uuid not null references public.student_courses (id) on delete cascade,
  class_date     date not null,
  status         public.attendance_status not null,
  marked_by      uuid references public.admins (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint attendance_enrollment_date_key unique (enrollment_id, class_date)
);
create index attendance_class_date_idx on public.attendance (class_date desc);

-- ---------- Gallery --------------------------------------------------
create table public.gallery_albums (
  id              uuid primary key default gen_random_uuid(),
  title_en        text not null check (char_length(btrim(title_en)) between 2 and 150),
  title_bn        text not null default '' check (char_length(title_bn) <= 150),
  description_en  text not null default '' check (char_length(description_en) <= 1000),
  description_bn  text not null default '' check (char_length(description_bn) <= 1000),
  category        public.album_category not null default 'other',
  cover_image_id  uuid,
  is_published    boolean not null default false,
  display_order   integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.gallery_images (
  id             uuid primary key default gen_random_uuid(),
  album_id       uuid not null references public.gallery_albums (id) on delete cascade,
  image_path     text not null check (char_length(image_path) <= 300),
  thumb_path     text not null check (char_length(thumb_path) <= 300),
  caption_en     text not null default '' check (char_length(caption_en) <= 300),
  caption_bn     text not null default '' check (char_length(caption_bn) <= 300),
  display_order  integer not null default 0,
  width          integer check (width > 0),
  height         integer check (height > 0),
  size_bytes     integer check (size_bytes > 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index gallery_images_album_order_idx on public.gallery_images (album_id, display_order);

alter table public.gallery_albums
  add constraint gallery_albums_cover_image_fkey
  foreign key (cover_image_id) references public.gallery_images (id) on delete set null;
create index gallery_albums_published_idx on public.gallery_albums (is_published, display_order);

-- ---------- News / updates -------------------------------------------
create table public.updates (
  id                uuid primary key default gen_random_uuid(),
  type              public.update_type not null default 'news',
  title_en          text not null check (char_length(btrim(title_en)) between 2 and 200),
  title_bn          text not null default '' check (char_length(title_bn) <= 200),
  content_en        text not null default '' check (char_length(content_en) <= 20000),
  content_bn        text not null default '' check (char_length(content_bn) <= 20000),
  cover_image_path  text check (char_length(cover_image_path) <= 300),
  publish_date      timestamptz not null default now(),
  is_featured       boolean not null default false,
  is_published      boolean not null default false,
  created_by        uuid references public.admins (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index updates_public_idx on public.updates (is_published, publish_date desc);

-- ---------- Instructors ----------------------------------------------
create table public.instructors (
  id              uuid primary key default gen_random_uuid(),
  name_en         text not null check (char_length(btrim(name_en)) between 2 and 120),
  name_bn         text not null default '' check (char_length(name_bn) <= 120),
  photo_path      text check (char_length(photo_path) <= 300),
  position_en     text not null default '' check (char_length(position_en) <= 120),
  position_bn     text not null default '' check (char_length(position_bn) <= 120),
  bio_en          text not null default '' check (char_length(bio_en) <= 2000),
  bio_bn          text not null default '' check (char_length(bio_bn) <= 2000),
  specialization  text not null default '' check (char_length(specialization) <= 200),
  display_order   integer not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index instructors_active_order_idx on public.instructors (is_active, display_order);

-- ---------- Success stories (public; NOT linked to student records) ---
create table public.success_stories (
  id             uuid primary key default gen_random_uuid(),
  student_name   text not null check (char_length(btrim(student_name)) between 2 and 120),
  photo_path     text check (char_length(photo_path) <= 300),
  course_id      uuid references public.courses (id) on delete set null,
  story_en       text not null default '' check (char_length(story_en) <= 5000),
  story_bn       text not null default '' check (char_length(story_bn) <= 5000),
  is_published   boolean not null default false,
  is_featured    boolean not null default false,
  display_order  integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index success_stories_public_idx on public.success_stories (is_published, display_order);

-- ---------- FAQs -----------------------------------------------------
create table public.faqs (
  id             uuid primary key default gen_random_uuid(),
  question_en    text not null check (char_length(btrim(question_en)) between 3 and 300),
  question_bn    text not null default '' check (char_length(question_bn) <= 300),
  answer_en      text not null default '' check (char_length(answer_en) <= 3000),
  answer_bn      text not null default '' check (char_length(answer_bn) <= 3000),
  display_order  integer not null default 0,
  is_published   boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index faqs_public_idx on public.faqs (is_published, display_order);

-- ---------- Contact messages -----------------------------------------
create table public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 2 and 100),
  phone       text check (phone is null or phone ~ '^\+?[0-9][0-9 -]{5,19}$'),
  email       text check (email is null or (char_length(email) <= 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  subject     text not null default '' check (char_length(subject) <= 200),
  message     text not null check (char_length(btrim(message)) between 5 and 5000),
  status      public.message_status not null default 'new',
  replied_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint contact_messages_has_contact check (phone is not null or email is not null)
);
create index contact_messages_status_idx on public.contact_messages (status, created_at desc);

-- ---------- Site settings (exactly one row) --------------------------
create table public.site_settings (
  id                            uuid primary key default gen_random_uuid(),
  singleton                     boolean not null default true unique check (singleton),
  center_name_en                text not null default 'M.Power Engineering' check (char_length(center_name_en) <= 120),
  center_name_bn                text not null default '' check (char_length(center_name_bn) <= 120),
  logo_path                     text check (char_length(logo_path) <= 300),
  phone                         text not null default '' check (char_length(phone) <= 30),
  whatsapp                      text not null default '' check (char_length(whatsapp) <= 30),
  email                         text not null default '' check (char_length(email) <= 200),
  facebook_url                  text not null default '' check (char_length(facebook_url) <= 300),
  messenger_url                 text not null default '' check (char_length(messenger_url) <= 300),
  youtube_url                   text not null default '' check (char_length(youtube_url) <= 300),
  google_maps_url               text not null default '' check (char_length(google_maps_url) <= 1000),
  address_en                    text not null default '' check (char_length(address_en) <= 500),
  address_bn                    text not null default '' check (char_length(address_bn) <= 500),
  opening_hours_en              text not null default '' check (char_length(opening_hours_en) <= 300),
  opening_hours_bn              text not null default '' check (char_length(opening_hours_bn) <= 300),
  hero_title_en                 text not null default '' check (char_length(hero_title_en) <= 200),
  hero_title_bn                 text not null default '' check (char_length(hero_title_bn) <= 200),
  hero_subtitle_en              text not null default '' check (char_length(hero_subtitle_en) <= 500),
  hero_subtitle_bn              text not null default '' check (char_length(hero_subtitle_bn) <= 500),
  footer_text_en                text not null default '' check (char_length(footer_text_en) <= 500),
  footer_text_bn                text not null default '' check (char_length(footer_text_bn) <= 500),
  -- Dashboard starts warning when this many classes (or fewer) remain.
  completion_warning_threshold  integer not null default 3 check (completion_warning_threshold between 1 and 10),
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

-- ---------- Audit log (append-only) ----------------------------------
create table public.audit_logs (
  id              uuid primary key default gen_random_uuid(),
  admin_id        uuid references public.admins (id) on delete set null,
  admin_email     text,                         -- kept if the admin is later removed
  action          text not null check (action in ('create', 'update', 'delete')),
  entity          text not null,
  entity_id       uuid,
  summary         text not null default '',
  changed_fields  text[] not null default '{}', -- column names only, never values
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx     on public.audit_logs (entity, entity_id);
create index audit_logs_admin_idx      on public.audit_logs (admin_id, created_at desc);
