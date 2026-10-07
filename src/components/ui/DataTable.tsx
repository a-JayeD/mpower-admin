import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { SortState } from '@/types/common';
import { cn } from '@/utils/cn';

export interface Column<T, K extends string = string> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortKey?: K;
  className?: string;
  /** Hide below this breakpoint to keep tables readable on phones. */
  hideBelow?: 'sm' | 'md' | 'lg';
}

const hide = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell' };

export function DataTable<T, K extends string = string>({
  columns, rows, rowKey, sort, onSort, onRowClick,
}: {
  columns: Column<T, K>[];
  rows: T[];
  rowKey: (row: T) => string;
  sort?: SortState<K>;
  onSort?: (s: SortState<K>) => void;
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line bg-slate-50/70 text-xs font-medium text-slate-500">
          <tr>
            {columns.map((c) => {
              const active = sort && c.sortKey && sort.column === c.sortKey;
              return (
                <th key={c.key} scope="col" className={cn('px-4 py-2.5 font-medium', c.hideBelow && hide[c.hideBelow], c.className)}
                  aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                  {c.sortKey && onSort ? (
                    <button type="button" className="inline-flex items-center gap-1 hover:text-ink"
                      onClick={() => onSort({ column: c.sortKey!, dir: active && sort!.dir === 'asc' ? 'desc' : 'asc' })}>
                      {c.header}
                      {active ? (sort!.dir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />)
                        : <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />}
                    </button>
                  ) : c.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={rowKey(r)} onClick={onRowClick ? () => onRowClick(r) : undefined}
              className={cn('align-middle', onRowClick && 'cursor-pointer hover:bg-trace-soft/40')}>
              {columns.map((c) => (
                <td key={c.key} className={cn('px-4 py-3', c.hideBelow && hide[c.hideBelow], c.className)}>{c.cell(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
