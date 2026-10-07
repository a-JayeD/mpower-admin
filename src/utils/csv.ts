type Cell = string | number | boolean | null | undefined;

function escapeCell(value: Cell): string {
  if (value == null) return '';
  let s = String(value);
  // Neutralise spreadsheet formula injection (=, +, -, @ at start).
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv<T>(rows: T[], columns: Array<{ header: string; value: (row: T) => Cell }>): string {
  const head = columns.map((c) => escapeCell(c.header)).join(',');
  const body = rows.map((r) => columns.map((c) => escapeCell(c.value(r))).join(','));
  return [head, ...body].join('\r\n');
}

export function downloadFile(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  // BOM so Excel opens Bangla text correctly.
  const prefix = mime.startsWith('text/csv') ? '\uFEFF' : '';
  const blob = new Blob([prefix + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
