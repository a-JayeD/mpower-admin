import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Instructor } from '@/types/database';
import { instructorSchema, type InstructorFormValues } from '@/lib/validation/schemas';
import { saveInstructor } from '@/services/content';
import { publicUrl } from '@/services/storage';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { ImagePicker } from '@/components/ui/ImagePicker';
import { LanguageTabs } from '@/components/ui/LanguageTabs';
import { ToggleRow } from './ToggleRow';

export function InstructorFormModal({ open, onClose, item, nextOrder }: {
  open: boolean; onClose: () => void; item: Instructor | null; nextOrder: number;
}) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [removed, setRemoved] = useState(false);
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<InstructorFormValues>({ resolver: zodResolver(instructorSchema) });

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setRemoved(false);
    reset(item ? {
      name_en: item.name_en, name_bn: item.name_bn, position_en: item.position_en, position_bn: item.position_bn,
      bio_en: item.bio_en, bio_bn: item.bio_bn, specialization: item.specialization, display_order: item.display_order, is_active: item.is_active,
    } : { name_en: '', name_bn: '', position_en: '', position_bn: '', bio_en: '', bio_bn: '', specialization: '', display_order: nextOrder, is_active: true });
  }, [open, item, reset, nextOrder]);

  const save = useMutation({
    mutationFn: (v: InstructorFormValues) => saveInstructor(item, v, file, removed),
    onSuccess: () => { toast.success(item ? 'Instructor updated' : 'Instructor added'); qc.invalidateQueries({ queryKey: ['instructors'] }); onClose(); },
  });

  return (
    <Modal open={open} onClose={onClose} busy={save.isPending} size="lg" title={item ? 'Edit instructor' : 'Add instructor'}
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={save.isPending}>Cancel</Button>
        <Button type="submit" form="instructor-form" loading={save.isPending}>Save</Button>
      </>}>
      <form id="instructor-form" onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-5" noValidate>
        <ImagePicker label="Photo" shape="round" currentUrl={publicUrl(item?.photo_path)} file={file} onFile={setFile} removed={removed} onRemove={setRemoved} />
        <LanguageTabs
          enHasError={Boolean(errors.name_en || errors.position_en || errors.bio_en)} bnHasError={Boolean(errors.name_bn || errors.position_bn || errors.bio_bn)}
          en={<>
            <Field label="Name" required error={errors.name_en?.message}>
              {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.name_en} {...register('name_en')} />}
            </Field>
            <Field label="Position" hint="e.g. Senior Instructor, PLC & Automation" error={errors.position_en?.message}>
              {(id, d) => <Input id={id} aria-describedby={d} {...register('position_en')} />}
            </Field>
            <Field label="Short biography" error={errors.bio_en?.message}>
              {(id, d) => <Textarea id={id} aria-describedby={d} rows={4} {...register('bio_en')} />}
            </Field>
          </>}
          bn={<>
            <Field label="নাম" error={errors.name_bn?.message}>{(id, d) => <Input id={id} aria-describedby={d} {...register('name_bn')} />}</Field>
            <Field label="পদবি" error={errors.position_bn?.message}>{(id, d) => <Input id={id} aria-describedby={d} {...register('position_bn')} />}</Field>
            <Field label="সংক্ষিপ্ত পরিচিতি" error={errors.bio_bn?.message}>{(id, d) => <Textarea id={id} aria-describedby={d} rows={4} {...register('bio_bn')} />}</Field>
          </>}
        />
        <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
          <Field label="Specialization" hint="e.g. Industrial automation, PCB design" error={errors.specialization?.message}>
            {(id, d) => <Input id={id} aria-describedby={d} {...register('specialization')} />}
          </Field>
          <ToggleRow control={control} name="is_active" label="Active" description="Inactive instructors are hidden from the website." />
        </div>
      </form>
    </Modal>
  );
}
