import type { ReactElement } from 'react';
import { Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { ComingSoon } from '@/pages/ComingSoon';
import DashboardPage from '@/pages/DashboardPage';
import LoginPage from '@/pages/LoginPage';
import NotFoundPage from '@/pages/NotFoundPage';
import LandingPage from '@/pages/landing/LandingPage';
import AttendancePage from '@/pages/student/AttendancePage';
import MarksPage from '@/pages/student/MarksPage';
import ProfilePage from '@/pages/student/ProfilePage';
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
};

/** One protected route group per role. */
function roleRoutes(role: Role) {
  return (
    <Route key={role} element={<ProtectedRoute allow={[role]} />}>
      <Route element={<AppLayout />}>
        <Route path={`/${role}`} element={<DashboardPage />} />
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
