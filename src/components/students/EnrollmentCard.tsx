import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarCheck, CheckCircle2, MoreHorizontal, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { EnrollmentProgress } from '@/types/database';
import { enrollmentEditSchema, type EnrollmentEditValues } from '@/lib/validation/schemas';
import { deleteEnrollment, setEnrollmentStatus, updateEnrollment } from '@/services/enrollments';
import { useConfirm } from '@/hooks/useConfirm';
import { ENROLLMENT_STATUSES } from '@/lib/constants';
import { formatDate, plural } from '@/utils/format';
import { remainingStatus } from '@/utils/completion';
import { paths } from '@/routes/paths';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';

export function EnrollmentCard({ e, threshold }: { e: EnrollmentProgress; threshold: number }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reopening, setReopening] = useState(false);
  const st = remainingStatus(e.classes_remaining, threshold);
  const done = e.status === 'completed';

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['enrollments', e.student_id] });
    qc.invalidateQueries({ queryKey: ['student', e.student_id] });
    qc.invalidateQueries({ queryKey: ['students'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const complete = useMutation({
    mutationFn: () => setEnrollmentStatus(e.enrollment_id, 'completed'),
    onSuccess: () => { toast.success('Marked as completed'); refresh(); },
  });
  const remove = useMutation({
    mutationFn: () => deleteEnrollment(e.enrollment_id),
    onSuccess: () => { toast.success('Enrollment removed'); refresh(); },
  });

  const onComplete = async () => {
    setMenu(false);
    if (await confirm({
      title: 'Mark course as completed?',
      message: <>{e.student_name} has attended {e.classes_attended} of {e.total_classes} classes. The course will be marked completed today.</>,
      confirmLabel: 'Mark completed',
    })) complete.mutate();
  };

  const onDelete = async () => {
    setMenu(false);
    if (await confirm({
      title: 'Remove this enrollment?',
      message: <>This permanently deletes the enrollment and <strong>all {plural(e.classes_attended + e.classes_absent, 'attendance record')}</strong> for {e.course_name_en}. Use “Paused” or “Dropped” instead if you want to keep the history.</>,
      confirmLabel: 'Delete enrollment', tone: 'danger', typeToConfirm: 'DELETE',
    })) remove.mutate();
  };

  return (
    <div className={done ? 'rounded-lg border border-trace/40 bg-trace-soft/40 p-4' : 'rounded-lg border border-line bg-white p-4'}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-ink">{e.course_name_en}</div>
          <div className="mt-0.5 text-sm text-slate-500">Joined {formatDate(e.join_date)}</div>
        </div>
        <div className="flex items-center gap-1">
          <StatusBadge status={e.status} label={ENROLLMENT_STATUSES[e.status]} />
          <div className="relative">
            <IconButton label="Enrollment actions" onClick={() => setMenu((m) => !m)}><MoreHorizontal className="h-4 w-4" /></IconButton>
            {menu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-lg border border-line bg-white py-1 text-sm shadow-lift">
                  <button className="flex w-full items-center gap-2 px-3 py-2 hover:bg-slate-50" onClick={() => { setMenu(false); setEditing(true); }}><Pencil className="h-4 w-4" /> Edit enrollment</button>
                  {done ? (
                    <button className="flex w-full items-center gap-2 px-3 py-2 hover:bg-slate-50" onClick={() => { setMenu(false); setReopening(true); }}><RotateCcw className="h-4 w-4" /> Reopen</button>
                  ) : (
                    <button className="flex w-full items-center gap-2 px-3 py-2 hover:bg-slate-50" onClick={onComplete}><CheckCircle2 className="h-4 w-4" /> Mark completed</button>
                  )}
                  <button className="flex w-full items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50" onClick={onDelete}><Trash2 className="h-4 w-4" /> Delete enrollment</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {done ? (
        <div className="mt-4 flex items-center gap-3 rounded-md bg-white/70 px-3 py-2.5">
          <CheckCircle2 className="h-6 w-6 text-trace-dark" />
          <div>
            <div className="font-semibold text-ink">Course completed</div>
            <div className="text-sm text-slate-600">
              {formatDate(e.completion_date)}{e.completed_automatically ? ' — automatically, after the final attended class' : ' — marked manually'}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <ProgressBar value={e.classes_attended} max={e.total_classes} />
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div><dt className="text-xs text-slate-500">Attended</dt><dd className="text-lg font-semibold tabular-nums text-ink">{e.classes_attended}<span className="text-sm font-normal text-slate-400">/{e.total_classes}</span></dd></div>
          <div><dt className="text-xs text-slate-500">Remaining</dt><dd className="text-lg font-semibold tabular-nums text-ink">{e.classes_remaining}</dd></div>
          <div><dt className="text-xs text-slate-500">Absent</dt><dd className="text-lg font-semibold tabular-nums text-ink">{e.classes_absent}</dd></div>
        </dl>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {!done && <Badge tone={st.tone}>{st.label}</Badge>}
        <span className="text-xs text-slate-500">{e.attendance_percentage}% complete{e.last_attended ? `, last attended ${formatDate(e.last_attended)}` : ''}</span>
        {e.status === 'active' && (
          <Link to={`${paths.attendance}?course=${e.course_id}`} className="inline-flex items-center gap-1 text-sm font-medium text-trace-dark hover:underline">
            <CalendarCheck className="h-4 w-4" /> Attendance
          </Link>
        )}
      </div>
      {e.notes && <p className="mt-3 whitespace-pre-line border-t border-line pt-3 text-sm text-slate-600">{e.notes}</p>}

      <EditEnrollmentModal e={e} open={editing} onClose={() => setEditing(false)} onSaved={refresh} />
      <ReopenModal e={e} open={reopening} onClose={() => setReopening(false)} onSaved={refresh} />
    </div>
  );
}

function EditEnrollmentModal({ e, open, onClose, onSaved }: { e: EnrollmentProgress; open: boolean; onClose: () => void; onSaved: () => void }) {
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<EnrollmentEditValues>({ resolver: zodResolver(enrollmentEditSchema) });
  useEffect(() => {
    if (open) reset({ join_date: e.join_date, total_classes: e.total_classes, status: e.status, notes: e.notes });
  }, [open, e, reset]);
  const save = useMutation({
    mutationFn: (v: EnrollmentEditValues) => updateEnrollment(e.enrollment_id, v),
    onSuccess: () => { toast.success('Enrollment updated'); onSaved(); onClose(); },
  });
  const total = Number(watch('total_classes'));
  const status = watch('status');
  const willAutoComplete = status === 'active' && total > 0 && e.classes_attended >= total;

  return (
    <Modal open={open} onClose={onClose} busy={save.isPending} title="Edit enrollment" description={`${e.student_name} — ${e.course_name_en}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="edit-enroll" loading={save.isPending}>Save changes</Button></>}>
      <form id="edit-enroll" onSubmit={handleSubmit((v) => save.mutate(v))} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="Join date" error={errors.join_date?.message}>{(id) => <Input id={id} type="date" {...register('join_date')} />}</Field>
        <Field label="Total classes" error={errors.total_classes?.message}>{(id) => <Input id={id} type="number" min={1} {...register('total_classes')} />}</Field>
        <Field label="Status" className="sm:col-span-2">
          {(id) => <Select id={id} {...register('status')}>{Object.entries(ENROLLMENT_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>}
        </Field>
        {willAutoComplete && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 sm:col-span-2">
            {e.student_name} has already attended {e.classes_attended} classes, so this enrollment will complete again on the next attendance save. Increase total classes to continue.
          </p>
        )}
        <Field label="Notes" className="sm:col-span-2">{(id) => <Textarea id={id} rows={3} {...register('notes')} />}</Field>
      </form>
    </Modal>
  );
}

function ReopenModal({ e, open, onClose, onSaved }: { e: EnrollmentProgress; open: boolean; onClose: () => void; onSaved: () => void }) {
  const needsMore = e.classes_attended >= e.total_classes;
  const [total, setTotal] = useState(e.total_classes);
  useEffect(() => { if (open) setTotal(needsMore ? e.classes_attended + 1 : e.total_classes); }, [open, needsMore, e]);
  const save = useMutation({
    mutationFn: () => setEnrollmentStatus(e.enrollment_id, 'active', total !== e.total_classes ? total : undefined),
    onSuccess: () => { toast.success('Enrollment reopened'); onSaved(); onClose(); },
  });
  const invalid = needsMore && total <= e.classes_attended;
  return (
    <Modal open={open} onClose={onClose} busy={save.isPending} size="sm" title="Reopen enrollment" description={e.course_name_en}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => save.mutate()} loading={save.isPending} disabled={invalid}>Reopen</Button></>}>
      <div className="space-y-4 text-sm text-slate-600">
        <p>The enrollment returns to “In progress” and the completion date is cleared.</p>
        {needsMore && (
          <Field label="New total classes" error={invalid ? `Must be more than ${e.classes_attended} (classes already attended)` : undefined}
            hint={`${e.student_name} has attended all ${e.total_classes} classes, so add extra classes to keep it open.`}>
            {(id, d) => <Input id={id} aria-describedby={d} type="number" min={e.classes_attended + 1} value={total} onChange={(ev) => setTotal(Number(ev.target.value))} />}
          </Field>
        )}
      </div>
    </Modal>
  );
}
