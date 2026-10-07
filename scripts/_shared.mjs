/**
 * Shared helpers for the local maintenance scripts.
 * These scripts run ONLY on your own computer, never in the browser or on Cloudflare.
 */
import { existsSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { createClient } from '@supabase/supabase-js';

export const BUCKETS = ['public-media', 'student-photos'];

/** Load KEY=value pairs from .env.restore (if present) without overriding real env vars. */
function loadEnvFile(file = '.env.restore') {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    const value = m[2].replace(/^['"]|['"]$/g, '');
    if (!(m[1] in process.env)) process.env[m[1]] = value;
  }
}

export function adminClient() {
  loadEnvFile();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    fail('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.restore.example).');
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function parseArgs(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (const a of argv) {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (m) out[m[1]] = m[2] ?? true;
    else out._.push(a);
  }
  return out;
}

export async function confirm(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`${question} Type YES to continue: `);
  rl.close();
  return answer.trim() === 'YES';
}

export function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

export function chunk(rows, size = 500) {
  const out = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

/** Recursively list every file in a bucket as { path, size }. */
export async function listAllFiles(supabase, bucket, prefix = '') {
  const files = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw error;
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) files.push(...(await listAllFiles(supabase, bucket, path))); // folder
      else if (item.name !== '.emptyFolderPlaceholder') files.push({ path, size: item.metadata?.size ?? -1 });
    }
    if (data.length < 1000) break;
  }
  return files;
}
