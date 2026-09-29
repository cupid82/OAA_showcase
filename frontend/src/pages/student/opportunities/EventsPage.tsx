import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { DatePlate, SectionHeading, SkillChips } from '@/components/ui/Bits';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Checkbox } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { Chip } from '@/components/ui/Tabs';
import { api } from '@/lib/api';
import { formatDay, relativeDays, daysUntil } from '@/lib/format';
import {
  EVENT_MODE_LABEL,
  EVENT_TYPE_LABEL,
  OUTCOME_LABEL,
  PARTICIPATION_LABEL,
} from '@/lib/labels';
import { useAction } from '@/lib/useAction';
import { useApi } from '@/lib/useApi';
import type { EventCard, EventDetail, EventType, EventsOverview } from '@/types';

import { FitBadge, LISTING_STATUS_TEXT, SourceBadge } from './shared';

const TYPES = Object.keys(EVENT_TYPE_LABEL) as EventType[];

export default function EventsPage() {
  const { data, error, loading, reload } = useApi<EventsOverview>('/api/events');
  const [type, setType] = useState<EventType | 'all'>('all');
  const [fitsOnly, setFitsOnly] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const act = useAction(
    async (eventId: string, body: object, message: string, path = 'participation') => {
      await api.put<{ data: EventDetail }>(`/api/events/${eventId}/${path}`, body);
      setNotice(message);
      reload();
    },
  );

  const upcoming = useMemo(
    () =>
      (data?.upcoming ?? []).filter(
        (event) =>
          (type === 'all' || event.type === type) &&
          (!fitsOnly || (event.match.eligible && event.match.have.length > 0)),
      ),
    [data, type, fitsOnly],
  );

  if (loading && !data) return <Loading variant="page" label="Loading events…" />;
  if (error && !data) return <ErrorMessage message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <>
      <PageHeader
        eyebrow="Events"
        title="Hackathons, workshops and talks"
        description="Everything says who posted it. Save what interests you, mark it registered, and afterwards write what you took away — that’s what turns going into evidence."
        actions={
          <ButtonLink to="/student/events/share" variant="secondary">
            <Icon name="send" className="size-4" />
            Share an event
          </ButtonLink>
        }
      />

      <div className="mb-8 space-y-3">
        {notice && (
          <Notice tone="success" onDismiss={() => setNotice(null)}>
            {notice}
          </Notice>
        )}
        {act.error && <ErrorMessage message={act.error} />}
      </div>

      <p className="mb-10 text-sm text-ink-600">
        {data.counts.registered} registered · {data.counts.saved} saved · {data.counts.attended}{' '}
        attended so far
      </p>

      {data.mine.length > 0 && (
        <section aria-labelledby="mine-heading" className="mb-14">
          <SectionHeading id="mine-heading" title="Your upcoming" />
          <ul>
            {data.mine.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </ul>
        </section>
      )}

      {data.recommended.length > 0 && (
        <section aria-labelledby="rec-heading" className="mb-14">
          <SectionHeading id="rec-heading" title="Suggested for you" note="Each one says why" />
          <ul className="grid gap-4 lg:grid-cols-2">
            {data.recommended.map((event) => (
              <li key={event.id} className="flex flex-col border border-ink-300 bg-white px-5 py-5">
                <div className="flex flex-wrap items-center gap-2">
                  <FitBadge match={event.match} />
                  <Badge tone="neutral">{EVENT_TYPE_LABEL[event.type]}</Badge>
                  <SourceBadge verification={event.verification} label={event.verificationLabel} />
                </div>
                <Link
                  to={`/student/events/${event.id}`}
                  className="mt-3 font-serif text-xl text-ink-900 hover:text-brand-700"
                >
                  {event.title}
                </Link>
                <p className="mt-1 text-sm text-ink-500">
                  {formatDay(event.startsOn)} · {event.location}
                  {event.registerBy &&
                    ` · register ${relativeDays(daysUntil(event.registerBy)).replace('in ', 'within ')}`}
                </p>
                <p className="mt-3 text-sm text-ink-700">
                  {event.match.reasons.slice(0, 2).join(' ')}
                </p>
                <div className="mt-auto flex flex-wrap gap-3 pt-5">
                  <Button
                    size="sm"
                    disabled={act.pending}
                    onClick={() =>
                      void act.run(event.id, { status: 'saved' }, `Saved “${event.title}”.`)
                    }
                  >
                    <Icon name="bookmark" className="size-4" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={act.pending}
                    onClick={() =>
                      void act.run(
                        event.id,
                        { notInterested: true },
                        'Hidden. Suggestions like it will come up less.',
                        'interest',
                      )
                    }
                  >
                    Not interested
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="all-heading">
        <SectionHeading id="all-heading" title="Everything coming up" />
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <Chip active={type === 'all'} onClick={() => setType('all')}>
              All
            </Chip>
            {TYPES.map((option) => (
              <Chip key={option} active={type === option} onClick={() => setType(option)}>
                {EVENT_TYPE_LABEL[option]}
              </Chip>
            ))}
          </div>
          <Checkbox
            id="fits-only"
            checked={fitsOnly}
            onChange={setFitsOnly}
            label="Only ones that use my skills"
          />
        </div>

        {upcoming.length === 0 ? (
          <EmptyState
            title="Nothing matches"
            description="Try another type, or clear the skills filter."
          />
        ) : (
          <ul>
            {upcoming.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </ul>
        )}
      </section>

      {data.past.length > 0 && (
        <section aria-labelledby="past-heading" className="mt-14">
          <SectionHeading
            id="past-heading"
            title="Already happened"
            note="Reflections turn going into evidence"
          />
          <ul>
            {data.past.map((event) => (
              <EventRow key={event.id} event={event} past />
            ))}
          </ul>
        </section>
      )}

      {data.shared.length > 0 && (
        <section aria-labelledby="shared-heading" className="mt-14">
          <SectionHeading id="shared-heading" title="Shared by you" />
          <ul>
            {data.shared.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function EventRow({ event, past = false }: { event: EventCard; past?: boolean }) {
  const needsReflection = event.my?.status === 'attended' && event.my.reflection.trim() === '';

  return (
    <li>
      <Link
        to={`/student/events/${event.id}`}
        className="group flex flex-wrap items-start gap-5 border-b border-ink-200 py-5 transition hover:bg-white sm:flex-nowrap"
      >
        <DatePlate date={event.startsOn} muted={past || !event.upcoming} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{EVENT_TYPE_LABEL[event.type]}</Badge>
            <SourceBadge verification={event.verification} label={event.verificationLabel} />
            {event.my && (
              <Badge
                tone={
                  event.my.status === 'registered'
                    ? 'solid'
                    : event.my.status === 'attended'
                      ? 'dark'
                      : 'brand'
                }
              >
                {event.my.status === 'registered' && <Icon name="check" className="size-3" />}
                {PARTICIPATION_LABEL[event.my.status]}
                {event.my.outcome &&
                  event.my.outcome !== 'participated' &&
                  ` · ${OUTCOME_LABEL[event.my.outcome]}`}
              </Badge>
            )}
            {event.status !== 'published' && (
              <Badge tone="accent">{LISTING_STATUS_TEXT[event.status]}</Badge>
            )}
          </div>
          <h3 className="mt-2.5 font-serif text-xl text-ink-900 group-hover:text-brand-800">
            {event.title}
          </h3>
          <p className="mt-1 text-sm text-ink-500">
            {event.time ? `${event.time} · ` : ''}
            {EVENT_MODE_LABEL[event.mode]}
            {/* An online event's location is usually just "Online" — don't say it twice. */}
            {event.location.toLowerCase() !== EVENT_MODE_LABEL[event.mode].toLowerCase() &&
              ` · ${event.location}`}{' '}
            · {event.organiser}
          </p>
          <SkillChips
            skills={event.skills}
            link={false}
            highlight={new Set(event.match.have.map((skill) => skill.id))}
            className="mt-3"
          />
          {needsReflection && (
            <p className="mt-3 text-sm font-medium text-accent-700">
              Add what you took away from it →
            </p>
          )}
        </div>
        <div className="hidden w-36 shrink-0 text-right text-sm sm:block">
          {event.upcoming ? (
            <>
              <p className="text-ink-900">{relativeDays(event.daysUntil)}</p>
              {event.registerBy && event.registrationOpen && (
                <p className="text-xs text-ink-500">register by {formatDay(event.registerBy)}</p>
              )}
              {event.going > 0 && (
                <p className="text-xs text-ink-500">{event.going} going from here</p>
              )}
            </>
          ) : (
            <p className="text-ink-500">{formatDay(event.startsOn)}</p>
          )}
        </div>
      </Link>
    </li>
  );
}
