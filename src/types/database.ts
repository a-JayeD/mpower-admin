/**
 * Entity types mirroring supabase/migrations/001_schema.sql.
 * Keep in sync when the schema changes.
 */
export type UUID = string;
/** ISO date, e.g. "2026-10-01" */
export type DateString = string;
/** ISO timestamp */
export type Timestamp = string;

export type AdminRole = 'super_admin' | 'admin';
export type StudentStatus = 'active' | 'completed' | 'paused' | 'dropped' | 'archived';
export type CourseStatus = 'active' | 'upcoming' | 'inactive' | 'completed' | 'archived';
export type EnrollmentStatus = 'active' | 'completed' | 'paused' | 'dropped';
export type AttendanceStatus = 'present' | 'absent';
export type UpdateType = 'announcement' | 'news' | 'notice' | 'event';
export type MessageStatus = 'new' | 'read' | 'replied' | 'archived';
export type AlbumCategory =
  | 'training' | 'industrial_visit' | 'workshop' | 'event' | 'students' | 'facilities' | 'other';

interface Row {
  id: UUID;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Admin extends Row {
  email: string;
  full_name: string;
  role: AdminRole;
  is_active: boolean;
}

export interface Course extends Row {
  course_name_en: string;
  course_name_bn: string;
  description_en: string;
  description_bn: string;
  joining_fee: number;
  total_classes: number;
  duration_en: string;
  duration_bn: string;
  class_days: number[];
  image_path: string | null;
  status: CourseStatus;
  display_order: number;
}

export interface Student extends Row {
  full_name: string;
  phone: string;
  address: string;
  photo_path: string | null;
  joined_on: DateString;
  notes: string;
  status: StudentStatus;
  created_by: UUID | null;
}

export interface Enrollment extends Row {
  student_id: UUID;
  course_id: UUID;
  join_date: DateString;
  total_classes: number;
  status: EnrollmentStatus;
  completion_date: DateString | null;
  completed_automatically: boolean;
  notes: string;
}

/** Row of the `enrollment_progress` view */
export interface EnrollmentProgress {
  enrollment_id: UUID;
  student_id: UUID;
  student_name: string;
  student_phone: string;
  student_photo_path: string | null;
  student_status: StudentStatus;
  course_id: UUID;
  course_name_en: string;
  course_name_bn: string;
  join_date: DateString;
  total_classes: number;
  status: EnrollmentStatus;
  completion_date: DateString | null;
  completed_automatically: boolean;
  notes: string;
  classes_attended: number;
  classes_absent: number;
  classes_remaining: number;
  attendance_percentage: number;
  last_attended: DateString | null;
}

export interface AttendanceRecord extends Row {
  enrollment_id: UUID;
  class_date: DateString;
  status: AttendanceStatus;
  marked_by: UUID | null;
}

/** Row of the `attendance_details` view */
export interface AttendanceDetail extends AttendanceRecord {
  student_id: UUID;
  student_name: string;
  course_id: UUID;
  course_name_en: string;
  course_name_bn: string;
}

export interface GalleryAlbum extends Row {
  title_en: string;
  title_bn: string;
  description_en: string;
  description_bn: string;
  category: AlbumCategory;
  cover_image_id: UUID | null;
  is_published: boolean;
  display_order: number;
}

export interface GalleryImage extends Row {
  album_id: UUID;
  image_path: string;
  thumb_path: string;
  caption_en: string;
  caption_bn: string;
  display_order: number;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
}

export interface NewsUpdate extends Row {
  type: UpdateType;
  title_en: string;
  title_bn: string;
  content_en: string;
  content_bn: string;
  cover_image_path: string | null;
  publish_date: Timestamp;
  is_featured: boolean;
  is_published: boolean;
  created_by: UUID | null;
}

export interface Instructor extends Row {
  name_en: string;
  name_bn: string;
  photo_path: string | null;
  position_en: string;
  position_bn: string;
  bio_en: string;
  bio_bn: string;
  specialization: string;
  display_order: number;
  is_active: boolean;
}

export interface SuccessStory extends Row {
  student_name: string;
  photo_path: string | null;
  course_id: UUID | null;
  story_en: string;
  story_bn: string;
  is_published: boolean;
  is_featured: boolean;
  display_order: number;
}

export interface Faq extends Row {
  question_en: string;
  question_bn: string;
  answer_en: string;
  answer_bn: string;
  display_order: number;
  is_published: boolean;
}

export interface ContactMessage extends Row {
  name: string;
  phone: string | null;
  email: string | null;
  subject: string;
  message: string;
  status: MessageStatus;
  replied_at: Timestamp | null;
}

export interface SiteSettings extends Row {
  center_name_en: string;
  center_name_bn: string;
  logo_path: string | null;
  phone: string;
  whatsapp: string;
  email: string;
  facebook_url: string;
  messenger_url: string;
  youtube_url: string;
  google_maps_url: string;
  address_en: string;
  address_bn: string;
  opening_hours_en: string;
  opening_hours_bn: string;
  hero_title_en: string;
  hero_title_bn: string;
  hero_subtitle_en: string;
  hero_subtitle_bn: string;
  footer_text_en: string;
  footer_text_bn: string;
  completion_warning_threshold: number;
}

export interface AuditLog extends Row {
  admin_id: UUID | null;
  admin_email: string | null;
  action: 'create' | 'update' | 'delete';
  entity: string;
  entity_id: UUID | null;
  summary: string;
  changed_fields: string[];
}

export interface DashboardSummary {
  today: DateString;
  threshold: number;
  total_students: number;
  active_students: number;
  active_courses: number;
  today_present: number;
  today_absent: number;
  unread_messages: number;
  near_completion: Array<{
    enrollment_id: UUID; student_id: UUID; student_name: string; course_id: UUID;
    course_name_en: string; classes_attended: number; classes_remaining: number; total_classes: number;
  }>;
  recently_completed: Array<{
    enrollment_id: UUID; student_id: UUID; student_name: string; course_name_en: string; completion_date: DateString;
  }>;
  missing_attendance: Array<{ course_id: UUID; course_name_en: string }>;
  recent_students: Array<Pick<Student, 'id' | 'full_name' | 'phone' | 'joined_on' | 'status' | 'created_at'>>;
  recent_updates: Array<Pick<NewsUpdate, 'id' | 'title_en' | 'type' | 'is_published' | 'publish_date'>>;
}
