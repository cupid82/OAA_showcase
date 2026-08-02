import { useState } from 'react';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Icon } from '@/components/ui/Icon';
import { Loading } from '@/components/ui/Loading';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/cn';
import { useApi } from '@/lib/useApi';
import type { Announcement } from '@/types';

/**
 * Category ink. Only `urgent` raises its voice, and it is paired with the word
 * "Urgent" and an edge rule rather than relying on the colour alone.
 */
const CATEGORY_INK: Record<string, string> = {
  urgent: 'text-red-700',
  /* accent-700, not 600: at 11px this is text, and 600 measures 4.10:1 on ink-50. */
  examination: 'text-accent-700',
  academic: 'text-brand-700',
  event: 'text-ink-600',
  general: 'text-ink-600',
};

const FILTERS = ['all', 'academic', 'examination', 'event', 'general', 'urgent'] as const;

function formatDate(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;
  return at.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * One notice, set as an index entry: metadata in a left rail, the notice itself
 * in the measure beside it. The rail is what makes a long list scannable by date
 * or by source without reading a single headline.
 */
function Entry({ announcement }: { announcement: Announcement }) {
  const urgent = announcement.category === 'urgent';

  /*
    The urgent rule is drawn, not padded in. As a `border-l` plus `pl-5` it pushed
    that one entry's date and category out of the index column, so the left rail
    stopped lining up exactly where the eye scans it.
  */
  return (
    <li
      className={cn(
        'relative grid gap-x-8 gap-y-2 border-t border-ink-200 py-7 md:grid-cols-[10.5rem_1fr]',
        urgent && 'before:absolute before:inset-y-0 before:-left-4 before:w-0.5 before:bg-red-600',
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 md:block">
        <p className="font-mono text-xs text-ink-500">{formatDate(announcement.postedAt)}</p>
        <p
          className={cn(
            'text-[0.6875rem] font-semibold tracking-[0.07em] uppercase md:mt-2',
            CATEGORY_INK[announcement.category] ?? CATEGORY_INK.general,
          )}
        >
          {announcement.category}
        </p>
        <p className="text-xs text-ink-500 md:mt-2">{announcement.postedBy}</p>
      </div>

      <div className="min-w-0">
        <h3 className="font-serif text-xl text-ink-900">{announcement.title}</h3>
        <p className="prose-measure mt-2 leading-relaxed text-ink-700">{announcement.body}</p>
      </div>
    </li>
  );
}

export default function AnnouncementsPage() {
  const { data, error, loading, reload } = useApi<Announcement[]>('/api/students/me/announcements');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');

  if (loading) return <Loading variant="page" label="Loading announcements…" />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  const all = data ?? [];
  const shown = filter === 'all' ? all : all.filter((row) => row.category === filter);

  /*
    Grouped here rather than trusted from the response: a pinned notice belongs at
    the top whatever order the API returns, and the two groups need their own
    headings anyway.
  */
  const pinned = shown.filter((row) => row.pinned);
  const rest = shown.filter((row) => !row.pinned);

  return (
    <>
      <PageHeader
        eyebrow="Notice board"
        title="Announcements"
        description="Notices from your department, the examination cell and the college office."
      />

      {all.length === 0 ? (
        <EmptyState
          title="Nothing posted yet"
          description="Notices addressed to you will appear here."
        />
      ) : (
        <>
          {/*
            Filters as text, not as a row of filled buttons. Six solid chips
            competed with the notices they were filtering; an underline marks the
            active one at a fraction of the weight.
          */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-ink-200 pb-4">
            {FILTERS.map((option) => {
              const count =
                option === 'all' ? all.length : all.filter((row) => row.category === option).length;
              if (count === 0 && option !== 'all') return null;

              const active = filter === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  aria-pressed={active}
                  className={cn(
                    'flex items-baseline gap-1.5 border-b-2 pb-1 text-sm transition',
                    active
                      ? 'border-brand-600 text-ink-900'
                      : 'border-transparent text-ink-500 hover:text-ink-900',
                  )}
                >
                  <span className="capitalize">{option}</span>
                  <span className="font-mono text-[0.6875rem] text-ink-400">{count}</span>
                </button>
              );
            })}
          </div>

          {shown.length === 0 ? (
            <p className="py-10 text-sm text-ink-500">Nothing filed under {filter}.</p>
          ) : (
            <>
              {pinned.length > 0 && (
                <section className="mt-8">
                  <h2 className="kicker flex items-center gap-1.5 text-ink-500">
                    <Icon name="pin" className="size-3.5" />
                    Pinned
                  </h2>
                  <ul>
                    {pinned.map((announcement) => (
                      <Entry key={announcement.id} announcement={announcement} />
                    ))}
                  </ul>
                </section>
              )}

              {rest.length > 0 && (
                <section className={pinned.length > 0 ? 'mt-12' : 'mt-8'}>
                  {pinned.length > 0 && <h2 className="kicker text-ink-500">Earlier</h2>}
                  <ul>
                    {rest.map((announcement) => (
                      <Entry key={announcement.id} announcement={announcement} />
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
