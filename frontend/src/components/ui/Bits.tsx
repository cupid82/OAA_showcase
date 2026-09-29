/**
 * Small presentational pieces shared across pages: section headings, progress
 * bars, date plates, stat figures and skill chips. Each is a few lines; keeping
 * them together keeps the import lists of the pages short.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/cn';
import { plateParts } from '@/lib/format';
import type { SkillRef } from '@/types';

/**
 * Section heading. The serif is spent on figures and page titles, so this one is
 * quieter — a small serif line over a hairline, with an optional note or action.
 */
export function SectionHeading({
  title,
  note,
  action,
  className,
  id,
}: {
  title: string;
  note?: ReactNode;
  action?: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      className={cn(
        'mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-ink-200 pb-3',
        className,
      )}
    >
      <h2 id={id} className="font-serif text-xl text-ink-900">
        {title}
      </h2>
      {note && <p className="text-sm text-ink-500">{note}</p>}
      {action}
    </div>
  );
}

/** A thin bar with a rounded data end — the same mark the OAA table used. */
export function ProgressBar({
  value,
  max,
  className,
  label,
}: {
  value: number;
  max: number;
  className?: string;
  label: string;
}) {
  const percent = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn('h-1.5 w-full rounded-full bg-ink-200', className)}
    >
      <div className="h-full rounded-full bg-brand-600" style={{ width: `${percent}%` }} />
    </div>
  );
}

/** A date as a printed calendar tear-off would show it. */
export function DatePlate({
  date,
  muted = false,
  className,
}: {
  date: string;
  muted?: boolean;
  className?: string;
}) {
  const { day, month } = plateParts(date);
  return (
    <div
      className={cn(
        'flex size-16 shrink-0 flex-col items-center justify-center border',
        muted
          ? 'border-ink-300 bg-ink-100 text-ink-500'
          : 'border-brand-300 bg-brand-50 text-brand-800',
        className,
      )}
    >
      <span className="font-serif text-2xl leading-none">{day}</span>
      <span className="kicker mt-1 text-[10px]">{month}</span>
    </div>
  );
}

/** A figure with a label. Serif for the number, kicker for the label. */
export function Stat({
  label,
  value,
  note,
  to,
  className,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  to?: string;
  className?: string;
}) {
  const body = (
    <>
      <p className="kicker text-ink-500">{label}</p>
      <p className="mt-2 font-serif text-4xl leading-none text-ink-900">{value}</p>
      {note && <p className="mt-2 text-sm text-ink-600">{note}</p>}
    </>
  );

  return to ? (
    <Link
      to={to}
      className={cn('group block bg-white px-5 py-5 transition hover:bg-ink-50', className)}
    >
      {body}
    </Link>
  ) : (
    <div className={cn('bg-white px-5 py-5', className)}>{body}</div>
  );
}

/** A row of skill chips. Linked to the skill's page when `link` is set. */
export function SkillChips({
  skills,
  link = true,
  highlight,
  className,
  empty,
}: {
  skills: SkillRef[];
  link?: boolean;
  /** Ids to draw in the brand tone — e.g. the ones the viewer already has. */
  highlight?: Set<string>;
  className?: string;
  empty?: string;
}) {
  if (skills.length === 0) {
    return empty ? <p className={cn('text-sm text-ink-500', className)}>{empty}</p> : null;
  }

  return (
    <ul className={cn('flex flex-wrap gap-1.5', className)}>
      {skills.map((skill) => {
        const tone = highlight?.has(skill.id)
          ? 'border-brand-300 bg-brand-50 text-brand-800'
          : 'border-ink-300 bg-white text-ink-700';
        const classes = cn('inline-block border px-2 py-0.5 text-xs transition', tone);
        return (
          <li key={skill.id}>
            {link ? (
              <Link
                to={`/student/skills/${skill.id}`}
                className={cn(classes, 'hover:border-brand-500')}
              >
                {skill.name}
              </Link>
            ) : (
              <span className={classes}>{skill.name}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** The outside-link affordance, used for every URL that leaves OAA. */
export function ExternalLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-1.5 text-brand-700 underline decoration-brand-300 underline-offset-4 transition hover:text-brand-600 hover:decoration-brand-500',
        className,
      )}
    >
      {children}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
        className="size-3.5"
      >
        <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
