import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { NewsUpdate } from '@/types/database';
import { updateSchema, type UpdateFormValues } from '@/lib/validation/schemas';
import { saveUpdate } from '@/services/content';
import { publicUrl } from '@/services/storage';
import { useAdmin } from '@/hooks/useAuth';
import { UPDATE_TYPES } from '@/lib/constants';
import { toDhakaLocalInput } from '@/utils/format';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { ImagePicker } from '@/components/ui/ImagePicker';
import { LanguageTabs } from '@/components/ui/LanguageTabs';
import { ToggleRow } from './ToggleRow';

export function UpdateFormModal({ open, onClose, item }: { open: boolean; onClose: () => void; item: NewsUpdate | null }) {
  const admin = useAdmin();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [removed, setRemoved] = useState(false);
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<UpdateFormValues>({ resolver: zodResolver(updateSchema) });

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setRemoved(false);
    reset(item ? {
      type: item.type, title_en: item.title_en, title_bn: item.title_bn, content_en: item.content_en, content_bn: item.content_bn,
      publish_date: toDhakaLocalInput(item.publish_date), is_featured: item.is_featured, is_published: item.is_published,
    } : {
      type: 'news', title_en: '', title_bn: '', content_en: '', content_bn: '',
      publish_date: toDhakaLocalInput(null), is_featured: false, is_published: false,
    });
  }, [open, item, reset]);

  const save = useMutation({
    mutationFn: (v: UpdateFormValues) => saveUpdate(item, v, file, removed, admin.id),
    onSuccess: (u) => {
      toast.success(u.is_published ? 'Saved and published' : 'Saved as draft');
      qc.invalidateQueries({ queryKey: ['updates'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} busy={save.isPending} size="lg" title={item ? 'Edit update' : 'New update'}
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={save.isPending}>Cancel</Button>
        <Button type="submit" form="update-form" loading={save.isPending}>Save</Button>
      </>}>
      <form id="update-form" onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type">
            {(id) => <Select id={id} {...register('type')}>{Object.entries(UPDATE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>}
          </Field>
          <Field label="Publish date" hint="Bangladesh time. Future dates go live automatically." error={errors.publish_date?.message}>
            {(id, d) => <Input id={id} aria-describedby={d} type="datetime-local" {...register('publish_date')} />}
          </Field>
        </div>
        <LanguageTabs
          enHasError={Boolean(errors.title_en || errors.content_en)} bnHasError={Boolean(errors.title_bn || errors.content_bn)}
          en={<>
            <Field label="Title" required error={errors.title_en?.message}>
              {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.title_en} {...register('title_en')} />}
            </Field>
            <Field label="Content" hint="Plain text. Line breaks are kept." error={errors.content_en?.message}>
              {(id, d) => <Textarea id={id} aria-describedby={d} rows={8} {...register('content_en')} />}
            </Field>
          </>}
          bn={<>
            <Field label="শিরোনাম" error={errors.title_bn?.message}>
              {(id, d) => <Input id={id} aria-describedby={d} {...register('title_bn')} />}
            </Field>
            <Field label="বিস্তারিত" error={errors.content_bn?.message}>
              {(id, d) => <Textarea id={id} aria-describedby={d} rows={8} {...register('content_bn')} />}
            </Field>
          </>}
        />
        <ImagePicker label="Cover image" currentUrl={publicUrl(item?.cover_image_path)} file={file} onFile={setFile} removed={removed} onRemove={setRemoved} />
        <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
          <ToggleRow control={control} name="is_published" label="Published" description="Visible on the website from the publish date." />
          <ToggleRow control={control} name="is_featured" label="Featured" description="Highlighted on the home page." />
        </div>
      </form>
    </Modal>
  );
}
