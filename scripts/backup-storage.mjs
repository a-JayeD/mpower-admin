#!/usr/bin/env node
/**
 * Download every photo from Supabase Storage to your computer.
 *
 *   npm run backup:storage                      → backups/storage/<date>/
 *   npm run backup:storage -- --out=D:/mpower   → custom folder
 *
 * Files already downloaded (same size) are skipped, so re-running is cheap.
 */
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { adminClient, BUCKETS, listAllFiles, parseArgs } from './_shared.mjs';

const args = parseArgs();
const today = new Date().toISOString().slice(0, 10);
const outDir = typeof args.out === 'string' ? args.out : join('backups', 'storage', today);
const supabase = adminClient();

let downloaded = 0;
let skipped = 0;
let failed = 0;
let bytes = 0;

for (const bucket of BUCKETS) {
  const files = await listAllFiles(supabase, bucket);
  console.log(`${bucket}: ${files.length} files`);
  for (const [i, { path, size }] of files.entries()) {
    const target = join(outDir, bucket, ...path.split('/'));
    if (existsSync(target) && statSync(target).size === size) { skipped++; continue; }
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error) { failed++; console.warn(`  ! ${path}: ${error.message}`); continue; }
    const buf = Buffer.from(await data.arrayBuffer());
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, buf);
    downloaded++;
    bytes += buf.length;
    if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${files.length}`);
  }
}

console.log(`\n✔ ${downloaded} downloaded, ${skipped} unchanged, ${failed} failed (${(bytes / 1048576).toFixed(1)} MB) → ${outDir}`);
console.log('  Restore with: npm run restore -- <backup.json> --media=' + outDir);
if (failed) process.exitCode = 1;
