import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Loading } from '@/components/ui/Loading';
import { useAuth } from '@/context/AuthContext';

/** Shell for every signed-in area: navbar, role-aware sidebar, page container. */
export function AppLayout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Never leave the mobile drawer open across a navigation.
  useEffect(() => setSidebarOpen(false), [location.pathname]);

  // ProtectedRoute guarantees a user; this only covers the render between states.
  if (!user) return <Loading variant="page" />;

  return (
    <div className="min-h-screen bg-ink-50">
      <Navbar onToggleSidebar={() => setSidebarOpen((open) => !open)} sidebarOpen={sidebarOpen} />

      <div className="mx-auto flex w-full max-w-[100rem]">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-ink-200 bg-white lg:block">
          <Sidebar role={user.role} />
        </aside>

        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 top-16 z-20 bg-ink-900/40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
            <aside className="fixed top-16 bottom-0 left-0 z-20 w-64 overflow-y-auto border-r border-ink-200 bg-white lg:hidden">
              <Sidebar role={user.role} onNavigate={() => setSidebarOpen(false)} />
            </aside>
          </>
        )}

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
