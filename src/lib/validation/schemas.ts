import { z } from 'zod';
import { isoDate, optionalUrl, order, phone, requiredText, text } from './common';

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(10, 'Use at least 10 characters')
      .regex(/[A-Za-z]/, 'Include at least one letter')
      .regex(/[0-9]/, 'Include at least one number'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });

export const studentSchema = z.object({
  full_name: requiredText(2, 120, 'Name'),
  phone,
  address: text(500),
  joined_on: isoDate,
  notes: text(2000),
  status: z.enum(['active', 'completed', 'paused', 'dropped', 'archived']),
});
export type StudentFormValues = z.infer<typeof studentSchema>;

export const courseSchema = z.object({
  course_name_en: requiredText(2, 150, 'Course name'),
  course_name_bn: text(150),
  description_en: text(5000),
  description_bn: text(5000),
  joining_fee: z.coerce.number({ invalid_type_error: 'Enter an amount' }).min(0, 'Fee cannot be negative').max(10_000_000),
  total_classes: z.coerce.number().int('Whole number only').min(1, 'At least 1 class').max(500),
  duration_en: text(60),
  duration_bn: text(60),
  class_days: z.array(z.number().int().min(0).max(6)),
  status: z.enum(['active', 'upcoming', 'inactive', 'completed', 'archived']),
  display_order: order,
});
export type CourseFormValues = z.infer<typeof courseSchema>;

export const enrollmentSchema = z.object({
  course_id: z.string().uuid('Choose a course'),
  join_date: isoDate,
  total_classes: z.coerce.number().int().min(1).max(500),
  notes: text(2000),
});
export type EnrollmentFormValues = z.infer<typeof enrollmentSchema>;

export const enrollmentEditSchema = z.object({
  join_date: isoDate,
  total_classes: z.coerce.number().int().min(1).max(500),
  status: z.enum(['active', 'completed', 'paused', 'dropped']),
  notes: text(2000),
});
export type EnrollmentEditValues = z.infer<typeof enrollmentEditSchema>;

export const updateSchema = z.object({
  type: z.enum(['announcement', 'news', 'notice', 'event']),
  title_en: requiredText(2, 200, 'Title'),
  title_bn: text(200),
  content_en: text(20000),
  content_bn: text(20000),
  publish_date: z.string().min(1, 'Choose a publish date'),
  is_featured: z.boolean(),
  is_published: z.boolean(),
});
export type UpdateFormValues = z.infer<typeof updateSchema>;

export const instructorSchema = z.object({
  name_en: requiredText(2, 120, 'Name'),
  name_bn: text(120),
  position_en: text(120),
  position_bn: text(120),
  bio_en: text(2000),
  bio_bn: text(2000),
  specialization: text(200),
  display_order: order,
  is_active: z.boolean(),
});
export type InstructorFormValues = z.infer<typeof instructorSchema>;

export const storySchema = z.object({
  student_name: requiredText(2, 120, 'Name'),
  course_id: z.string().uuid().or(z.literal('')),
  story_en: text(5000),
  story_bn: text(5000),
  is_published: z.boolean(),
  is_featured: z.boolean(),
  display_order: order,
});
export type StoryFormValues = z.infer<typeof storySchema>;

export const faqSchema = z.object({
  question_en: requiredText(3, 300, 'Question'),
  question_bn: text(300),
  answer_en: text(3000),
  answer_bn: text(3000),
  is_published: z.boolean(),
});
export type FaqFormValues = z.infer<typeof faqSchema>;

export const albumSchema = z.object({
  title_en: requiredText(2, 150, 'Title'),
  title_bn: text(150),
  description_en: text(1000),
  description_bn: text(1000),
  category: z.enum(['training', 'industrial_visit', 'workshop', 'event', 'students', 'facilities', 'other']),
  is_published: z.boolean(),
});
export type AlbumFormValues = z.infer<typeof albumSchema>;

export const settingsSchema = z.object({
  center_name_en: requiredText(2, 120, 'Center name'),
  center_name_bn: text(120),
  phone: text(30),
  whatsapp: text(30),
  email: z.string().trim().max(200).email('Enter a valid email').or(z.literal('')),
  facebook_url: optionalUrl,
  messenger_url: optionalUrl,
  youtube_url: optionalUrl,
  google_maps_url: optionalUrl,
  address_en: text(500),
  address_bn: text(500),
  opening_hours_en: text(300),
  opening_hours_bn: text(300),
  hero_title_en: text(200),
  hero_title_bn: text(200),
  hero_subtitle_en: text(500),
  hero_subtitle_bn: text(500),
  footer_text_en: text(500),
  footer_text_bn: text(500),
  completion_warning_threshold: z.coerce.number().int().min(1).max(10),
});
export type SettingsFormValues = z.infer<typeof settingsSchema>;

export const grantAdminSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  full_name: text(120),
  role: z.enum(['admin', 'super_admin']),
});
export type GrantAdminValues = z.infer<typeof grantAdminSchema>;
