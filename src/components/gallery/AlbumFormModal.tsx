import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { GalleryAlbum } from '@/types/database';
import { albumSchema, type AlbumFormValues } from '@/lib/validation/schemas';
import { saveAlbum } from '@/services/gallery';
import { ALBUM_CATEGORIES } from '@/lib/constants';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { LanguageTabs } from '@/components/ui/LanguageTabs';
import { ToggleRow } from '@/components/content/ToggleRow';

export function AlbumFormModal({ open, onClose, album, onSaved }: {
  open: boolean; onClose: () => void; album: GalleryAlbum | null; onSaved?: (a: GalleryAlbum) => void;
}) {
  const qc = useQueryClient();
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<AlbumFormValues>({ resolver: zodResolver(albumSchema) });

  useEffect(() => {
    if (!open) return;
    reset(album ? {
      title_en: album.title_en, title_bn: album.title_bn, description_en: album.description_en, description_bn: album.description_bn,
      category: album.category, is_published: album.is_published,
    } : { title_en: '', title_bn: '', description_en: '', description_bn: '', category: 'training', is_published: false });
  }, [open, album, reset]);

  const save = useMutation({
    mutationFn: (v: AlbumFormValues) => saveAlbum(album, v),
    onSuccess: (a) => {
      toast.success(album ? 'Album updated' : 'Album created');
      qc.invalidateQueries({ queryKey: ['albums'] });
      qc.invalidateQueries({ queryKey: ['album', a.id] });
      onSaved?.(a);
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} busy={save.isPending} size="lg" title={album ? 'Edit album' : 'New album'}
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={save.isPending}>Cancel</Button>
        <Button type="submit" form="album-form" loading={save.isPending}>{album ? 'Save' : 'Create album'}</Button>
      </>}>
      <form id="album-form" onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-5" noValidate>
        <Field label="Category">
          {(id) => <Select id={id} {...register('category')}>{Object.entries(ALBUM_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>}
        </Field>
        <LanguageTabs
          enHasError={Boolean(errors.title_en || errors.description_en)} bnHasError={Boolean(errors.title_bn || errors.description_bn)}
          en={<>
            <Field label="Title" required error={errors.title_en?.message}>
              {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.title_en} placeholder="e.g. PLC workshop, March 2026" {...register('title_en')} />}
            </Field>
            <Field label="Description" error={errors.description_en?.message}>{(id, d) => <Textarea id={id} aria-describedby={d} rows={3} {...register('description_en')} />}</Field>
          </>}
          bn={<>
            <Field label="শিরোনাম" error={errors.title_bn?.message}>{(id, d) => <Input id={id} aria-describedby={d} {...register('title_bn')} />}</Field>
            <Field label="বিবরণ" error={errors.description_bn?.message}>{(id, d) => <Textarea id={id} aria-describedby={d} rows={3} {...register('description_bn')} />}</Field>
          </>}
        />
        <ToggleRow control={control} name="is_published" label="Published" description="Show this album in the website gallery." />
      </form>
    </Modal>
  );
}
