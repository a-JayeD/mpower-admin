# M.Power Engineering — Admin Management System

A private dashboard for running the M.Power Engineering training center: students, courses, enrollments, attendance with automatic course completion, and everything shown on the public website (news, gallery, instructors, success stories, FAQ, contact messages, site settings).

It is a static React app hosted on **Cloudflare Pages (free)**, with **Supabase (free)** for the database, login and file storage. There is no server to rent, nothing to keep running, and no monthly cost on the free tiers.

```
Browser ──► Cloudflare Pages (static files only)
   │
   └──────► Supabase: Postgres + Row Level Security, Auth, Storage
```

Every rule that protects data lives in the database (Row Level Security), so the browser only ever holds the public "anon" key. Someone who is not an active admin can't read student data even if they get hold of that key.

---

## Contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Project structure](#project-structure)
4. [Deployment: 21 steps](#deployment-21-steps)
5. [Daily use](#daily-use)
6. [Backups and rebuilding](#backups-and-rebuilding)
7. [Connecting the public website](#connecting-the-public-website)
8. [Security model](#security-model)
9. [Staying inside the free tiers](#staying-inside-the-free-tiers)
10. [Troubleshooting](#troubleshooting)
11. [Updating the system](#updating-the-system)

More technical detail (schema, policies, routes, components) is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Features

**Dashboard.** Total and active students, active courses, today's attendance, and students near completion. An "Needs attention" panel flags classes whose attendance hasn't been taken today, students with 3, 2 or 1 classes left, courses just completed, and unread messages. Optional browser notifications, at most once a day.

**Students.** Add, edit, archive, restore and delete. Search by name or phone; filter by status or course; sort; paginate. Each profile shows every enrollment with a progress bar, attended/remaining/absent counts and the full attendance history. Student photos are stored privately.

**Courses.** Bilingual name, description and duration, plus joining fee (৳), number of classes, class days, image and status (Active, Upcoming, Inactive, Completed, Archived). A course with enrollments can't be deleted, only archived, so attendance history is never lost.

**Enrollments.** When a student is enrolled, the course's class count is copied onto the enrollment. Changing the course later doesn't change existing students' targets.

**Attendance.** Choose a date and a course, then tap large Present/Absent buttons. Mark all present or absent. A save bar stays on screen on phones. Saved days can be edited; the database rejects duplicates and future dates. The history page has filters and CSV export.

**Automatic completion.** Only *present* records count: `remaining = total − attended` and `progress = attended ÷ total × 100%`. Absences never reduce the remaining count. Warnings read "Course ending soon" (3 left, threshold configurable), "Only 2 classes remaining", "Final class remaining" and "Course completed". When the last class is marked present, the database completes the enrollment with today's date. If that attendance is later corrected, it reopens by itself. Admins can also complete or reopen manually.

**Website content.** News and updates with draft, publish, scheduled publish and featured. Gallery albums with multi-photo upload, captions, ordering and cover choice. Instructors, success stories and FAQs with ordering and publish switches. Contact messages move through New → Read → Replied → Archived. Site settings cover center name, logo, contact details, links, home-page text and footer, in English and Bangla.

**Administration.** An activity log of every change, written by the database and impossible to edit. Administrator management for super admins. CSV exports and a full JSON backup.

---

## Tech stack

| Layer | Choice |
|---|---|
| UI | React 18, TypeScript (strict), Vite 5, Tailwind CSS 3 |
| Routing / data | React Router 6, TanStack Query 5 |
| Forms | react-hook-form + zod (same rules in the browser as in the database checks) |
| Backend | Supabase: Postgres 15+, Row Level Security, Auth (email + password), Storage |
| Hosting | Cloudflare Pages (static) |

Images are resized and re-encoded to WebP in the browser before upload: gallery photos 1600 px, thumbnails 480 px, portraits 600 px. This strips location data from phone photos and usually brings a 5 MB photo down to about 200–400 KB.

---

## Project structure

```
mpower-admin/
├── supabase/
│   ├── migrations/            Run these in order in the SQL Editor
│   │   ├── 001_schema.sql     Tables, enums, constraints, indexes
│   │   ├── 002_functions_triggers.sql   Completion logic, audit log, dashboard RPC
│   │   ├── 003_rls_policies.sql         Row Level Security
│   │   ├── 004_storage.sql              Buckets + storage policies
│   │   └── 005_seed.sql                 Default site settings
│   └── create_first_admin.sql
├── scripts/                   Local-only maintenance (service key, never deployed)
│   ├── restore-from-json.mjs
│   └── backup-storage.mjs
├── public/                    _headers (security headers), _redirects (SPA routing)
├── src/
│   ├── components/            ui/ layout/ dashboard/ students/ courses/ content/ gallery/ settings/
│   ├── pages/                 One file per screen (lazy-loaded)
│   ├── routes/                Paths, protected routes
│   ├── services/              All Supabase calls live here
│   ├── hooks/                 Auth, confirm dialogs, signed photos, reorder…
│   ├── lib/                   Supabase client, constants, validation schemas
│   ├── types/                 Database row types
│   └── utils/                 Dates (Bangladesh time), CSV, images, sanitising
├── .env.example               Browser-safe variables
└── .env.restore.example       Service key for local scripts (never commit)
```

---

## Deployment: 21 steps

You need a computer with internet access, an email address, a free GitHub account and a free Cloudflare account. The whole setup takes about an hour.

### Part A: Prepare your computer

**1. Install Node.js.** Download the LTS version (20 or newer) from <https://nodejs.org> and install it. Check it worked by running this in a terminal (Command Prompt / PowerShell on Windows):

```bash
node -v    # v20.x or newer
npm -v
```

**2. Install Git and get the code.** Install Git from <https://git-scm.com>. Unzip the project into a folder, open a terminal in that folder, and run:

```bash
git init
git add .
git commit -m "Initial import"
```

**3. Install the project's packages.**

```bash
npm install
```

### Part B: Create the database (Supabase)

**4. Create a Supabase project.** Sign up at <https://supabase.com> → **New project**. Choose the region **Southeast Asia (Singapore)**, the closest to Bangladesh. Set a strong database password and store it in a password manager.

**5. Copy the API details.** Go to **Project Settings → API** and note:
- **Project URL**, for example `https://abcd1234.supabase.co`
- **anon / public key** (this goes in the website build and is safe to expose)
- **service_role key**. Keep this secret. It is only for the local backup/restore scripts and never goes into Cloudflare or a `VITE_` variable.

**6. Run the migrations.** Open **SQL Editor → New query**. Paste the full contents of each file and click **Run**, one at a time, in this order:

1. `supabase/migrations/001_schema.sql`
2. `supabase/migrations/002_functions_triggers.sql`
3. `supabase/migrations/003_rls_policies.sql`
4. `supabase/migrations/004_storage.sql`
5. `supabase/migrations/005_seed.sql`

Each should end with "Success. No rows returned". Under **Storage** you should now see two buckets, `public-media` and `student-photos`.

**7. Lock down sign-ups.** In **Authentication → Sign In / Providers**:
- Turn **off** "Allow new users to sign up". Admins are created by hand, so nobody can register themselves.
- Keep **Email** enabled and turn on "Confirm email".
- Under **Authentication → Policies** (or Password settings), set the minimum password length to **10**.

**8. Set the redirect URLs.** In **Authentication → URL Configuration**:
- **Site URL**: `http://localhost:5173` for now. You'll change it in step 17.
- **Redirect URLs**: add `http://localhost:5173/reset-password`.

**9. Create the owner's login.** Go to **Authentication → Users → Add user → Create new user**. Enter the owner's email and a strong password, and tick **Auto Confirm User**.

**10. Make that login a super admin.** Open `supabase/create_first_admin.sql` and replace `owner@example.com` with the email from step 9. Run it in the SQL Editor. The final `select` should show one row with `super_admin`.

### Part C: Try it on your computer

**11. Create your local settings file.** Copy `.env.example` to a new file called `.env.local` and fill in the values from step 5:

```bash
VITE_SUPABASE_URL=https://abcd1234.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

`.env.local` is listed in `.gitignore`, so it is never committed.

**12. Run it.**

```bash
npm run dev
```

Open <http://localhost:5173> and sign in with the owner account. Then add a course, add a student, enroll them, and take attendance for today. If everything works, stop the server with `Ctrl + C`, then run the production build once to make sure it succeeds:

```bash
npm run build
```

### Part D: Put it online (Cloudflare Pages)

**13. Push the code to a private GitHub repository.** On GitHub choose **New repository**, set it to **Private**, and don't add a README. Then:

```bash
git remote add origin https://github.com/<you>/mpower-admin.git
git branch -M main
git push -u origin main
```

Check on GitHub that no `.env.local` or `.env.restore` file was uploaded.

**14. Create the Pages project.** In the Cloudflare dashboard go to **Workers & Pages → Create → Pages → Connect to Git**, authorise GitHub, and pick the repository.

**15. Enter the build settings.**

| Setting | Value |
|---|---|
| Framework preset | Vite (or None) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | *(leave empty)* |

**16. Add the environment variables.** In the same screen, under **Environment variables**, add these for **both Production and Preview**:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | your Project URL |
| `VITE_SUPABASE_ANON_KEY` | your anon key |
| `NODE_VERSION` | `20` |

Click **Save and Deploy**. The first build takes 1–2 minutes and gives you an address such as `https://mpower-admin.pages.dev`.

**17. Tell Supabase the live address.** Back in **Supabase → Authentication → URL Configuration**:
- Set the **Site URL** to your live address, e.g. `https://mpower-admin.pages.dev`.
- Add `https://mpower-admin.pages.dev/reset-password` to the **Redirect URLs**. Keep the localhost entry if you still develop locally.

Open the live address, sign in, and try **Forgot password** once to confirm the email link opens the reset page.

**18. Optional: use your own domain.** Under **Pages project → Custom domains**, add for example `admin.mpowerengineering.com` and follow the DNS instructions. Then repeat step 17 with the new domain.

> If you ever give Supabase a custom domain as well, add it to `img-src` and `connect-src` in `public/_headers`.

**19. Set up email for password resets (recommended).** Supabase's built-in email sender is meant for testing and only allows a few messages per hour. For reliable reset emails, go to **Authentication → Emails → SMTP Settings** and enter the details from a free SMTP provider (for example Brevo or Resend's free plan) or your domain's mailbox. You can also edit the "Reset password" email template there.

### Part E: Running it day to day

**20. Add the other administrators.**
1. In Supabase, go to **Authentication → Users → Add user**, enter their email and a temporary password, and tick **Auto Confirm**.
2. In the dashboard, go to **Settings → Administrators → Add administrator** and enter the same email. Choose **Admin**, or **Super admin** if they should manage other admins.
3. Ask them to change their password under **Settings → Your password** after the first login.

To remove someone, switch their **Access** off. This takes effect immediately and keeps their name on past records. Nobody can change their own role or remove their own access.

**21. Back up, and know how to rebuild.** Every week, open **Backup & export → Download full backup** and keep the JSON file somewhere private. Once a month, also back up the photos (see below). If the Supabase project is ever lost, or you move to a new account:

1. Repeat steps 4–8 on the new project (create it, run the migrations, set the auth settings).
2. Create logins for the admins in **Authentication → Users**, using the same emails as before.
3. On your computer, copy `.env.restore.example` to `.env.restore` and fill in the **new** project's URL and service_role key.
4. Check the file first, then restore it (add `--media=` to restore photos too):

   ```bash
   npm run restore -- path/to/mpower-backup-2026-10-01.json --dry-run
   npm run restore -- path/to/mpower-backup-2026-10-01.json --media=backups/storage/2026-10-01
   ```

5. Update `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Cloudflare (step 16), then **Deployments → Retry deployment**.
6. Repeat step 17 for the new project.
7. **Delete `.env.restore`.**

---

## Daily use

| Task | Where |
|---|---|
| Take today's attendance | Dashboard → **Take attendance** → choose course → mark → **Save attendance** |
| Correct a past day | Attendance → change the date (or History → pencil icon) → change marks → Save |
| New admission | Students → **Add student** → on their profile, **Enroll in course** |
| Student stops coming | Profile → enrollment menu → **Edit enrollment** → status Paused or Dropped |
| Retake or extra classes after completion | Enrollment menu → **Reopen** → enter the new total |
| Hide a student without losing history | **Archive** (Delete erases everything permanently) |
| Post a notice | News & updates → **New update** → turn on Published |
| Press `/` anywhere | Search students and courses |

All dates are counted in **Bangladesh time (Asia/Dhaka)**, whatever the device's clock zone.

The dashboard reminds you about missing attendance only for courses that have **class days** set (Courses → Edit → Class days).

---

## Backups and rebuilding

| What | How | Contains |
|---|---|---|
| Students / Attendance / Courses CSV | Backup & export page | Spreadsheets for reports or offline records |
| Full JSON backup | Backup & export → Download full backup | Every table, in restore order |
| Photos | `npm run backup:storage` (needs `.env.restore`) | Both storage buckets, downloaded to `backups/storage/<date>/` |
| Restore | `npm run restore -- <file.json> [--media=<folder>] [--dry-run] [--yes]` | Upserts by id, so running it twice is safe |

Notes on restoring:
- Passwords are never in a backup. Create the admins' logins first; the script matches them by **email** and re-links their history. Admins without a login are skipped with a warning, and their past actions stay in the log without the link.
- The restore runs without a signed-in user, so it does **not** add entries to the activity log. Past activity-log entries are restored as they were.
- `updated_at` timestamps become the time of the restore.
- The `backups/` folder and `*.backup.json` files are in `.gitignore`. Backups contain phone numbers and addresses, so keep them private.

---

## Connecting the public website

The public site can use the same Supabase project with the **anon key**. Row Level Security already allows visitors to read only:

- courses with status Active or Upcoming
- published gallery albums and their images
- published updates whose publish date has passed
- active instructors, published success stories, published FAQs
- site settings

Image URLs for `public-media` paths can be built with:

```js
supabase.storage.from('public-media').getPublicUrl(path).data.publicUrl
```

**Contact form:** visitors may insert `name`, `phone`, `email`, `subject` and `message`, and nothing else. They can't read messages back, so **do not chain `.select()`** after the insert:

```js
const { error } = await supabase.from('contact_messages').insert({ name, phone, email, subject, message });
```

Student, attendance, enrollment, admin and audit tables are never readable without an admin login.

---

## Security model

- **Row Level Security on every table.** Access requires a row in `admins` with `is_active = true` for the signed-in user (`is_admin()`). Being logged in is not enough.
- **No secrets in the browser.** Only the anon key is shipped. The service_role key is used only by the local scripts and is never committed (`.env.restore` is git-ignored).
- **Sign-ups disabled.** Admin logins are created in the Supabase dashboard.
- **Database-enforced rules.** Unique attendance per enrollment and date. No future attendance. One enrollment per student and course. Value ranges and text lengths are checked. A course with enrollments can't be deleted.
- **Tamper-proof activity log**, written by triggers. Admins can read it, but nobody can edit or delete it through the API. It stores which fields changed, not their contents.
- **Private student photos**, served through signed links that expire after 30 minutes.
- **Uploads checked twice.** The browser checks the file signature, type and size (15 MB source limit, ≤1.5 MB after compression). The storage buckets enforce type and size limits as well (2 MB / 1 MB).
- **Text sanitised.** HTML tags and control characters are stripped before saving, and React escapes everything on display. CSV exports neutralise spreadsheet formulas.
- **HTTP security headers** in `public/_headers`: a strict Content Security Policy, no framing, HSTS, nosniff, and a restrictive Permissions-Policy.

---

## Staying inside the free tiers

| Limit (free plan) | What this app does |
|---|---|
| Supabase database 500 MB | Text rows are tiny. 1,000 students with years of attendance is still only a few MB. |
| Supabase storage 1 GB | Photos are compressed to roughly 150–400 KB plus a ~30 KB thumbnail, so about 2,500+ gallery photos fit. The album page shows each album's size. |
| Supabase bandwidth | Thumbnails in lists, lazy-loaded images, long browser caching. |
| Supabase pauses inactive projects | Free projects pause after about a week with no activity. Normal daily use prevents this; if it happens, click **Restore** in the Supabase dashboard. |
| Cloudflare Pages builds | Only rebuilt when you push code. |

The dashboard loads in one database call. Nothing polls in the background, and pages refetch only after you change something.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Blank page with "Missing environment variable…" | The `VITE_` variables are missing in `.env.local` or Cloudflare. Add them and redeploy (Vite bakes them in at build time). |
| Signed in but see "No admin access" | That login has no active row in `admins`. Run `create_first_admin.sql` or add them in Settings → Administrators. |
| Password-reset link opens the login page or an error | Add `<your-site>/reset-password` to Supabase Redirect URLs (step 17). Links expire after one use. |
| Reset emails never arrive | The built-in email limit was hit. Set up SMTP (step 19). |
| Refreshing a page gives 404 on Cloudflare | `public/_redirects` must be in the deployed `dist/`. It is copied automatically by `npm run build`. |
| "Cannot find module @rollup/rollup-…" during `npm run build` | A known npm bug with optional packages. Delete `node_modules` and `package-lock.json`, then run `npm install` again. |
| Upload fails with "Payload too large" | The image is still over the bucket limit after compression. Try a smaller original. |
| "This course still has enrolled students" | Archive the course instead of deleting it. |

---

## Updating the system

- **Code changes:** commit and push to `main`. Cloudflare rebuilds and deploys automatically. Pushes to other branches get a separate preview URL.
- **Database changes:** add a new numbered file, e.g. `supabase/migrations/006_….sql`, and run it in the SQL Editor. Never edit migrations that have already been run on the live project. Keep `src/types/database.ts` in step with any table changes.
- **Type check:** `npm run typecheck`.
