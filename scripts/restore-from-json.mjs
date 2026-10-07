#!/usr/bin/env node
/**
 * Restore a full JSON backup (Backup & export → "Download full backup")
 * into a Supabase project whose migrations have already been run.
 *
 *   npm run restore -- backups/mpower-backup-2026-10-01.json
 *   npm run restore -- backup.json --media=backups/storage/2026-10-01   (also upload photos)
 *   npm run restore -- backup.json --dry-run                           (check only, write nothing)
 *
 * Safe to run more than once: rows are upserted by id.
 * Needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (see .env.restore.example).
 *
 * Administrators: a backup cannot contain passwords. Before restoring into a NEW
 * project, create each admin's login in Supabase → Authentication with the same
 * email. The script matches admins by email and re-links all their history.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { adminClient, BUCKETS, chunk, confirm, fail, parseArgs } from './_shared.mjs';

const args = parseArgs();
const file = args._[0];
const dryRun = Boolean(args['dry-run']);
if (!file) fail('Usage: npm run restore -- <backup.json> [--media=<folder>] [--dry-run] [--yes]');
if (!existsSync(file)) fail(`File not found: ${file}`);

let backup;
try {
  backup = JSON.parse(readFileSync(file, 'utf8'));
} catch (e) {
  fail(`Not a valid JSON file: ${e.message}`);
}
if (backup?.app !== 'mpower-admin' || !backup.tables) fail('This is not an M.Power admin backup file.');
if (backup.version !== 1) fail(`Unsupported backup version ${backup.version}.`);

const T = (name) => backup.tables[name] ?? [];
const supabase = adminClient();

console.log(`\nBackup from ${backup.exported_at}`);
for (const [name, rows] of Object.entries(backup.tables)) console.log(`  ${name.padEnd(18)} ${rows.length}`);
console.log(`\nTarget: ${process.env.SUPABASE_URL}${dryRun ? '  (dry run)' : ''}`);

/* ---------- 1. Map administrators onto logins that exist in this project ---------- */
const authUsers = [];
for (let page = 1; ; page++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) fail(`Could not list Auth users: ${error.message}`);
  authUsers.push(...data.users);
  if (data.users.length < 1000) break;
}
const byId = new Map(authUsers.map((u) => [u.id, u]));
const byEmail = new Map(authUsers.map((u) => [u.email?.toLowerCase(), u]));

/** old admin id → id in this project (or null when the login does not exist) */
const adminMap = new Map();
const admins = [];
for (const a of T('admins')) {
  const user = byId.get(a.id) ?? byEmail.get(String(a.email).toLowerCase());
  adminMap.set(a.id, user?.id ?? null);
  if (user) admins.push({ ...a, id: user.id, email: user.email.toLowerCase() });
  else console.warn(`  ! No login for admin ${a.email}: skipped (their history is kept without a name link).`);
}
const mapAdmin = (id) => (id ? adminMap.get(id) ?? null : null);

if (!admins.some((a) => a.is_active && a.role === 'super_admin')) {
  console.warn('  ! No active super admin will exist after restore. Run supabase/create_first_admin.sql afterwards.');
}

if (dryRun) {
  console.log('\nDry run finished. Nothing was written.');
  process.exit(0);
}
if (!args.yes && !(await confirm('\nRows with the same id will be OVERWRITTEN in the target project.'))) fail('Cancelled.');

/* ---------- 2. Write tables in dependency order ---------- */
async function upsert(table, rows) {
  let n = 0;
  for (const part of chunk(rows)) {
    const { error } = await supabase.from(table).upsert(part, { onConflict: 'id' });
    if (error) fail(`${table}: ${error.message}${error.details ? ` (${error.details})` : ''}`);
    n += part.length;
  }
  console.log(`  ✔ ${table.padEnd(18)} ${n}`);
}

console.log('\nRestoring…');

// The settings table holds exactly one row: replace whatever the seed created.
const settings = T('site_settings')[0];
if (settings) {
  const { error } = await supabase.from('site_settings').delete().neq('id', settings.id);
  if (error) fail(`site_settings: ${error.message}`);
  await upsert('site_settings', [settings]);
}

await upsert('admins', admins);
await upsert('courses', T('courses'));
await upsert('students', T('students').map((s) => ({ ...s, created_by: mapAdmin(s.created_by) })));
await upsert('student_courses', T('student_courses'));
await upsert('attendance', T('attendance').map((r) => ({ ...r, marked_by: mapAdmin(r.marked_by) })));

// Albums and images reference each other: albums first without a cover, then images, then covers.
await upsert('gallery_albums', T('gallery_albums').map((a) => ({ ...a, cover_image_id: null })));
await upsert('gallery_images', T('gallery_images'));
for (const a of T('gallery_albums').filter((x) => x.cover_image_id)) {
  const { error } = await supabase.from('gallery_albums').update({ cover_image_id: a.cover_image_id }).eq('id', a.id);
  if (error) console.warn(`  ! cover for album ${a.title_en}: ${error.message}`);
}

await upsert('updates', T('updates').map((u) => ({ ...u, created_by: mapAdmin(u.created_by) })));
await upsert('instructors', T('instructors'));
await upsert('success_stories', T('success_stories'));
await upsert('faqs', T('faqs'));
await upsert('contact_messages', T('contact_messages'));
await upsert('audit_logs', T('audit_logs').map((l) => ({ ...l, admin_id: mapAdmin(l.admin_id) })));

/* ---------- 3. Re-apply statuses the database recalculated while attendance was inserted ---------- */
await upsert('student_courses', T('student_courses'));
await upsert('students', T('students').map((s) => ({ ...s, created_by: mapAdmin(s.created_by) })));

/* ---------- 4. Optional: upload photos ---------- */
if (typeof args.media === 'string') {
  const types = { '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };
  const walk = (dir) => readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
  console.log('\nUploading photos…');
  for (const bucket of BUCKETS) {
    const root = join(args.media, bucket);
    if (!existsSync(root)) { console.warn(`  ! ${root} not found, skipped`); continue; }
    let ok = 0;
    for (const path of walk(root)) {
      const key = relative(root, path).split(sep).join('/');
      const { error } = await supabase.storage.from(bucket).upload(key, readFileSync(path), {
        upsert: true, cacheControl: '31536000', contentType: types[extname(path).toLowerCase()] ?? 'application/octet-stream',
      });
      if (error) console.warn(`  ! ${bucket}/${key}: ${error.message}`);
      else ok++;
    }
    console.log(`  ✔ ${bucket.padEnd(18)} ${ok}`);
  }
}

console.log('\n✔ Restore complete. Sign in to the dashboard and spot-check a few students and albums.');
console.log('  Delete .env.restore now: it contains the service_role key.\n');
