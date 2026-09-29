import { cn } from '@/lib/cn';

/**
 * Small hand-rolled icon set (24×24, stroked) so the shell has no icon-library
 * dependency. Add a path here rather than inlining SVG in a page.
 */
const PATHS = {
  dashboard: 'M4 4h7v7H4zM13 4h7v4h-7zM13 11h7v9h-7zM4 14h7v6H4z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0',
  users:
    'M9 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20a6.5 6.5 0 0 1 13 0M16 6.5a3 3 0 0 1 0 6M17 14a5.5 5.5 0 0 1 4.5 6',
  book: 'M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM17 7h2v13H8',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M9.5 15l2 2 3.5-4',
  trophy: 'M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M9 20h6M12 14v6',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2',
  ticket: 'M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4zM12 7v10',
  clipboard: 'M9 4h6v3H9zM8 5H6v15h12V5h-2M9 12h6M9 16h4',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 13.5a7.7 7.7 0 0 0 0-3l1.7-1.3-2-3.4-2 .8a7.7 7.7 0 0 0-2.6-1.5L14.2 2h-4l-.3 2.1a7.7 7.7 0 0 0-2.6 1.5l-2-.8-2 3.4 1.7 1.3a7.7 7.7 0 0 0 0 3l-1.7 1.3 2 3.4 2-.8a7.7 7.7 0 0 0 2.6 1.5l.3 2.1h4l.3-2.1a7.7 7.7 0 0 0 2.6-1.5l2 .8 2-3.4z',
  chart: 'M4 20h16M7 16V9M12 16V5M17 16v-4',
  logout: 'M15 5V4H4v16h11v-1M9 12h11M17 9l3 3-3 3',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6 6 18',
  cap: 'M12 4 2 9l10 5 10-5zM6 11.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5',
  chevronRight: 'M9 6l6 6-6 6',
  chevronDown: 'M6 9l6 6 6-6',
  arrowRight: 'M4 12h15M13 6l6 6-6 6',
  arrowLeft: 'M20 12H5M11 6l-6 6 6 6',
  briefcase: 'M4 8h16v12H4zM9 8V5h6v3M4 13h16',
  sparkle:
    'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z',
  rocket:
    'M12 15l-3-3M9.5 15.5 5 20M14.5 9.5a1.5 1.5 0 1 0 0-.01M9 12l-4.5-1 3-4h5M12 15l1 4.5 4-3v-5M9 12c2-6 6.5-8.5 11-9-.5 4.5-3 9-9 11',
  layers: 'M12 3 2 8l10 5 10-5zM2 12.5l10 5 10-5M2 17l10 5 10-5',
  flame:
    'M12 22c4 0 7-2.7 7-7 0-4-3-6.5-4-10-2.5 2-3.5 4-3.5 6.5C10 10 9 8.5 9 7c-2.5 2.2-4 5-4 8 0 4.3 3 7 7 7Z',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  bell: 'M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0',
  check: 'M5 12.5l4.5 4.5L19 7',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  bookmark: 'M6 3h12v18l-6-4.5L6 21z',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  edit: 'M4 20h4l11-11-4-4L4 16zM13.5 6.5l4 4',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4',
  eye: 'M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  lock: 'M6 11h12v10H6zM8.5 11V7.5a3.5 3.5 0 0 1 7 0V11',
  globe:
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3Z',
  inbox: 'M3 13l3-8h12l3 8v6H3zM3 13h5l1.5 2.5h5L16 13h5',
  refresh: 'M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  target:
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM12 12h.01',
  award: 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM8.5 13.8 7 21l5-2.5 5 2.5-1.5-7.2',
  zap: 'M13 2 4 14h7l-1 8 9-12h-7z',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z',
  heart:
    'M12 20s-7.5-4.5-9-9.5C2 6.5 5 4 8 4c1.8 0 3.2 1 4 2.3C12.8 5 14.2 4 16 4c3 0 6 2.5 5 6.5-1.5 5-9 9.5-9 9.5Z',
  leaf: 'M5 20c0-9 5-15 15-15 0 10-6 15-15 15ZM5 20l7-7',
  flag: 'M5 21V4M5 4h12l-2 4 2 4H5',
  pause: 'M8 5v14M16 5v14',
  git: 'M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 9a9 9 0 0 1-9 9',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  send: 'M21 3 3 10l7 3 3 7zM10 13l11-10',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  phone:
    'M6 3h3l2 5-2.5 1.5a12 12 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2Z',
  pin: 'M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  shield: 'M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM15.5 8.5l-2 5-5 2 2-5z',
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
