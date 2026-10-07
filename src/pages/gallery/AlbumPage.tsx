import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, ImagePlus, Images, MessageSquareText, Pencil, Star, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { GalleryImage } from '@/types/database';
import {
  deleteAlbum, deleteImage, getAlbum, listImages, saveAlbum, setAlbumCover, updateImageCaption, uploadAlbumImage,
} from '@/services/gallery';
import { publicUrl } from '@/services/storage';
import { useConfirm } from '@/hooks/useConfirm';
import { useReorder } from '@/hooks/useReorder';
import { ACCEPT_ATTR, validateImageFile } from '@/utils/image';
import { friendlyError } from '@/utils/errors';
import { formatBytes, plural } from '@/utils/format';
import { cn } from '@/utils/cn';
import { ALBUM_CATEGORIES } from '@/lib/constants';
import { paths } from '@/routes/paths';
import { PageHeader, Panel } from '@/components/ui/Panel';
import { Button, IconButton } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { Modal } from '@/components/ui/Modal';
import { Field, Input } from '@/components/ui/Field';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { AlbumFormModal } from '@/components/gallery/AlbumFormModal';

export default function AlbumPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const fileInput = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [captionFor, setCaptionFor] = useState<GalleryImage | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const imagesKey = ['album-images', id];
  const album = useQuery({ queryKey: ['album', id], queryFn: () => getAlbum(id) });
  const images = useQuery({ queryKey: imagesKey, queryFn: () => listImages(id) });
  const reorder = useReorder<GalleryImage>('gallery_images', imagesKey);
  const a = album.data;
  const rows = images.data ?? [];

  const refresh = () => {
    qc.invalidateQueries({ queryKey: imagesKey });
    qc.invalidateQueries({ queryKey: ['album', id] });
    qc.invalidateQueries({ queryKey: ['albums'] });
  };

  // Warn if the tab is closed mid-upload.
  useEffect(() => {
    if (!progress) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [progress]);

  const upload = async (files: File[]) => {
    if (!files.length || progress) return;
    const valid: File[] = [];
    for (const f of files) {
      try { await validateImageFile(f); valid.push(f); }
      catch (e) { toast.error(`${f.name}: ${(e as Error).message}`); }
    }
    if (!valid.length) return;
    let order = rows.reduce((m, r) => Math.max(m, r.display_order + 1), 0);
    let failed = 0;
    let firstId: string | null = null;
    setProgress({ done: 0, total: valid.length });
    for (const [i, f] of valid.entries()) {
      try {
        const img = await uploadAlbumImage(id, f, order++);
        firstId ??= img.id;
      } catch (e) {
        failed++;
        toast.error(`${f.name}: ${friendlyError(e)}`);
      }
      setProgress({ done: i + 1, total: valid.length });
    }
    // First photo of a new album becomes its cover automatically.
    if (a && !a.cover_image_id && firstId) await setAlbumCover(id, firstId).catch(() => undefined);
    setProgress(null);
    refresh();
    const ok = valid.length - failed;
    if (ok) toast.success(`${plural(ok, 'photo')} uploaded`);
  };

  const cover = useMutation({
    mutationFn: (imageId: string) => setAlbumCover(id, imageId),
    onSuccess: () => { toast.success('Cover updated'); refresh(); },
  });
  const removeImage = useMutation({
    mutationFn: deleteImage,
    onSuccess: () => { toast.success('Photo deleted'); refresh(); },
  });
  const publish = useMutation({
    mutationFn: (v: boolean) => saveAlbum(a!, {
      title_en: a!.title_en, title_bn: a!.title_bn, description_en: a!.description_en,
      description_bn: a!.description_bn, category: a!.category, is_published: v,
    }),
    onSuccess: (r) => { toast.success(r.is_published ? 'Album published' : 'Album hidden'); refresh(); },
  });
  const removeAlbum = useMutation({
    mutationFn: () => deleteAlbum(id),
    onSuccess: () => { toast.success('Album deleted'); qc.invalidateQueries({ queryKey: ['albums'] }); navigate(paths.gallery, { replace: true }); },
  });

  if (album.isError) return <Panel><ErrorState error={album.error} onRetry={() => album.refetch()} /></Panel>;
  if (!a) return <div className="space-y-4"><Skeleton className="h-16 w-1/2" /><Skeleton className="h-64 w-full rounded-xl" /></div>;

  const onDeleteImage = async (img: GalleryImage) => {
    if (await confirm({ title: 'Delete this photo?', message: 'The photo and its thumbnail will be permanently removed from storage.', confirmLabel: 'Delete', tone: 'danger' })) removeImage.mutate(img);
  };
  const onDeleteAlbum = async () => {
    if (await confirm({
      title: `Delete “${a.title_en}”?`,
      message: <>The album and <strong>{plural(rows.length, 'photo')}</strong> will be permanently deleted from storage.</>,
      confirmLabel: 'Delete album', tone: 'danger', typeToConfirm: rows.length ? 'DELETE' : undefined,
    })) removeAlbum.mutate();
  };

  const totalBytes = rows.reduce((n, r) => n + (r.size_bytes ?? 0), 0);

  return (
    <>
      <Link to={paths.gallery} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Gallery
      </Link>
      <PageHeader title={a.title_en}
        description={<>{ALBUM_CATEGORIES[a.category]} · {plural(rows.length, 'photo')}{totalBytes ? ` · ${formatBytes(totalBytes)}` : ''}</>}
        actions={<>
          <label className="mr-1 flex items-center gap-2 text-sm text-slate-600">
            Published <Toggle checked={a.is_published} label="Published" disabled={publish.isPending} onChange={(v) => publish.mutate(v)} />
          </label>
          <Button variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(true)}>Edit</Button>
          <Button variant="ghost" className="text-red-600 hover:bg-red-50" icon={<Trash2 className="h-4 w-4" />} onClick={onDeleteAlbum}>Delete</Button>
        </>} />

      {/* Upload drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); upload([...e.dataTransfer.files]); }}
        className={cn('mb-6 rounded-xl border-2 border-dashed p-6 text-center transition-colors',
          dragOver ? 'border-trace bg-trace-soft/50' : 'border-slate-300 bg-white')}>
        {progress ? (
          <div className="mx-auto max-w-sm" role="status">
            <div className="mb-2 text-sm font-medium text-ink">Compressing and uploading {progress.done + 1 > progress.total ? progress.total : progress.done + 1} of {progress.total}…</div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full bg-trace transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">Keep this page open until the upload finishes.</p>
          </div>
        ) : (
          <>
            <Upload className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm text-slate-600">Drag photos here, or</p>
            <Button className="mt-3" icon={<ImagePlus className="h-4 w-4" />} onClick={() => fileInput.current?.click()}>Choose photos</Button>
            <p className="mt-2 text-xs text-slate-500">JPG, PNG or WebP. Each photo is resized to 1600 px with a 480 px thumbnail.</p>
          </>
        )}
        <input ref={fileInput} type="file" multiple accept={ACCEPT_ATTR} className="hidden"
          onChange={(e) => { const f = [...(e.target.files ?? [])]; e.target.value = ''; upload(f); }} />
      </div>

      {images.isError ? <Panel><ErrorState error={images.error} onRetry={() => images.refetch()} /></Panel>
        : images.isPending ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}</div>
        ) : rows.length === 0 ? (
          <Panel><EmptyState icon={<Images className="h-5 w-5" />} title="This album is empty" body="Upload photos above. The first one becomes the cover." /></Panel>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {rows.map((img, idx) => {
              const isCover = a.cover_image_id === img.id;
              return (
                <li key={img.id} className={cn('overflow-hidden rounded-lg border bg-white', isCover ? 'border-trace ring-2 ring-trace/30' : 'border-line')}>
                  <div className="relative aspect-square bg-slate-100">
                    <img src={publicUrl(img.thumb_path) ?? ''} alt={img.caption_en} loading="lazy" className="h-full w-full object-cover" />
                    {isCover && <span className="absolute left-2 top-2 rounded bg-trace px-1.5 py-0.5 text-xs font-medium text-white">Cover</span>}
                  </div>
                  <div className="px-2 pt-2">
                    <p className={cn('truncate text-xs', img.caption_en ? 'text-slate-600' : 'italic text-slate-400')}>{img.caption_en || 'No caption'}</p>
                  </div>
                  <div className="flex items-center justify-between px-1 pb-1">
                    <div className="flex">
                      <IconButton label="Move earlier" className="h-8 w-8" disabled={idx === 0 || reorder.isPending} onClick={() => reorder.move(rows, idx, idx - 1)}><ArrowLeft className="h-4 w-4" /></IconButton>
                      <IconButton label="Move later" className="h-8 w-8" disabled={idx === rows.length - 1 || reorder.isPending} onClick={() => reorder.move(rows, idx, idx + 1)}><ArrowRight className="h-4 w-4" /></IconButton>
                    </div>
                    <div className="flex">
                      <IconButton label="Caption" className="h-8 w-8" onClick={() => setCaptionFor(img)}><MessageSquareText className="h-4 w-4" /></IconButton>
                      <IconButton label="Set as cover" className="h-8 w-8" disabled={isCover} onClick={() => cover.mutate(img.id)}>
                        <Star className={cn('h-4 w-4', isCover && 'fill-trace text-trace')} />
                      </IconButton>
                      <IconButton label="Delete photo" className="h-8 w-8 hover:text-red-600" onClick={() => onDeleteImage(img)}><Trash2 className="h-4 w-4" /></IconButton>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

      <AlbumFormModal open={editing} onClose={() => setEditing(false)} album={a} />
      <CaptionModal image={captionFor} onClose={() => setCaptionFor(null)} onSaved={refresh} />
    </>
  );
}

function CaptionModal({ image, onClose, onSaved }: { image: GalleryImage | null; onClose: () => void; onSaved: () => void }) {
  const [en, setEn] = useState('');
  const [bn, setBn] = useState('');
  useEffect(() => { setEn(image?.caption_en ?? ''); setBn(image?.caption_bn ?? ''); }, [image]);
  const save = useMutation({
    mutationFn: () => updateImageCaption(image!.id, en.slice(0, 300), bn.slice(0, 300)),
    onSuccess: () => { toast.success('Caption saved'); onSaved(); onClose(); },
  });
  return (
    <Modal open={!!image} onClose={onClose} busy={save.isPending} title="Photo caption" size="md"
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={save.isPending}>Cancel</Button>
        <Button loading={save.isPending} onClick={() => save.mutate()}>Save caption</Button>
      </>}>
      {image && <img src={publicUrl(image.thumb_path) ?? ''} alt="" className="mb-4 max-h-56 w-full rounded-lg object-contain bg-slate-100" />}
      <div className="space-y-4">
        <Field label="Caption (English)">{(id) => <Input id={id} value={en} maxLength={300} onChange={(e) => setEn(e.target.value)} />}</Field>
        <Field label="ক্যাপশন (বাংলা)" lang="bn">{(id) => <Input id={id} className="font-bn" value={bn} maxLength={300} onChange={(e) => setBn(e.target.value)} />}</Field>
      </div>
    </Modal>
  );
}
