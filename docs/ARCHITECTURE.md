# Architecture

This document is for whoever maintains the code. Setup and deployment are in the [README](../README.md).

## Design order

The system was built from the bottom up, and changes should follow the same order:

**schema → database rules (triggers, RLS) → services → routes → components.**

If a rule matters for data integrity, it belongs in the database. The UI may repeat it for friendliness, but must never be the only place it is enforced.

---

## 1. Data model

All primary keys are UUIDs. Every table has `created_at` and `updated_at`; `updated_at` is maintained by a trigger.

```
admins ─┐ (id = auth.users.id)
        ├── created_by ── students ──< student_courses >── courses
        │                                   │
        └── marked_by ────────────── attendance (one per enrollment per date)

gallery_albums ──< gallery_images      (album.cover_image_id → image, ON DELETE SET NULL)
updates · instructors · success_stories (optional course_id) · faqs
contact_messages · site_settings (single row) · audit_logs
```

| Table | Purpose | Key constraints |
|---|---|---|
| `admins` | Who may use the dashboard | PK = Auth user id; `email` unique; role `super_admin`/`admin`; `is_active` |
| `courses` | Bilingual course catalogue | fee ≥ 0, classes 1–500, `class_days smallint[]` (0 = Sun); status includes `archived` |
| `students` | Private student records | phone format; status Active/Completed/Paused/Dropped/Archived |
| `student_courses` | Enrollment | unique (student, course); `total_classes` **copied** at enrollment; `status = completed ⇔ completion_date is not null` |
| `attendance` | One mark per enrollment per date | unique (enrollment_id, class_date), which implies unique student + course + date; no future dates |
| `gallery_albums` / `gallery_images` | Gallery | image paths for full size + thumbnail, dimensions, byte size |
| `updates` | News, notices, announcements, events | `publish_date` enables scheduling |
| `instructors`, `success_stories`, `faqs` | Website content | `display_order`, publish/active flags |
| `contact_messages` | Website contact form | status New/Read/Replied/Archived |
| `site_settings` | One row (`singleton` unique + check) | includes `completion_warning_threshold` (1–10) |
| `audit_logs` | Activity log | action, entity, entity_id, summary, `changed_fields` (column names only), admin email snapshot |

**Why attendance points to the enrollment, not the student.** Combined with unique (student_id, course_id), this makes "one record per student per course per date" a database constraint. Deleting an enrollment also cleans up its attendance.

**Retakes** are handled by reopening the enrollment with a higher total, not by creating a second enrollment.

### Views (with `security_invoker = true`, so RLS of the base tables applies)

- `enrollment_progress`: an enrollment joined with student and course names, plus `classes_attended`, `classes_absent`, `classes_remaining = max(total − attended, 0)`, `attendance_percentage`, and `last_attended`.
- `attendance_details`: attendance with student and course names, used by history and exports.

---

## 2. Database logic (`002_functions_triggers.sql`)

| Function / trigger | What it guarantees |
|---|---|
| `set_updated_at` | `updated_at` is always correct |
| `is_admin()`, `is_super_admin()` | `SECURITY DEFINER` helpers used by every policy; true only for an **active** admin row |
| `student_courses_before_write` | Fills `total_classes` from the course if not supplied; sets or clears `completion_date` and `completed_automatically` to match `status` |
| `refresh_enrollment_completion(id)` | Auto-completes when attended ≥ total (date = Dhaka today). Reverts only if it had auto-completed and attendance is later corrected. Manual completions are left alone. |
| `attendance_before_write` | Rejects future dates (Asia/Dhaka); sets `marked_by` from the signed-in admin |
| `attendance_after_change` | Calls the completion refresh after any insert, update or delete |
| enrollment `total_classes` update trigger | Re-evaluates completion when an enrollment's target changes (e.g. 20 → 25 reopens an auto-completed course). Editing a *course's* class count never touches existing enrollments, which keep their snapshot. |
| `sync_student_status` | Student becomes Completed when no enrollment is open, and Active again when one reopens (Paused, Dropped and Archived are never overwritten) |
| `admins_guard` | Nobody can change their own role or deactivate themselves |
| `grant_admin(email, name, role)` | Super-admin-only RPC that links an existing Auth user as an admin |
| `audit_trigger` | Runs `SECURITY DEFINER` on 13 tables; skipped when there is no signed-in user (for example the restore script) |
| `dashboard_summary(p_today)` | One RPC returning every dashboard number and list as JSON |

---

## 3. Row Level Security (`003_rls_policies.sql`)

RLS is enabled on every table. The pattern is:

- **Admins have full access** to each table: `using (is_admin()) with check (is_admin())`.
- `admins`: admins can read; only super admins can update, and only the columns `full_name`, `role` and `is_active` (column grants). Inserts happen only through `grant_admin` or the SQL editor.
- `audit_logs`: admins can read. `insert/update/delete` are revoked from `authenticated`, so only the trigger writes.
- **Anon (public website)** can only *select* the published or active rows listed in the README. On `contact_messages`, anon has an insert-only grant on five columns and no select.
- Private tables and views are revoked from `anon` entirely.

