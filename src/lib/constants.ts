import type {
  AlbumCategory, AttendanceStatus, CourseStatus, EnrollmentStatus, MessageStatus, StudentStatus, UpdateType,
} from '@/types/database';

export const PAGE_SIZE = 20;

export const STUDENT_STATUSES: Record<StudentStatus, string> = {
  active: 'Active', completed: 'Completed', paused: 'Paused', dropped: 'Dropped', archived: 'Archived',
};
export const COURSE_STATUSES: Record<CourseStatus, string> = {
  active: 'Active', upcoming: 'Upcoming', inactive: 'Inactive', completed: 'Completed', archived: 'Archived',
};
export const ENROLLMENT_STATUSES: Record<EnrollmentStatus, string> = {
  active: 'In progress', completed: 'Completed', paused: 'Paused', dropped: 'Dropped',
};
export const ATTENDANCE_STATUSES: Record<AttendanceStatus, string> = { present: 'Present', absent: 'Absent' };
export const UPDATE_TYPES: Record<UpdateType, string> = {
  announcement: 'Announcement', news: 'News', notice: 'Notice', event: 'Event update',
};
export const MESSAGE_STATUSES: Record<MessageStatus, string> = {
  new: 'New', read: 'Read', replied: 'Replied', archived: 'Archived',
};
export const ALBUM_CATEGORIES: Record<AlbumCategory, string> = {
  training: 'Training sessions', industrial_visit: 'Industrial visits', workshop: 'Workshops',
  event: 'Events', students: 'Students', facilities: 'Facilities', other: 'Other',
};
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Image presets — tuned to stay well inside Supabase Free's 1 GB storage. */
export const IMAGE_PRESETS = {
  gallery: { maxSide: 1600, quality: 0.8 },
  thumb: { maxSide: 480, quality: 0.72 },
  cover: { maxSide: 1400, quality: 0.8 },
  portrait: { maxSide: 600, quality: 0.8 },
  logo: { maxSide: 512, quality: 0.9 },
} as const;
export const MAX_SOURCE_IMAGE_BYTES = 15 * 1024 * 1024; // before compression
export const MAX_UPLOAD_BYTES = 1.5 * 1024 * 1024; // after compression
