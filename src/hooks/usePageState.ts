import { useEffect, useState } from 'react';

/** Page number that resets to 1 whenever any filter changes. */
export function usePageState(deps: unknown[]) {
  const [page, setPage] = useState(1);
  const key = JSON.stringify(deps);
  useEffect(() => setPage(1), [key]);
  return [page, setPage] as const;
}
