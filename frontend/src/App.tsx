import { Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { ComingSoon } from '@/pages/ComingSoon';
import DashboardPage from '@/pages/DashboardPage';
import LoginPage from '@/pages/LoginPage';
import NotFoundPage from '@/pages/NotFoundPage';
import LandingPage from '@/pages/landing/LandingPage';
import { NAV_BY_ROLE } from '@/lib/nav';
import type { Role } from '@/types';
import { ROLES } from '@/types';

/**
 * One protected route group per role. Sidebar entries carrying a `step` are not
 * built yet and resolve to the ComingSoon page — see lib/nav.ts.
 */
function roleRoutes(role: Role) {
  return (
    <Route key={role} element={<ProtectedRoute allow={[role]} />}>
      <Route element={<AppLayout />}>
        <Route path={`/${role}`} element={<DashboardPage />} />
        {NAV_BY_ROLE[role]
          .filter((item) => item.step !== undefined)
          .map((item) => (
            <Route
              key={item.to}
              path={item.to}
              element={<ComingSoon title={item.label} step={item.step!} description={item.blurb} />}
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
