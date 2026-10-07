import { Link } from 'react-router-dom';
import { Bell, BellRing, CalendarX2, CheckCircle2, Hourglass, Mail } from 'lucide-react';
import type { ReactNode } from 'react';
import type { DashboardSummary } from '@/types/database';
import { paths } from '@/routes/paths';
import { plural } from '@/utils/format';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';

interface Notice { key: string; icon: ReactNode; text: ReactNode; to?: string; action?: string; tone: 'red' | 'amber' | 'trace' | 'neutral' }

export function buildNotices(d: DashboardSummary): Notice[] {
  const n: Notice[] = [];
  for (const c of d.missing_attendance) {
    n.push({
      key: `m${c.course_id}`, tone: 'red', icon: <CalendarX2 className="h-4 w-4" />,
      text: <>Attendance for today’s <strong>{c.course_name_en}</strong> class has not been recorded.</>,
      to: `${paths.attendance}?course=${c.course_id}&date=${d.today}`, action: 'Take attendance',
    });
  }
  // Group "N students have X classes remaining"
  const byRemaining = new Map<number, typeof d.near_completion>();
  for (const s of d.near_completion) byRemaining.set(s.classes_remaining, [...(byRemaining.get(s.classes_remaining) ?? []), s]);
  [...byRemaining.entries()].sort((a, b) => a[0] - b[0]).forEach(([rem, list]) => {
    const who = list.length === 1 ? <strong>{list[0].student_name}</strong> : <strong>{plural(list.length, 'student')}</strong>;
    n.push({
      key: `r${rem}`, tone: rem <= 1 ? 'red' : 'amber', icon: <Hourglass className="h-4 w-4" />,
      text: rem === 1
        ? <>{who} {list.length === 1 ? 'has' : 'have'} the final class remaining.</>
        : <>{who} {list.length === 1 ? 'has' : 'have'} {rem} classes remaining.</>,
      to: list.length === 1 ? paths.student(list[0].student_id) : undefined,
      action: list.length === 1 ? 'View student' : undefined,
    });
  });
  for (const c of d.recently_completed.slice(0, 5)) {
    n.push({
      key: `c${c.enrollment_id}`, tone: 'trace', icon: <CheckCircle2 className="h-4 w-4" />,
      text: <><strong>{c.student_name}</strong> has completed {c.course_name_en}.</>,
      to: paths.student(c.student_id), action: 'View',
    });
  }
  if (d.unread_messages > 0) {
    n.push({
      key: 'msg', tone: 'neutral', icon: <Mail className="h-4 w-4" />,
      text: <>{plural(d.unread_messages, 'new contact message')} from the website.</>, to: paths.messages, action: 'Open inbox',
    });
  }
  return n;
}

const toneCls = {
  red: 'bg-red-50 text-red-600', amber: 'bg-amber-50 text-amber-600', trace: 'bg-trace-soft text-trace-dark', neutral: 'bg-slate-100 text-slate-600',
};

export function AttentionPanel({ notices, notifications }: {
  notices: Notice[];
  notifications: { supported: boolean; permission: NotificationPermission; request: () => void };
}) {
  return (
    <Panel>
      <PanelHeader
        title="Needs attention"
        description={notices.length ? `${plural(notices.length, 'item')} to review` : undefined}
        actions={notifications.supported && notifications.permission === 'default' ? (
          <Button size="sm" variant="secondary" icon={<BellRing className="h-4 w-4" />} onClick={notifications.request}>Turn on browser alerts</Button>
        ) : null}
      />
      {notices.length === 0 ? (
        <div className="flex items-center gap-3 px-5 py-6 text-sm text-slate-500">
          <Bell className="h-4 w-4 text-signal" /> Everything is up to date.
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {notices.map((n) => (
            <li key={n.key} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', toneCls[n.tone])}>{n.icon}</span>
              <p className="flex-1 text-sm text-slate-700">{n.text}</p>
              {n.to && n.action && (
                <Link to={n.to} className="shrink-0 rounded-md px-2.5 py-1.5 text-sm font-medium text-trace-dark hover:bg-trace-soft">{n.action}</Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
