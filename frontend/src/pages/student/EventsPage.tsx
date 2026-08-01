import { useState } from 'react';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Loading } from '@/components/ui/Loading';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/cn';
import { useApi } from '@/lib/useApi';
import type { CampusEvent } from '@/types';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const TYPE_LABEL: Record<string, string> = {
  technical: 'Technical',
  workshop: 'Workshop',
  sports: 'Sports',
  social: 'Social',
  cultural: 'Cultural',
};

/** A date plate — the day and month, as a printed calendar tear-off would show it. */
function DatePlate({ date, past }: { date: string; past: boolean }) {
  const [, month, day] = date.split('-');

  return (
    <div
      className={cn(
        'flex size-16 shrink-0 flex-col items-center justify-center border',
        past
          ? 'border-ink-300 bg-ink-100 text-ink-500'
          : 'border-brand-300 bg-brand-50 text-brand-800',
      )}
    >
      <span className="font-serif text-2xl leading-none">{Number(day)}</span>
      <span className="kicker mt-1 text-[10px]">{MONTHS[Number(month) - 1]}</span>
    </div>
  );
}

export default function EventsPage() {
  const { data, error, loading, reload } = useApi<CampusEvent[]>('/api/students/me/events');
  const [type, setType] = useState('all');

  if (loading) return <Loading variant="page" label="Loading events…" />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  const all = data ?? [];
  const types = [...new Set(all.map((event) => event.type))];
  const shown = type === 'all' ? all : all.filter((event) => event.type === type);

  const upcoming = shown.filter((event) => event.upcoming);
  const past = shown.filter((event) => !event.upcoming);
  const registeredCount = all.filter((event) => event.registered).length;

  return (
    <>
      <PageHeader
        title="Events"
        description="Symposiums, workshops, sport and outreach. Participation feeds the social dimension of your ability score."
      />

      {all.length === 0 ? (
        <EmptyState
          title="No events scheduled"
          description="Events appear here once the college publishes them."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink-300 pb-6">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setType('all')}
                aria-pressed={type === 'all'}
                className={cn(
                  'kicker border px-3 py-1.5 transition',
                  type === 'all'
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-ink-300 bg-white text-ink-600 hover:border-ink-400 hover:text-ink-900',
                )}
              >
                All ({all.length})
              </button>
              {types.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setType(option)}
                  aria-pressed={type === option}
                  className={cn(
                    'kicker border px-3 py-1.5 transition',
                    type === option
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-ink-300 bg-white text-ink-600 hover:border-ink-400 hover:text-ink-900',
                  )}
                >
                  {TYPE_LABEL[option] ?? option}
                </button>
              ))}
            </div>

            <p className="text-sm text-ink-600">
              You are registered for{' '}
              <span className="font-medium text-ink-900">{registeredCount}</span> of {all.length}
            </p>
          </div>

          {upcoming.length > 0 && (
            <section className="mt-8">
              <h2 className="border-b border-ink-300 pb-3 font-serif text-xl text-ink-900">
                Upcoming
              </h2>
              <ul>
                {upcoming.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </ul>
            </section>
          )}

          {past.length > 0 && (
            <section className="mt-12">
              <h2 className="border-b border-ink-300 pb-3 font-serif text-xl text-ink-900">
                Already held
              </h2>
              <ul>
                {past.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </ul>
            </section>
          )}

          <p className="mt-10 border-t border-ink-300 pt-5 text-sm text-ink-500">
            Registration is handled by the organising body — this page shows where you are already
            signed up. Attendance at an event is recorded by staff and appears in the social
            contribution list on your OAA page.
          </p>
        </>
      )}
    </>
  );
}

function EventRow({ event }: { event: CampusEvent }) {
  const remaining = event.capacity - event.registrationCount;

  return (
    <li className="flex flex-wrap items-start gap-5 border-b border-ink-200 py-5">
      <DatePlate date={event.date} past={!event.upcoming} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <span className="kicker border border-ink-300 bg-ink-100 px-2 py-1 text-ink-700">
            {TYPE_LABEL[event.type] ?? event.type}
          </span>
          {event.registered && (
            <span className="kicker border border-brand-300 bg-brand-50 px-2 py-1 text-brand-700">
              ✓ Registered
            </span>
          )}
          {event.upcoming && event.full && !event.registered && (
            <span className="kicker border border-ink-300 bg-white px-2 py-1 text-ink-500">
              Full
            </span>
          )}
        </div>

        <h3 className="mt-2.5 font-serif text-xl text-ink-900">{event.title}</h3>
        <p className="prose-measure mt-1.5 text-sm text-ink-600">{event.description}</p>

        <p className="mt-3 text-sm text-ink-500">
          {event.time} · {event.venue} · {event.organiser}
        </p>
        {/*
          Capacity is college-wide; the registrations shown are the ones this
          portal holds. Stating both as a single ratio would read as "nobody is
          coming" when it only means the rest of the college is not in here yet.
        */}
        <p className="mt-1 text-sm text-ink-500">
          {event.registrationCount} registered from your year
          {event.upcoming &&
            (remaining > 0 ? ` · ${event.capacity} places in total` : ' · at capacity')}
          {' · worth '}
          {event.socialPoints} social points towards your ability score
        </p>
      </div>
    </li>
  );
}
