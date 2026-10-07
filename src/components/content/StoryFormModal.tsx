import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { SuccessStory } from '@/types/database';
import { storySchema, type StoryFormValues } from '@/lib/validation/schemas';
import { saveStory } from '@/services/content';
import { listCourseOptions } from '@/services/courses';
import { publicUrl } from '@/services/storage';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { ImagePicker } from '@/components/ui/ImagePicker';
import { LanguageTabs } from '@/components/ui/LanguageTabs';
import { ToggleRow } from './ToggleRow';

export function StoryFormModal({ open, onClose, item, nextOrder }: {
  open: boolean; onClose: () => void; item: SuccessStory | null; nextOrder: number;
}) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [removed, setRemoved] = useState(false);
  const courses = useQuery({ queryKey: ['course-options', 'all'], queryFn: () => listCourseOptions(true), enabled: open });
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<StoryFormValues>({ resolver: zodResolver(storySchema) });

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setRemoved(false);
    reset(item ? {
      student_name: item.student_name, course_id: item.course_id ?? '', story_en: item.story_en, story_bn: item.story_bn,
      is_published: item.is_published, is_featured: item.is_featured, display_order: item.display_order,
    } : { student_name: '', course_id: '', story_en: '', story_bn: '', is_published: false, is_featured: false, display_order: nextOrder });
  }, [open, item, reset, nextOrder]);

  const save = useMutation({
    mutationFn: (v: StoryFormValues) => saveStory(item, v, file, removed),
    onSuccess: () => { toast.success(item ? 'Story updated' : 'Story added'); qc.invalidateQueries({ queryKey: ['stories'] }); onClose(); },
  });

  return (
    <Modal open={open} onClose={onClose} busy={save.isPending} size="lg" title={item ? 'Edit success story' : 'New success story'}
      description="Write only what the student agreed to share publicly. Nothing is copied from student records."
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={save.isPending}>Cancel</Button>
        <Button type="submit" form="story-form" loading={save.isPending}>Save</Button>
      </>}>
      <form id="story-form" onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
          <ImagePicker label="Photo" shape="round" currentUrl={publicUrl(item?.photo_path)} file={file} onFile={setFile} removed={removed} onRemove={setRemoved} hint="Optional." />
          <div className="space-y-4">
            <Field label="Name to display" required error={errors.student_name?.message}>
              {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.student_name} {...register('student_name')} />}
            </Field>
            <Field label="Course" hint="Optional.">
              {(id) => (
                <Select id={id} {...register('course_id')}>
                  <option value="">No course</option>
                  {courses.data?.map((c) => <option key={c.id} value={c.id}>{c.course_name_en}</option>)}
                </Select>
              )}
            </Field>
          </div>
        </div>
        <LanguageTabs enHasError={!!errors.story_en} bnHasError={!!errors.story_bn}
          en={<Field label="Story" error={errors.story_en?.message}>{(id, d) => <Textarea id={id} aria-describedby={d} rows={7} {...register('story_en')} />}</Field>}
          bn={<Field label="গল্প" error={errors.story_bn?.message}>{(id, d) => <Textarea id={id} aria-describedby={d} rows={7} {...register('story_bn')} />}</Field>}
        />
        <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
          <ToggleRow control={control} name="is_published" label="Published" description="Only published stories appear on the website." />
          <ToggleRow control={control} name="is_featured" label="Featured" description="Highlighted on the home page." />
        </div>
      </form>
    </Modal>
  );
}
