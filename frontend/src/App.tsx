import { Route, Routes } from 'react-router-dom';

import { OnboardingGate, ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import ListingFormPage from '@/pages/admin/ListingFormPage';
import ListingsPage from '@/pages/admin/ListingsPage';
import OverviewPage from '@/pages/admin/OverviewPage';
import LoginPage from '@/pages/LoginPage';
import NotFoundPage from '@/pages/NotFoundPage';
import LandingPage from '@/pages/landing/LandingPage';
import PortfolioPage from '@/pages/portfolio/PortfolioPage';
import ConnectionsPage from '@/pages/student/ConnectionsPage';
import DashboardPage from '@/pages/student/DashboardPage';
import LeaderboardPage from '@/pages/student/LeaderboardPage';
import OnboardingPage from '@/pages/student/OnboardingPage';
import SettingsPage from '@/pages/student/SettingsPage';
import BurnoutPage from '@/pages/student/burnout/BurnoutPage';
import EventDetailPage from '@/pages/student/opportunities/EventDetailPage';
import EventsPage from '@/pages/student/opportunities/EventsPage';
import JobDetailPage from '@/pages/student/opportunities/JobDetailPage';
import JobsPage from '@/pages/student/opportunities/JobsPage';
import ShareListingPage from '@/pages/student/opportunities/ShareListingPage';
import ProjectDetailPage from '@/pages/student/projects/ProjectDetailPage';
import ProjectFormPage from '@/pages/student/projects/ProjectFormPage';
import ProjectsPage from '@/pages/student/projects/ProjectsPage';
import SkillDetailPage from '@/pages/student/skills/SkillDetailPage';
import SkillsPage from '@/pages/student/skills/SkillsPage';

/**
 * Home page → sign in → your dashboard. Every route below is built; there is no
 * placeholder page left in the app.
 */
export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/p/:handle" element={<PortfolioPage />} />

      {/* Student */}
      <Route element={<ProtectedRoute allow={['student']} />}>
        <Route path="/student/welcome" element={<OnboardingPage />} />
        <Route element={<OnboardingGate />}>
          <Route element={<AppLayout />}>
            <Route path="/student" element={<DashboardPage />} />

            <Route path="/student/projects" element={<ProjectsPage />} />
            <Route path="/student/projects/new" element={<ProjectFormPage />} />
            <Route path="/student/projects/:projectId" element={<ProjectDetailPage />} />
            <Route path="/student/projects/:projectId/edit" element={<ProjectFormPage />} />

            <Route path="/student/skills" element={<SkillsPage />} />
            <Route path="/student/skills/:skillId" element={<SkillDetailPage />} />

            <Route path="/student/events" element={<EventsPage />} />
            <Route path="/student/events/share" element={<ShareListingPage kind="event" />} />
            <Route path="/student/events/:eventId" element={<EventDetailPage />} />

            <Route path="/student/jobs" element={<JobsPage />} />
            <Route path="/student/jobs/share" element={<ShareListingPage kind="job" />} />
            <Route path="/student/jobs/:jobId" element={<JobDetailPage />} />

            <Route path="/student/burnout" element={<BurnoutPage />} />
            <Route path="/student/leaderboard" element={<LeaderboardPage />} />
            <Route path="/student/connections" element={<ConnectionsPage />} />
            <Route path="/student/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>

      {/* Moderator */}
      <Route element={<ProtectedRoute allow={['admin']} />}>
        <Route element={<AppLayout />}>
          <Route path="/admin" element={<OverviewPage />} />
          <Route path="/admin/events" element={<ListingsPage kind="event" />} />
          <Route path="/admin/events/new" element={<ListingFormPage kind="event" />} />
          <Route path="/admin/events/:id/edit" element={<ListingFormPage kind="event" />} />
          <Route path="/admin/jobs" element={<ListingsPage kind="job" />} />
          <Route path="/admin/jobs/new" element={<ListingFormPage kind="job" />} />
          <Route path="/admin/jobs/:id/edit" element={<ListingFormPage kind="job" />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
