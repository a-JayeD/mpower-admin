import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, CalendarCheck, DatabaseBackup, Download, Users } from 'lucide-react';
import { toast } from 'sonner';
import { exportAttendanceCsv, exportCoursesCsv, exportFullBackup, exportStudentsCsv } from '@/services/export';
import { listCourseOptions } from '@/services/courses';
import { friendlyError } from '@/utils/errors';
import { shiftDate, todayISO } from '@/utils/format';
import { PageHeader, Panel, PanelHeader } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';

function useRunner() {
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (key: string, fn: () => Promise<number>, noun: string) => {
    setBusy(key);
    try {
      const n = await fn();
      toast.success(`Downloaded ${n} ${noun}`);
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(null);
    }
  };
  return { busy, run };
}

function ExportRow({ icon, title, body, children }: { icon: ReactNode; title: string; body: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-trace-soft text-trace-dark">{icon}</div>
        <div>
          <h3 className="font-medium text-ink">{title}</h3>
          <p className="text-sm text-slate-500">{body}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-2">{children}</div>
    </div>
  );
}

export default function BackupPage() {
  const { busy, run } = useRunner();
  const [from, setFrom] = useState(shiftDate(todayISO(), -90));
  const [to, setTo] = useState(todayISO());
  const [courseId, setCourseId] = useState('');
  const [progress, setProgress] = useState('');
  const courses = useQuery({ queryKey: ['course-options', 'all'], queryFn: () => listCourseOptions(true) });

  return (
    <>
      <PageHeader title="Backup & export" description="Download your data regularly. The free Supabase plan does not keep automatic backups you can restore yourself." />
      <div className="space-y-6">
        <Panel>
          <PanelHeader title="Spreadsheet exports" description="CSV files open in Excel or Google Sheets. Bangla text is preserved." />
          <div className="divide-y divide-line">
            <ExportRow icon={<Users className="h-5 w-5" />} title="Students" body="Every student with contact details, status and progress in each course.">
              <Button variant="secondary" icon={<Download className="h-4 w-4" />} loading={busy === 'students'} disabled={!!busy}
                onClick={() => run('students', exportStudentsCsv, 'students')}>Export students</Button>
            </ExportRow>
            <ExportRow icon={<CalendarCheck className="h-5 w-5" />} title="Attendance" body="One row per student per class date.">
              <Field label="From">{(id) => <Input id={id} type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="w-40" />}</Field>
              <Field label="To">{(id) => <Input id={id} type="date" value={to} min={from} max={todayISO()} onChange={(e) => setTo(e.target.value)} className="w-40" />}</Field>
              <Field label="Course">
                {(id) => (
                  <Select id={id} value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-48">
                    <option value="">All courses</option>
                    {courses.data?.map((c) => <option key={c.id} value={c.id}>{c.course_name_en}</option>)}
                  </Select>
                )}
              </Field>
              <Button variant="secondary" icon={<Download className="h-4 w-4" />} loading={busy === 'attendance'} disabled={!!busy}
                onClick={() => run('attendance', () => exportAttendanceCsv(from || undefined, to || undefined, courseId || undefined), 'attendance records')}>
                Export attendance
              </Button>
            </ExportRow>
            <ExportRow icon={<BookOpen className="h-5 w-5" />} title="Courses" body="Names, fees, class counts and status.">
              <Button variant="secondary" icon={<Download className="h-4 w-4" />} loading={busy === 'courses'} disabled={!!busy}
                onClick={() => run('courses', exportCoursesCsv, 'courses')}>Export courses</Button>
            </ExportRow>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Full database backup" description="One JSON file with every table. Use it to rebuild the system on a new Supabase project." />
          <div className="space-y-4 p-4 sm:p-5">
            <BackupNotes />
            <div className="flex flex-wrap items-center gap-3">
              <Button icon={<DatabaseBackup className="h-4 w-4" />} loading={busy === 'full'} disabled={!!busy}
                onClick={() => run('full', async () => {
                  try { return await exportFullBackup((t) => setProgress(t.replace(/_/g, ' '))); }
                  finally { setProgress(''); }
                }, 'rows in total')}>
                Download full backup
              </Button>
              {progress && <span className="text-sm text-slate-500" role="status">Reading {progress}…</span>}
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}

function BackupNotes() {
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
      <li>Store backups somewhere safe and private, such as a password-protected Google Drive folder. They contain student phone numbers and addresses.</li>
      <li>Photos are not inside this file. Download them from Supabase → Storage when you need a complete copy (see the README).</li>
      <li>A weekly backup is a good habit; more often during admission season.</li>
    </ul>
  );
}
