export interface Paged<T> {
  rows: T[];
  total: number;
}

export interface PageParams {
  page: number; // 1-based
  pageSize: number;
}

export type SortDir = 'asc' | 'desc';

export interface SortState<K extends string = string> {
  column: K;
  dir: SortDir;
}
