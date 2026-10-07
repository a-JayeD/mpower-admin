import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Student } from '@/types/database';
import { studentSchema, type StudentFormValues } from '@/lib/validation/schemas';
import { createStudent, updateStudent } from '@/services/students';
import { useAdmin } from '@/hooks/useAuth';
import { useSignedPhotos } from '@/hooks/useSignedPhotos';
import { STUDENT_STATUSES } from '@/lib/constants';
import { todayISO } from '@/utils/format';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { ImagePicker } from '@/components/ui/ImagePicker';

export function StudentFormModal({ open, onClose, student, onSaved }: {
  open: boolean; onClose: () => void; student: Student | null; onSaved?: (s: Student) => void;
}) {
  const admin = useAdmin();
  const qc = useQueryClient();
  const [photo, setPhoto] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const signed = useSignedPhotos(student?.photo_path ? [student.photo_path] : []);

  const form = useForm<StudentFormValues>({ resolver: zodResolver(studentSchema) });
  const { register, handleSubmit, reset, formState: { errors } } = form;

  useEffect(() => {
    if (!open) return;
    setPhoto(null);
    setRemovePhoto(false);
    reset(student ? {
      full_name: student.full_name, phone: student.phone, address: student.address,
      joined_on: student.joined_on, notes: student.notes, status: student.status,
    } : { full_name: '', phone: '', address: '', joined_on: todayISO(), notes: '', status: 'active' });
  }, [open, student, reset]);

  const save = useMutation({
    mutationFn: (v: StudentFormValues) => student ? updateStudent(student, v, photo, removePhoto) : createStudent(v, photo, admin.id),
    onSuccess: (s) => {
      toast.success(student ? 'Student updated' : 'Student added');
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['student', s.id] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      onSaved?.(s);
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} busy={save.isPending} size="lg"
      title={student ? 'Edit student' : 'Add student'}
      description="Student records are private and never shown on the public website."
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={save.isPending}>Cancel</Button>
        <Button type="submit" form="student-form" loading={save.isPending}>{student ? 'Save changes' : 'Add student'}</Button>
      </>}>
      <form id="student-form" onSubmit={handleSubmit((v) => save.mutate(v))} className="grid gap-4 sm:grid-cols-2" noValidate>
        <div className="sm:col-span-2">
          <ImagePicker label="Photo" shape="round" currentUrl={student?.photo_path ? signed[student.photo_path] ?? null : null}
            file={photo} onFile={setPhoto} removed={removePhoto} onRemove={setRemovePhoto}
            hint="Optional. Stored privately; resized to 600 px." />
        </div>
        <Field label="Full name" required error={errors.full_name?.message}>
          {(id, d) => <Input id={id} aria-describedby={d} autoComplete="off" aria-invalid={!!errors.full_name} {...register('full_name')} />}
        </Field>
        <Field label="Phone" required error={errors.phone?.message}>
          {(id, d) => <Input id={id} aria-describedby={d} type="tel" inputMode="tel" placeholder="01XXXXXXXXX" aria-invalid={!!errors.phone} {...register('phone')} />}
        </Field>
        <Field label="Address" className="sm:col-span-2" error={errors.address?.message}>
          {(id, d) => <Textarea id={id} aria-describedby={d} rows={2} {...register('address')} />}
        </Field>
        <Field label="Joined the center on" required error={errors.joined_on?.message}>
          {(id, d) => <Input id={id} aria-describedby={d} type="date" max={todayISO()} {...register('joined_on')} />}
        </Field>
        <Field label="Status" error={errors.status?.message}>
          {(id) => (
            <Select id={id} {...register('status')}>
              {Object.entries(STUDENT_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Notes" className="sm:col-span-2" hint="Internal only." error={errors.notes?.message}>
          {(id, d) => <Textarea id={id} aria-describedby={d} rows={3} {...register('notes')} />}
        </Field>
      </form>
    </Modal>
  );
}
