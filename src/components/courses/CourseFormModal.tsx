import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Course } from '@/types/database';
import { courseSchema, type CourseFormValues } from '@/lib/validation/schemas';
import { saveCourse } from '@/services/courses';
import { publicUrl } from '@/services/storage';
import { COURSE_STATUSES, WEEKDAYS } from '@/lib/constants';
import { cn } from '@/utils/cn';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { ImagePicker } from '@/components/ui/ImagePicker';
import { LanguageTabs } from '@/components/ui/LanguageTabs';

const empty: CourseFormValues = {
  course_name_en: '', course_name_bn: '', description_en: '', description_bn: '',
  joining_fee: 0, total_classes: 20, duration_en: '', duration_bn: '', class_days: [], status: 'active', display_order: 0,
};

export function CourseFormModal({ open, onClose, course }: { open: boolean; onClose: () => void; course: Course | null }) {
  const qc = useQueryClient();
  const [image, setImage] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
  });

  useEffect(() => {
    if (!open) return;
    setImage(null);
    setRemoveImage(false);
    reset(course ? {
      course_name_en: course.course_name_en, course_name_bn: course.course_name_bn,
      description_en: course.description_en, description_bn: course.description_bn,
      joining_fee: Number(course.joining_fee), total_classes: course.total_classes,
      duration_en: course.duration_en, duration_bn: course.duration_bn,
      class_days: course.class_days ?? [], status: course.status, display_order: course.display_order,
    } : empty);
  }, [open, course, reset]);

  const save = useMutation({
    mutationFn: (v: CourseFormValues) => saveCourse(course, v, image, removeImage),
    onSuccess: () => {
      toast.success(course ? 'Course updated' : 'Course added');
      qc.invalidateQueries({ queryKey: ['courses'] });
      qc.invalidateQueries({ queryKey: ['course-options'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} busy={save.isPending} size="lg"
      title={course ? 'Edit course' : 'Add course'}
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={save.isPending}>Cancel</Button>
        <Button type="submit" form="course-form" loading={save.isPending}>{course ? 'Save changes' : 'Add course'}</Button>
      </>}>
      <form id="course-form" onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-5" noValidate>
        <LanguageTabs
          enHasError={Boolean(errors.course_name_en || errors.description_en || errors.duration_en)}
          bnHasError={Boolean(errors.course_name_bn || errors.description_bn || errors.duration_bn)}
          en={<>
            <Field label="Course name" required error={errors.course_name_en?.message}>
              {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.course_name_en} {...register('course_name_en')} />}
            </Field>
            <Field label="Duration" hint="e.g. 3 months" error={errors.duration_en?.message}>
              {(id, d) => <Input id={id} aria-describedby={d} {...register('duration_en')} />}
            </Field>
            <Field label="Description" error={errors.description_en?.message}>
              {(id, d) => <Textarea id={id} aria-describedby={d} rows={5} {...register('description_en')} />}
            </Field>
          </>}
          bn={<>
            <Field label="কোর্সের নাম" error={errors.course_name_bn?.message}>
              {(id, d) => <Input id={id} aria-describedby={d} {...register('course_name_bn')} />}
            </Field>
            <Field label="মেয়াদ" hint="যেমন: ৩ মাস" error={errors.duration_bn?.message}>
              {(id, d) => <Input id={id} aria-describedby={d} {...register('duration_bn')} />}
            </Field>
            <Field label="বিবরণ" error={errors.description_bn?.message}>
              {(id, d) => <Textarea id={id} aria-describedby={d} rows={5} {...register('description_bn')} />}
            </Field>
          </>}
        />

        <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-3">
          <Field label="Joining fee (৳)" required error={errors.joining_fee?.message}>
            {(id, d) => <Input id={id} aria-describedby={d} type="number" min={0} step="1" inputMode="decimal" {...register('joining_fee')} />}
          </Field>
          <Field label="Number of classes" required error={errors.total_classes?.message}
            hint={course ? 'Existing enrollments keep their own count.' : undefined}>
            {(id, d) => <Input id={id} aria-describedby={d} type="number" min={1} step="1" inputMode="numeric" {...register('total_classes')} />}
          </Field>
          <Field label="Status" error={errors.status?.message}>
            {(id) => (
              <Select id={id} {...register('status')}>
                {Object.entries(COURSE_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            )}
          </Field>
        </div>

        <Controller control={control} name="class_days" render={({ field }) => (
          <fieldset>
            <legend className="text-sm font-medium text-slate-700">Class days</legend>
            <p className="mb-2 text-xs text-slate-500">Used to remind you when attendance has not been taken. Leave empty for flexible schedules.</p>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((label, day) => {
                const on = field.value?.includes(day);
                return (
                  <button key={label} type="button" aria-pressed={on}
                    onClick={() => field.onChange(on ? field.value.filter((d) => d !== day) : [...(field.value ?? []), day].sort())}
                    className={cn('h-10 w-14 rounded-md border text-sm font-medium transition-colors',
                      on ? 'border-trace bg-trace-soft text-trace-dark' : 'border-line bg-white text-slate-600 hover:border-slate-300')}>
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )} />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <ImagePicker label="Course image" currentUrl={publicUrl(course?.image_path)} file={image} onFile={setImage}
              removed={removeImage} onRemove={setRemoveImage} />
          </div>
          <Field label="Display order" hint="Lower numbers show first on the website." error={errors.display_order?.message}>
            {(id, d) => <Input id={id} aria-describedby={d} type="number" min={0} {...register('display_order')} />}
          </Field>
        </div>
      </form>
    </Modal>
  );
}
