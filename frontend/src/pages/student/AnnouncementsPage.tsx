import { useState } from 'react';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Loading } from '@/components/ui/Loading';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/cn';
import { useApi } from '@/lib/useApi';
import type { Announcement } from '@/types';

/**
 * Category styling. `urgent` is the only one that raises its voice, and it is
 * paired with the word "Urgent" rather than relying on the colour alone.
 */
const CATEGORY_STYLE: Record<string, string> = {
  urgent: 'border-red-300 bg-red-50 text-red-800',
  examination: 'border-accent-500 bg-accent-400/15 text-accent-600',
  academic: 'border-brand-300 bg-brand-50 text-brand-700',
  event: 'border-ink-300 bg-ink-100 text-ink-700',
  general: 'border-ink-300 bg-ink-100 text-ink-700',
};

const FILTERS = ['all', 'academic', 'examination', 'event', 'general', 'urgent'] as const;

function formatDate(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;
  return at.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function AnnouncementsPage() {
  const { data, error, loading, reload } = useApi<Announcement[]>('/api/students/me/announcements');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');

  if (loading) return <Loading variant="page" label="Loading announcements…" />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  const all = data ?? [];
  const shown = filter === 'all' ? all : all.filter((row) => row.category === filter);

  return (
    <>
      <PageHeader
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
          <div className="flex flex-wrap gap-2 border-b border-ink-300 pb-6">
            {FILTERS.map((option) => {
              const count =
                option === 'all' ? all.length : all.filter((row) => row.category === option).length;
              if (count === 0 && option !== 'all') return null;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  aria-pressed={filter === option}
                  className={cn(
                    'kicker border px-3 py-1.5 transition',
                    filter === option
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-ink-300 bg-white text-ink-600 hover:border-ink-400 hover:text-ink-900',
                  )}
                >
                  {option === 'all' ? 'All' : option} ({count})
                </button>
              );
            })}
          </div>

          <ul className="mt-2">
            {shown.map((announcement) => (
              <li key={announcement.id} className="border-b border-ink-200 py-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={cn(
                      'kicker border px-2 py-1',
                      CATEGORY_STYLE[announcement.category] ?? CATEGORY_STYLE.general,
                    )}
                  >
                    {announcement.category}
                  </span>
                  {announcement.pinned && <span className="kicker text-ink-500">📌 Pinned</span>}
                  <span className="text-sm text-ink-500">{formatDate(announcement.postedAt)}</span>
                </div>

                <h2 className="mt-3 font-serif text-xl text-ink-900">{announcement.title}</h2>
                <p className="prose-measure mt-2 text-ink-700">{announcement.body}</p>
                <p className="mt-3 text-sm text-ink-500">— {announcement.postedBy}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
