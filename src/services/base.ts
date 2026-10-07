import type { PostgrestError } from '@supabase/supabase-js';
import type { PageParams } from '@/types/common';

/** Throw Supabase errors so React Query surfaces them consistently. */
export function unwrap<T>(result: { data: T | null; error: PostgrestError | null }): T {
  if (result.error) throw result.error;
  return result.data as T;
}

export function pageRange({ page, pageSize }: PageParams): [number, number] {
  const from = (page - 1) * pageSize;
  return [from, from + pageSize - 1];
}

/** Fetch every row of a query in chunks (used by exports/backups). */
export async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
  chunk = 1000,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += chunk) {
    const rows = unwrap(await build(from, from + chunk - 1)) ?? [];
    out.push(...rows);
    if (rows.length < chunk) break;
  }
  return out;
}
