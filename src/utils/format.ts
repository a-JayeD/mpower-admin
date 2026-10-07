const DHAKA_TZ = 'Asia/Dhaka';

/** Today's date in Bangladesh as YYYY-MM-DD, regardless of device timezone. */
export function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: DHAKA_TZ }).format(new Date());
}

export function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDate(value: string | null | undefined, opts: Intl.DateTimeFormatOptions = {}): string {
  if (!value) return '—';
  const dateOnly = value.length === 10;
  const d = dateOnly ? new Date(`${value}T00:00:00Z`) : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    timeZone: dateOnly ? 'UTC' : DHAKA_TZ,
    ...opts,
  }).format(d);
}

export function formatDateTime(value: string | null | undefined): string {
  return formatDate(value, { hour: '2-digit', minute: '2-digit' });
}

export function formatLongDate(iso: string): string {
  return formatDate(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatMoney(value: number | null | undefined): string {
  if (value == null) return '—';
  return `৳${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value)}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function relativeTime(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return formatDate(value);
}

/** ISO timestamp → value for <input type="datetime-local"> in Bangladesh time. */
export function toDhakaLocalInput(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  return new Date(d.getTime() + 6 * 3600_000).toISOString().slice(0, 16);
}
