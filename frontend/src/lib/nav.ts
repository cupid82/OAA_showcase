import type { IconName } from '@/components/ui/Icon';
import type { Role } from '@/types';

export interface NavItem {
  label: string;
  to: string;
  icon: IconName;
  blurb: string;
}

export interface RoleNav {
  /** The modes — the left-hand list the whole app is organised around. */
  primary: NavItem[];
  /** Account things, below a rule. */
  secondary: NavItem[];
}

/**
 * Single source of truth for each role's sidebar. Every item here has a real,
 * built page behind it — nothing in the sidebar is a placeholder.
 */
export const NAV_BY_ROLE: Record<Role, RoleNav> = {
  student: {
    primary: [
      { label: 'Dashboard', to: '/student', icon: 'dashboard', blurb: 'What to do next' },
      {
        label: 'Projects',
        to: '/student/projects',
        icon: 'rocket',
        blurb: 'Build things, find a team, ship them',
      },
      {
        label: 'Skills',
        to: '/student/skills',
        icon: 'layers',
        blurb: 'Your skill map, and the proof behind it',
      },
      {
        label: 'Events',
        to: '/student/events',
        icon: 'ticket',
        blurb: 'Hackathons, workshops, contests and talks',
      },
      {
        label: 'Jobs',
        to: '/student/jobs',
        icon: 'briefcase',
        blurb: 'Internships, jobs and recruitment drives',
      },
      {
        label: 'Burnout',
        to: '/student/burnout',
        icon: 'flame',
        blurb: 'A private check on how you are coping',
      },
      {
        label: 'Leaderboard',
        to: '/student/leaderboard',
        icon: 'trophy',
        blurb: 'Momentum from what you build and learn',
      },
    ],
    secondary: [
      {
        label: 'Connected apps',
        to: '/student/connections',
        icon: 'link',
        blurb: 'GitHub, LinkedIn, X and more',
      },
      {
        label: 'Settings',
        to: '/student/settings',
        icon: 'settings',
        blurb: 'Goal, privacy, alerts',
      },
    ],
  },
  admin: {
    primary: [
      { label: 'Overview', to: '/admin', icon: 'dashboard', blurb: 'How the platform is used' },
      { label: 'Events', to: '/admin/events', icon: 'ticket', blurb: 'Publish and review events' },
      { label: 'Jobs', to: '/admin/jobs', icon: 'briefcase', blurb: 'Publish and review openings' },
    ],
    secondary: [],
  },
};

export const ROLE_LABEL: Record<Role, string> = {
  student: 'Student',
  admin: 'Moderator',
};
