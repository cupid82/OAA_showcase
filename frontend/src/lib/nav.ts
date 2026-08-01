import type { IconName } from '@/components/ui/Icon';
import type { Role } from '@/types';

export interface NavItem {
  label: string;
  to: string;
  icon: IconName;
  /** The plans.md step that builds this page. Undefined means it already exists. */
  step?: number;
  blurb: string;
}

/**
 * Single source of truth for each role's sidebar, dashboard cards, and routes.
 * Anything with a `step` is routed to the shared ComingSoon page until that step
 * of plans.md is built.
 */
export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  student: [
    { label: 'Dashboard', to: '/student', icon: 'dashboard', blurb: 'Everything at a glance' },
    {
      label: 'Profile',
      to: '/student/profile',
      icon: 'user',
      blurb: 'Personal and academic details',
    },
    {
      label: 'Marks',
      to: '/student/marks',
      icon: 'book',
      blurb: 'Subject-wise internal and external marks',
    },
    {
      label: 'Attendance',
      to: '/student/attendance',
      icon: 'calendar',
      blurb: 'Overall percentage and subject breakdown',
    },
    {
      label: 'OAA Score',
      to: '/student/oaa',
      icon: 'radar',
      blurb: 'Your four-dimension ability profile',
    },
    {
      label: 'Leaderboard',
      to: '/student/leaderboard',
      icon: 'trophy',
      blurb: 'Class, department and college rankings',
    },
    {
      label: 'Timetable',
      to: '/student/timetable',
      icon: 'clock',
      blurb: 'Your weekly class schedule',
    },
    {
      label: 'Announcements',
      to: '/student/announcements',
      icon: 'megaphone',
      blurb: 'Notices from staff and admin',
    },
    {
      label: 'Events',
      to: '/student/events',
      icon: 'ticket',
      blurb: 'Browse and register for college events',
    },
    {
      label: 'Assignments',
      to: '/student/assignments',
      icon: 'clipboard',
      blurb: 'Submissions and grades',
    },
  ],
  teacher: [
    { label: 'Dashboard', to: '/teacher', icon: 'dashboard', blurb: 'Your teaching day' },
    {
      label: 'My Classes',
      to: '/teacher/classes',
      icon: 'book',
      blurb: 'Subjects and sections assigned to you',
    },
    {
      label: 'Attendance',
      to: '/teacher/attendance',
      icon: 'calendar',
      blurb: 'Mark a class for a subject and date',
    },
    {
      label: 'Marks Entry',
      to: '/teacher/marks',
      icon: 'clipboard',
      blurb: 'Spreadsheet-style marks entry',
    },
    {
      label: 'Students',
      to: '/teacher/students',
      icon: 'users',
      blurb: 'Search students and open their records',
    },
    {
      label: 'Assessments',
      to: '/teacher/assessments',
      icon: 'radar',
      blurb: 'Adaptability and social contribution ratings',
    },
    {
      label: 'Timetable',
      to: '/teacher/timetable',
      icon: 'clock',
      step: 14,
      blurb: 'Periods you teach this week',
    },
  ],
  admin: [
    { label: 'Dashboard', to: '/admin', icon: 'dashboard', blurb: 'Institution summary' },
    {
      label: 'Students',
      to: '/admin/students',
      icon: 'users',
      step: 9,
      blurb: 'CRUD, filters and bulk CSV import',
    },
    {
      label: 'Teachers',
      to: '/admin/teachers',
      icon: 'user',
      step: 9,
      blurb: 'Staff accounts and department assignment',
    },
    {
      label: 'Departments',
      to: '/admin/departments',
      icon: 'building',
      step: 9,
      blurb: 'Manage departments',
    },
    {
      label: 'Subjects',
      to: '/admin/subjects',
      icon: 'book',
      step: 9,
      blurb: 'Subjects, semesters and max marks',
    },
    {
      label: 'Events',
      to: '/admin/events',
      icon: 'ticket',
      step: 11,
      blurb: 'Create events and publish notifications',
    },
    {
      label: 'Announcements',
      to: '/admin/announcements',
      icon: 'megaphone',
      step: 12,
      blurb: 'Notices with scheduled publishing',
    },
    {
      label: 'Analytics',
      to: '/admin/analytics',
      icon: 'chart',
      step: 10,
      blurb: 'Performance, attendance and grade charts',
    },
    {
      label: 'Settings',
      to: '/admin/settings',
      icon: 'settings',
      step: 9,
      blurb: 'Academic year, OAA weights, thresholds',
    },
  ],
};

export const ROLE_LABEL: Record<Role, string> = {
  student: 'Student',
  teacher: 'Teacher',
  admin: 'Administrator',
};
