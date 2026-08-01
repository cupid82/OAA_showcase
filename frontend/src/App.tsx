import type { ReactElement } from 'react';
import { Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { ComingSoon } from '@/pages/ComingSoon';
import DashboardPage from '@/pages/DashboardPage';
import LoginPage from '@/pages/LoginPage';
import NotFoundPage from '@/pages/NotFoundPage';
import LandingPage from '@/pages/landing/LandingPage';
import AnnouncementsPage from '@/pages/student/AnnouncementsPage';
import AssignmentsPage from '@/pages/student/AssignmentsPage';
import AttendancePage from '@/pages/student/AttendancePage';
import EventsPage from '@/pages/student/EventsPage';
import LeaderboardPage from '@/pages/student/LeaderboardPage';
import MarksPage from '@/pages/student/MarksPage';
import ProfilePage from '@/pages/student/ProfilePage';
import TimetablePage from '@/pages/student/TimetablePage';
import OaaPage from '@/pages/student/oaa/OaaPage';
import TeacherAssessmentsPage from '@/pages/teacher/AssessmentsPage';
import TeacherAttendancePage from '@/pages/teacher/AttendancePage';
import TeacherClassesPage from '@/pages/teacher/ClassesPage';
import TeacherDashboardPage from '@/pages/teacher/DashboardPage';
import TeacherMarksPage from '@/pages/teacher/MarksPage';
import TeacherStudentDetailPage from '@/pages/teacher/StudentDetailPage';
import TeacherStudentsPage from '@/pages/teacher/StudentsPage';
import { NAV_BY_ROLE } from '@/lib/nav';
import type { Role } from '@/types';
import { ROLES } from '@/types';

/**
 * Pages that are actually built, keyed by path. Anything in the sidebar without an
 * entry here still carries a `step` in lib/nav.ts and resolves to ComingSoon.
 */
const BUILT_PAGES: Record<string, ReactElement> = {
  '/student/profile': <ProfilePage />,
  '/student/marks': <MarksPage />,
  '/student/attendance': <AttendancePage />,
  '/student/oaa': <OaaPage />,
  '/student/leaderboard': <LeaderboardPage />,
  '/student/timetable': <TimetablePage />,
  '/student/announcements': <AnnouncementsPage />,
  '/student/events': <EventsPage />,
  '/student/assignments': <AssignmentsPage />,
  '/teacher/classes': <TeacherClassesPage />,
  '/teacher/attendance': <TeacherAttendancePage />,
  '/teacher/marks': <TeacherMarksPage />,
  '/teacher/students': <TeacherStudentsPage />,
  '/teacher/assessments': <TeacherAssessmentsPage />,
};

/** Role landing pages. A role without its own falls back to the module index. */
const DASHBOARDS: Partial<Record<Role, ReactElement>> = {
  teacher: <TeacherDashboardPage />,
};

/** Routes that are not in the sidebar — detail pages reached from a list. */
const DETAIL_ROUTES: Partial<Record<Role, ReactElement>> = {
  teacher: <Route path="/teacher/students/:studentId" element={<TeacherStudentDetailPage />} />,
};

/** One protected route group per role. */
function roleRoutes(role: Role) {
  return (
    <Route key={role} element={<ProtectedRoute allow={[role]} />}>
      <Route element={<AppLayout />}>
        <Route path={`/${role}`} element={DASHBOARDS[role] ?? <DashboardPage />} />
        {NAV_BY_ROLE[role]
          .filter((item) => item.to !== `/${role}`)
          .map((item) => (
            <Route
              key={item.to}
              path={item.to}
              element={
                BUILT_PAGES[item.to] ?? (
                  <ComingSoon title={item.label} step={item.step ?? 0} description={item.blurb} />
                )
              }
            />
          ))}
        {DETAIL_ROUTES[role]}
      </Route>
    </Route>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Student / teacher / admin areas */}
      {ROLES.map(roleRoutes)}

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
