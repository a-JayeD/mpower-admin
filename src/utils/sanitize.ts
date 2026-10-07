/**
 * Content is stored as plain text and rendered by React (which escapes
 * HTML). These helpers additionally strip markup and control characters
 * before anything is saved, so the public website can safely render it too.
 */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const TAGS = /<\/?[a-z][^>]*>/gi;

export function sanitizeText(input: string): string {
  return input.replace(CONTROL_CHARS, '').replace(TAGS, '').replace(/\r\n/g, '\n').trim();
}

export function sanitizeRecord<T extends object>(record: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) out[k] = typeof v === 'string' ? sanitizeText(v) : v;
  return out as T;
}

/** Make a user search term safe for PostgREST `or()` / `ilike` filters. */
export function searchTerm(input: string): string {
  return input.replace(/[%_,()*\\:."']/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
}

export function isSafeHttpUrl(value: string): boolean {
  if (!value) return true;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}
