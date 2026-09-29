import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { Loading } from '@/components/ui/Loading';
import { HOME_BY_ROLE, useAuth } from '@/context/AuthContext';
import type { Role } from '@/types';

/**
 * Gate for a route group. Anonymous visitors go to /login with the target
 * remembered; a signed-in user with the wrong role is bounced to their own home
 * rather than shown a 403 page.
 *
 * This is convenience, not security — the real check is server-side, per route.
 */
export function ProtectedRoute({ allow }: { allow: Role[] }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <Loading variant="page" label="Checking your session…" />;

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (!allow.includes(user.role)) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;

  return <Outlet />;
}

/**
 * A student who hasn't finished onboarding is sent there first — every other
 * page leans on the goal and skills it collects. Onboarding itself sits outside
 * this gate.
 */
export function OnboardingGate() {
  const { user } = useAuth();

  if (user?.role === 'student' && user.onboarded === false) {
    return <Navigate to="/student/welcome" replace />;
  }

  return <Outlet />;
}
