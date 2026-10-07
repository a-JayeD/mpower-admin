import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Images, Plus } from 'lucide-react';
import { listAlbums } from '@/services/gallery';
import { publicUrl } from '@/services/storage';
import { ALBUM_CATEGORIES } from '@/lib/constants';
import { plural } from '@/utils/format';
import { paths } from '@/routes/paths';
import { PageHeader, Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { AlbumFormModal } from '@/components/gallery/AlbumFormModal';

export default function GalleryPage() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const q = useQuery({ queryKey: ['albums'], queryFn: listAlbums });

  return (
    <>
      <PageHeader title="Gallery" description="Photos are resized and compressed in the browser before upload to save storage."
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>New album</Button>} />
      {q.isError ? <Panel><ErrorState error={q.error} onRetry={() => q.refetch()} /></Panel>
        : q.isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="aspect-[4/3] rounded-lg" />)}
          </div>
        ) : q.data.length === 0 ? (
          <Panel>
            <EmptyState icon={<Images className="h-5 w-5" />} title="No albums yet"
              body="Create an album for a training session, industrial visit or event, then add photos."
              action={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>New album</Button>} />
          </Panel>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {q.data.map((a) => {
              const cover = publicUrl(a.cover?.thumb_path);
              const count = a.gallery_images[0]?.count ?? 0;
              return (
                <Link key={a.id} to={paths.album(a.id)} className="group overflow-hidden rounded-lg border border-line bg-white transition-shadow hover:shadow-lift">
                  <div className="relative aspect-[4/3] bg-ink-2">
                    {cover ? <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />
                      : <div className="tech-grid flex h-full items-center justify-center"><Images className="h-8 w-8 text-trace/60" /></div>}
                    <div className="absolute left-2 top-2"><StatusBadge status={a.is_published ? 'published' : 'draft'} label={a.is_published ? 'Published' : 'Hidden'} /></div>
                  </div>
                  <div className="p-3">
                    <div className="truncate font-medium text-ink group-hover:text-trace-dark">{a.title_en}</div>
                    <div className="text-xs text-slate-500">{ALBUM_CATEGORIES[a.category]} · {plural(count, 'photo')}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      <AlbumFormModal open={creating} onClose={() => setCreating(false)} album={null} onSaved={(a) => navigate(paths.album(a.id))} />
    </>
  );
}
