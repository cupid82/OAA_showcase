import { cn } from '@/lib/cn';

/**
 * Small hand-rolled icon set (24×24, stroked) so the shell has no icon-library
 * dependency. Add a path here rather than inlining SVG in a page.
 */
const PATHS = {
  dashboard: 'M4 4h7v7H4zM13 4h7v4h-7zM13 11h7v9h-7zM4 14h7v6H4z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0',
  book: 'M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM17 7h2v13H8',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M9.5 15l2 2 3.5-4',
  radar: 'M12 3 3.5 9l3.2 10h10.6L20.5 9zM12 8l-4 3 1.5 4.5h5L16 11z',
  trophy: 'M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M9 20h6M12 14v6',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2',
  megaphone: 'M4 10v4h3l7 4V6l-7 4zM17 9a3 3 0 0 1 0 6M7 14v5h3v-5',
  ticket: 'M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4zM12 7v10',
  clipboard: 'M9 4h6v3H9zM8 5H6v15h12V5h-2M9 12h6M9 16h4',
  users:
    'M9 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20a6.5 6.5 0 0 1 13 0M16 6.5a3 3 0 0 1 0 6M17 14a5.5 5.5 0 0 1 4.5 6',
  building: 'M5 21V4h9v17M14 9h5v12M8 8h3M8 12h3M8 16h3M17 13h1M17 17h1',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 13.5a7.7 7.7 0 0 0 0-3l1.7-1.3-2-3.4-2 .8a7.7 7.7 0 0 0-2.6-1.5L14.2 2h-4l-.3 2.1a7.7 7.7 0 0 0-2.6 1.5l-2-.8-2 3.4 1.7 1.3a7.7 7.7 0 0 0 0 3l-1.7 1.3 2 3.4 2-.8a7.7 7.7 0 0 0 2.6 1.5l.3 2.1h4l.3-2.1a7.7 7.7 0 0 0 2.6-1.5l2 .8 2-3.4z',
  chart: 'M4 20h16M7 16V9M12 16V5M17 16v-4',
  logout: 'M15 5V4H4v16h11v-1M9 12h11M17 9l3 3-3 3',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6 6 18',
  cap: 'M12 4 2 9l10 5 10-5zM6 11.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5',
  chevronRight: 'M9 6l6 6-6 6',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  phone:
    'M6 3h3l2 5-2.5 1.5a12 12 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2Z',
  pin: 'M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  quote:
    'M9 7c-2.5 1-4 3.2-4 6v4h5v-5H7c0-1.7.8-3 2.5-3.8zM19 7c-2.5 1-4 3.2-4 6v4h5v-5h-3c0-1.7.8-3 2.5-3.8z',
  arrowRight: 'M4 12h15M13 6l6 6-6 6',
  briefcase: 'M4 8h16v12H4zM9 8V5h6v3M4 13h16',
  sparkle:
    'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z',
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps {
  name: IconName;
  className?: string;
}

export function Icon({ name, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('size-5 shrink-0', className)}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