Storage (`004_storage.sql`): `public-media` is public to read through URL, and only admins can list or write. `student-photos` is admin-only for every operation and served by 30-minute signed URLs. Both buckets enforce MIME type and size limits.

These were tested against a local Postgres with Supabase-style roles. Anon and non-admin authenticated users get zero rows or permission errors on private data; attendance duplicates and future dates are rejected; completion, auto-revert and the activity log behave as described.

---

## 4. Front end

### Data flow

```
page component ──useQuery/useMutation──► services/*.ts ──supabase-js──► PostgREST / Storage / Auth
```

- **`services/`** is the only place that calls Supabase. Each function returns typed rows (`types/database.ts`) and throws on error via `unwrap()`.
- **TanStack Query** caches results (30 s stale time, no refetch on focus, no polling). Mutations invalidate the related query keys: `students`, `student/:id`, `enrollments/:studentId`, `roster/:courseId`, `attendance-day`, `attendance-history`, `courses`, `course-options`, `dashboard`, `albums`, `album-images/:id`, `updates`, `instructors`, `stories`, `faqs`, `messages`, `settings`, `admins`, `audit`.
- A global mutation error handler shows a friendly toast (`utils/errors.ts` maps Postgres codes such as 23505 and 23503 to plain language) unless the mutation handles its own errors.
- **Validation:** zod schemas in `lib/validation/schemas.ts` mirror the database checks. Text is sanitised by `utils/sanitize.ts` before every write.

### Auth

`hooks/useAuth.tsx` resolves the session to one of `loading | signed-out | not-admin | admin` by reading the user's active `admins` row. `ProtectedRoute` shows a "No admin access" screen for `not-admin`; `PublicOnlyRoute` keeps signed-in users away from the login screen. The password-recovery event leads to `/reset-password`.

### Routes (`routes/paths.ts`, every page lazy-loaded)

| Path | Page |
|---|---|
| `/login`, `/forgot-password`, `/reset-password` | Auth screens |
| `/` | Dashboard |
| `/students`, `/students/:id` | Student list (`?new=1`, `?status=`, `?course=`), profile |
| `/courses` | Courses (`?q=`) |
| `/attendance`, `/attendance/history` | Sheet (`?course=&date=`), history |
| `/updates`, `/gallery`, `/gallery/:id`, `/instructors`, `/success-stories`, `/faqs` | Website content |
| `/messages`, `/settings`, `/activity`, `/backup` | Inbox, settings and admins, audit log, exports |

### Components

| Folder | Contents |
|---|---|
| `ui/` | Button (+ `buttonStyles` for links), Field/Input/Select/Textarea/Checkbox, Modal, ConfirmDialog, Badge/StatusBadge, Skeleton/Empty/Error states, Panel/PageHeader/Toolbar, DataTable (sortable, responsive columns), Pagination, SearchInput, Avatar, ImagePicker, LanguageTabs, Toggle, ProgressBar |
| `layout/` | Sidebar (the "PCB trace" navigation), top bar, global search (`/` shortcut) |
| `dashboard/` | StatStrip, AttentionPanel |
| `students/` | StudentFormModal, EnrollModal, EnrollmentCard (edit, complete, reopen, delete) |
| `courses/` | CourseFormModal |
| `content/` | Update/Instructor/Story/FAQ forms, ToggleRow, ReorderButtons |
| `gallery/` | AlbumFormModal |
| `settings/` | SiteSettingsForm, AdministratorsPanel, ChangePasswordPanel |

Hooks: `useConfirm` (promise-based confirm dialog, with an optional "type DELETE" safeguard), `useSignedPhotos` (one batched signing request per page), `useReorder` (optimistic move-up/down that writes only the rows that moved), `usePageState` (resets to page 1 when filters change), `useDebounce`, `useBrowserNotifications`.

### Visual language

Dark navy (`ink`), white surfaces, cyan "trace" and green "signal" accents. The one decorative idea is the circuit trace: navigation groups are traces with lit nodes, and progress bars are traces filling toward a node. Everything else stays plain so it reads as a work tool. IBM Plex Sans is used for Latin text and Hind Siliguri for Bangla, applied automatically inside Bangla form tabs.

### Images

`utils/image.ts` checks magic bytes and size, then draws onto a canvas and re-encodes to WebP (falling back to JPEG) at the size preset. Re-encoding removes EXIF/GPS data. Replacing an image uploads the new file first and then deletes the old one; deleting a record removes its files.

---

## 5. Local scripts (`scripts/`)

These run with the **service_role** key from `.env.restore` on the maintainer's computer only.

- `backup-storage.mjs` downloads both buckets, skipping files already present at the same size.
- `restore-from-json.mjs` reads the JSON backup, then:
  - maps admins to existing Auth users by id or email,
  - upserts tables in dependency order, inserting albums without covers first,
  - re-applies enrollment and student statuses after attendance triggers have run,
  - optionally uploads the photo folder.

  `--dry-run` validates without writing.
