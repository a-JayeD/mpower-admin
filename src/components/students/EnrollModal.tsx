import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { enrollmentSchema, type EnrollmentFormValues } from '@/lib/validation/schemas';
import { listCourseOptions } from '@/services/courses';
import { enrollStudent } from '@/services/enrollments';
import { todayISO } from '@/utils/format';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';

export function EnrollModal({ open, onClose, studentId, studentName, excludeCourseIds }: {
  open: boolean; onClose: () => void; studentId: string; studentName: string; excludeCourseIds: string[];
}) {
  const qc = useQueryClient();
  const courses = useQuery({ queryKey: ['course-options'], queryFn: () => listCourseOptions(), enabled: open });
  const available = (courses.data ?? []).filter((c) => !excludeCourseIds.includes(c.id));
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<EnrollmentFormValues>({
    resolver: zodResolver(enrollmentSchema),
  });

  useEffect(() => {
    if (open) reset({ course_id: '', join_date: todayISO(), total_classes: 1, notes: '' });
  }, [open, reset]);

  // Copy the course's class count at enrollment time (editable).
  const courseId = watch('course_id');
  useEffect(() => {
    const c = courses.data?.find((x) => x.id === courseId);
    if (c) setValue('total_classes', c.total_classes);
  }, [courseId, courses.data, setValue]);

  const save = useMutation({
    mutationFn: (v: EnrollmentFormValues) => enrollStudent(studentId, v),
    onSuccess: () => {
      toast.success('Enrolled');
      qc.invalidateQueries({ queryKey: ['enrollments', studentId] });
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} busy={save.isPending} title="Enroll in a course" description={studentName}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="enroll-form" loading={save.isPending} disabled={!available.length}>Enroll</Button>
      </>}>
      <form id="enroll-form" onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4" noValidate>
        <Field label="Course" required error={errors.course_id?.message}>
          {(id) => (
            <Select id={id} {...register('course_id')}>
              <option value="">{courses.isLoading ? 'Loading courses…' : available.length ? 'Choose a course' : 'No other open courses'}</option>
              {available.map((c) => <option key={c.id} value={c.id}>{c.course_name_en}{c.status === 'upcoming' ? ' (upcoming)' : ''}</option>)}
            </Select>
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Join date" required error={errors.join_date?.message}>
            {(id) => <Input id={id} type="date" {...register('join_date')} />}
          </Field>
          <Field label="Classes in this enrollment" required error={errors.total_classes?.message}
            hint="Copied from the course. Later course changes won’t affect it.">
            {(id, d) => <Input id={id} aria-describedby={d} type="number" min={1} max={500} inputMode="numeric" {...register('total_classes')} />}
          </Field>
        </div>
        <Field label="Notes" error={errors.notes?.message}>
          {(id) => <Textarea id={id} rows={2} {...register('notes')} />}
        </Field>
      </form>
    </Modal>
  );
}
