import { BUCKETS, supabase } from '@/lib/supabase';
import { processImage } from '@/utils/image';

type Bucket = (typeof BUCKETS)[keyof typeof BUCKETS];

function randomName(ext: string) {
  return `${crypto.randomUUID()}.${ext}`;
}

export async function uploadBlob(bucket: Bucket, folder: string, blob: Blob, ext: string): Promise<string> {
  const path = `${folder}/${randomName(ext)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: blob.type,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

/** Compress + upload a single image, returning its storage path. */
export async function uploadImage(
  bucket: Bucket, folder: string, file: File, preset: { maxSide: number; quality: number },
): Promise<string> {
  const img = await processImage(file, preset);
  return uploadBlob(bucket, folder, img.blob, img.ext);
}

export async function removeFiles(bucket: Bucket, paths: Array<string | null | undefined>): Promise<void> {
  const clean = paths.filter((p): p is string => Boolean(p));
  if (!clean.length) return;
  const { error } = await supabase.storage.from(bucket).remove(clean);
  if (error) throw error;
}

export function publicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return supabase.storage.from(BUCKETS.publicMedia).getPublicUrl(path).data.publicUrl;
}

/** Short-lived signed URLs for private student photos. */
export async function signedStudentPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return {};
  const { data, error } = await supabase.storage.from(BUCKETS.studentPhotos).createSignedUrls(unique, 60 * 30);
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const item of data ?? []) if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  return map;
}

/** Replace an image: upload the new one first, then delete the old file. */
export async function replaceImage(
  bucket: Bucket, folder: string, file: File, preset: { maxSide: number; quality: number }, oldPath: string | null,
): Promise<string> {
  const newPath = await uploadImage(bucket, folder, file, preset);
  if (oldPath) await removeFiles(bucket, [oldPath]).catch(() => undefined);
  return newPath;
}
