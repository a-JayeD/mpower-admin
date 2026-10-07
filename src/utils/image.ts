import { MAX_SOURCE_IMAGE_BYTES, MAX_UPLOAD_BYTES } from '@/lib/constants';

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const ACCEPT_ATTR = ACCEPTED_IMAGE_TYPES.join(',');

export class ImageValidationError extends Error {}

/** Check the real file signature, not just the extension / browser-reported type. */
async function sniffImageType(file: File): Promise<string | null> {
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  return null;
}

export async function validateImageFile(file: File): Promise<void> {
  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new ImageValidationError(`${file.name} is larger than 15 MB. Choose a smaller photo.`);
  }
  const real = await sniffImageType(file);
  if (!real) throw new ImageValidationError(`${file.name} is not a JPG, PNG or WebP image.`);
}

export interface ProcessedImage {
  blob: Blob;
  width: number;
  height: number;
  type: string;
  ext: string;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Resize and re-encode in the browser before upload. Re-encoding also
 * strips EXIF metadata (GPS location etc.) from phone photos.
 */
export async function processImage(file: File, preset: { maxSide: number; quality: number }): Promise<ProcessedImage> {
  await validateImageFile(file);
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, preset.maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ImageValidationError('This browser cannot process images.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality: number = preset.quality;
  let type = 'image/webp';
  let blob = await canvasToBlob(canvas, type, quality);
  if (!blob || blob.type !== 'image/webp') {
    type = 'image/jpeg'; // Older Safari cannot encode WebP
    blob = await canvasToBlob(canvas, type, quality);
  }
  while (blob && blob.size > MAX_UPLOAD_BYTES && quality > 0.45) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, type, quality);
  }
  if (!blob) throw new ImageValidationError('Could not compress this image.');
  if (blob.size > MAX_UPLOAD_BYTES) throw new ImageValidationError('Image is still too large after compression.');
  return { blob, width, height, type, ext: type === 'image/webp' ? 'webp' : 'jpg' };
}
