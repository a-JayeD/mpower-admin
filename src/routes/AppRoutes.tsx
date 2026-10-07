import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ProtectedRoute, PublicOnlyRoute } from './ProtectedRoute';
import LoginPage from '@/pages/auth/LoginPage';
import { paths } from './paths';

// Code-split every admin page so the login screen loads instantly.
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const StudentsPage = lazy(() => import('@/pages/students/StudentsPage'));
const StudentDetailPage = lazy(() => import('@/pages/students/StudentDetailPage'));
const CoursesPage = lazy(() => import('@/pages/courses/CoursesPage'));
const AttendancePage = lazy(() => import('@/pages/attendance/AttendancePage'));
const AttendanceHistoryPage = lazy(() => import('@/pages/attendance/AttendanceHistoryPage'));
const UpdatesPage = lazy(() => import('@/pages/content/UpdatesPage'));
const GalleryPage = lazy(() => import('@/pages/gallery/GalleryPage'));
const AlbumPage = lazy(() => import('@/pages/gallery/AlbumPage'));
const InstructorsPage = lazy(() => import('@/pages/content/InstructorsPage'));
const SuccessStoriesPage = lazy(() => import('@/pages/content/SuccessStoriesPage'));
const FaqsPage = lazy(() => import('@/pages/content/FaqsPage'));
const MessagesPage = lazy(() => import('@/pages/messages/MessagesPage'));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));
const AuditLogPage = lazy(() => import('@/pages/system/AuditLogPage'));
const BackupPage = lazy(() => import('@/pages/system/BackupPage'));
const NotFoundPage = lazy(() => import('@/pages/system/NotFoundPage'));

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path={paths.login} element={<LoginPage />} />
        <Route path={paths.forgotPassword} element={<ForgotPasswordPage />} />
      </Route>
      {/* Reachable while the recovery session is active */}
      <Route path={paths.resetPassword} element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path={paths.students} element={<StudentsPage />} />
          <Route path="/students/:id" element={<StudentDetailPage />} />
          <Route path={paths.courses} element={<CoursesPage />} />
          <Route path={paths.attendance} element={<AttendancePage />} />
          <Route path={paths.attendanceHistory} element={<AttendanceHistoryPage />} />
          <Route path={paths.updates} element={<UpdatesPage />} />
          <Route path={paths.gallery} element={<GalleryPage />} />
          <Route path="/gallery/:id" element={<AlbumPage />} />
          <Route path={paths.instructors} element={<InstructorsPage />} />
          <Route path={paths.stories} element={<SuccessStoriesPage />} />
          <Route path={paths.faqs} element={<FaqsPage />} />
          <Route path={paths.messages} element={<MessagesPage />} />
          <Route path={paths.settings} element={<SettingsPage />} />
          <Route path={paths.audit} element={<AuditLogPage />} />
          <Route path={paths.backup} element={<BackupPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
