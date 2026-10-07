import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, Plus } from 'lucide-react';
import { getDashboardSummary } from '@/services/dashboard';
import { useAdmin } from '@/hooks/useAuth';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';
import { PageHeader, Panel, PanelHeader } from '@/components/ui/Panel';
import { buttonStyles } from '@/components/ui/Button';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatStrip } from '@/components/dashboard/StatStrip';
import { AttentionPanel, buildNotices } from '@/components/dashboard/AttentionPanel';
import { paths } from '@/routes/paths';
import { formatDate, formatLongDate, relativeTime, todayISO } from '@/utils/format';
import { remainingStatus } from '@/utils/completion';
import { UPDATE_TYPES } from '@/lib/constants';

function greeting() {
  const h = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Dhaka' }).format(new Date()));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function DashboardPage() {
  const admin = useAdmin();
  const q = useQuery({ queryKey: ['dashboard'], queryFn: getDashboardSummary, staleTime: 60_000 });
  const notif = useBrowserNotifications();
  const d = q.data;
  const { notifyOncePerDay } = notif;

  useEffect(() => {
    if (!d) return;
    const parts: string[] = [];
    if (d.missing_attendance.length) parts.push(`${d.missing_attendance.length} class(es) without attendance today`);
    if (d.near_completion.length) parts.push(`${d.near_completion.length} student(s) near course completion`);
    if (parts.length) notifyOncePerDay(d.today, 'M.Power Engineering', parts.join(' · '));
  }, [d, notifyOncePerDay]);

  const firstName = (admin.full_name || admin.email).split(/[\s@]/)[0];

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        description={formatLongDate(todayISO())}
        actions={<>
          <Link to={`${paths.students}?new=1`} className={buttonStyles('secondary')}><Plus className="h-4 w-4" />Add student</Link>
          <Link to={paths.attendance} className={buttonStyles()}><CalendarCheck className="h-4 w-4" />Take attendance</Link>
        </>}
      />

      {q.isError ? <Panel><ErrorState error={q.error} onRetry={() => q.refetch()} /></Panel> : !d ? (
        <div className="space-y-6">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : (
        <div className="space-y-6">
          <StatStrip stats={[
            { label: 'Total students', value: d.total_students, detail: 'Excluding archived', to: paths.students },
            { label: 'Active students', value: d.active_students, to: `${paths.students}?status=active` },
            { label: 'Active courses', value: d.active_courses, to: paths.courses },
            { label: "Today's attendance", value: d.today_present, detail: d.today_present + d.today_absent ? `${d.today_absent} absent` : 'Not taken yet', to: paths.attendance },
            { label: 'Near completion', value: d.near_completion.length, detail: `${d.threshold} or fewer classes left`, highlight: d.near_completion.length > 0 },
          ]} />

          <AttentionPanel notices={buildNotices(d)} notifications={notif} />

          <div className="grid gap-6 lg:grid-cols-5">
            <Panel className="lg:col-span-3">
              <PanelHeader title="Students near course completion" description="Only attended classes count toward completion." />
              {d.near_completion.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500">No one is within {d.threshold} classes of finishing.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {d.near_completion.map((s) => {
                    const st = remainingStatus(s.classes_remaining, d.threshold);
                    return (
                      <li key={s.enrollment_id}>
                        <Link to={paths.student(s.student_id)} className="flex flex-col gap-2 px-5 py-3 hover:bg-trace-soft/40 sm:flex-row sm:items-center sm:gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium text-ink">{s.student_name}</div>
                            <div className="truncate text-sm text-slate-500">{s.course_name_en}</div>
                          </div>
                          <div className="w-full sm:w-40">
                            <ProgressBar value={s.classes_attended} max={s.total_classes} />
                            <div className="mt-1 text-xs tabular-nums text-slate-500">{s.classes_attended} of {s.total_classes} attended</div>
                          </div>
                          <Badge tone={st.tone}>{st.label}</Badge>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <div className="space-y-6 lg:col-span-2">
              <Panel>
                <PanelHeader title="Recently added students" actions={<Link to={paths.students} className="text-sm text-trace-dark hover:underline">View all</Link>} />
                {d.recent_students.length === 0 ? <p className="px-5 py-6 text-sm text-slate-500">No students yet.</p> : (
                  <ul className="divide-y divide-line">
                    {d.recent_students.map((s) => (
                      <li key={s.id}>
                        <Link to={paths.student(s.id)} className="flex items-center gap-3 px-5 py-2.5 hover:bg-trace-soft/40">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-ink">{s.full_name}</div>
                            <div className="text-xs text-slate-500">Joined {formatDate(s.joined_on)}</div>
                          </div>
                          <span className="text-xs text-slate-400">{relativeTime(s.created_at)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
              <Panel>
                <PanelHeader title="Recent updates" actions={<Link to={paths.updates} className="text-sm text-trace-dark hover:underline">Manage</Link>} />
                {d.recent_updates.length === 0 ? <p className="px-5 py-6 text-sm text-slate-500">No news or notices yet.</p> : (
                  <ul className="divide-y divide-line">
                    {d.recent_updates.map((u) => (
                      <li key={u.id} className="flex items-center gap-3 px-5 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-ink">{u.title_en}</div>
                          <div className="text-xs text-slate-500">{UPDATE_TYPES[u.type]}, {formatDate(u.publish_date)}</div>
                        </div>
                        <StatusBadge status={u.is_published ? 'published' : 'draft'} />
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
