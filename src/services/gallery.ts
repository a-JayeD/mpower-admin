import { supabase, BUCKETS } from '@/lib/supabase';
import type { GalleryAlbum, GalleryImage } from '@/types/database';
import type { AlbumFormValues } from '@/lib/validation/schemas';
import { IMAGE_PRESETS } from '@/lib/constants';
import { processImage } from '@/utils/image';
import { sanitizeRecord, sanitizeText } from '@/utils/sanitize';
import { unwrap } from './base';
import { removeFiles, uploadBlob } from './storage';

export interface AlbumWithMeta extends GalleryAlbum {
  gallery_images: Array<{ count: number }>;
  cover: Pick<GalleryImage, 'thumb_path'> | null;
}

export async function listAlbums() {
  return unwrap(
    await supabase.from('gallery_albums')
      .select('*, gallery_images!gallery_images_album_id_fkey(count), cover:gallery_images!gallery_albums_cover_image_fkey(thumb_path)')
      .order('display_order').order('created_at', { ascending: false }),
  ) as AlbumWithMeta[];
}

export async function getAlbum(id: string) {
  return unwrap(await supabase.from('gallery_albums').select('*').eq('id', id).single()) as GalleryAlbum;
}

export async function saveAlbum(existing: GalleryAlbum | null, values: AlbumFormValues) {
  const payload = sanitizeRecord(values);
  const q = existing
    ? supabase.from('gallery_albums').update(payload).eq('id', existing.id).select().single()
    : supabase.from('gallery_albums').insert(payload).select().single();
  return unwrap(await q) as GalleryAlbum;
}

export async function setAlbumCover(albumId: string, imageId: string | null) {
  unwrap(await supabase.from('gallery_albums').update({ cover_image_id: imageId }).eq('id', albumId).select('id'));
}

export async function deleteAlbum(albumId: string) {
  const images = unwrap(
    await supabase.from('gallery_images').select('image_path, thumb_path').eq('album_id', albumId),
  ) as Pick<GalleryImage, 'image_path' | 'thumb_path'>[];
  // Remove files first so nothing is orphaned in Storage.
  await removeFiles(BUCKETS.publicMedia, images.flatMap((i) => [i.image_path, i.thumb_path]));
  unwrap(await supabase.from('gallery_albums').delete().eq('id', albumId).select('id'));
}

export async function listImages(albumId: string) {
  return unwrap(
    await supabase.from('gallery_images').select('*').eq('album_id', albumId)
      .order('display_order').order('created_at'),
  ) as GalleryImage[];
}

/** Compress to a display image + a thumbnail, upload both, then insert the row. */
export async function uploadAlbumImage(albumId: string, file: File, order: number) {
  const full = await processImage(file, IMAGE_PRESETS.gallery);
  const thumb = await processImage(file, IMAGE_PRESETS.thumb);
  const folder = `gallery/${albumId}`;
  const image_path = await uploadBlob(BUCKETS.publicMedia, folder, full.blob, full.ext);
  let thumb_path: string | null = null;
  try {
    thumb_path = await uploadBlob(BUCKETS.publicMedia, folder, thumb.blob, thumb.ext);
    return unwrap(
      await supabase.from('gallery_images').insert({
        album_id: albumId, image_path, thumb_path, display_order: order,
        width: full.width, height: full.height, size_bytes: full.blob.size,
      }).select().single(),
    ) as GalleryImage;
  } catch (e) {
    await removeFiles(BUCKETS.publicMedia, [image_path, thumb_path]).catch(() => undefined);
    throw e;
  }
}

export async function updateImageCaption(id: string, caption_en: string, caption_bn: string) {
  unwrap(await supabase.from('gallery_images')
    .update({ caption_en: sanitizeText(caption_en), caption_bn: sanitizeText(caption_bn) }).eq('id', id).select('id'));
}

export async function deleteImage(image: GalleryImage) {
  await removeFiles(BUCKETS.publicMedia, [image.image_path, image.thumb_path]);
  unwrap(await supabase.from('gallery_images').delete().eq('id', image.id).select('id'));
}

export async function setImageOrder(items: Array<{ id: string; display_order: number }>) {
  await Promise.all(items.map((i) =>
    supabase.from('gallery_images').update({ display_order: i.display_order }).eq('id', i.id).then(unwrap)));
}
