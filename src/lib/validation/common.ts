import { z } from 'zod';
import { isSafeHttpUrl } from '@/utils/sanitize';

export const phoneRegex = /^\+?[0-9][0-9 -]{5,19}$/;

export const text = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters`);
export const requiredText = (min: number, max: number, label = 'This field') =>
  z.string().trim().min(min, `${label} must be at least ${min} characters`).max(max, `Keep this under ${max} characters`);
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date');
export const phone = z.string().trim().regex(phoneRegex, 'Enter a valid phone number, e.g. 01712345678');
export const optionalUrl = z
  .string()
  .trim()
  .max(1000)
  .refine(isSafeHttpUrl, 'Enter a full link starting with https://');
export const order = z.coerce.number().int().min(0).max(9999);
