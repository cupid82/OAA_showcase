import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { ExternalLink, SectionHeading, SkillChips } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Field, TextArea } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { SkillPicker } from '@/components/ui/SkillPicker';
import { Chip } from '@/components/ui/Tabs';
import { api } from '@/lib/api';
import { formatDate, formatDay, relativeDays } from '@/lib/format';
import {
  EVENT_MODE_LABEL,
  EVENT_TYPE_LABEL,
  OUTCOME_LABEL,
  PARTICIPATION_LABEL,
} from '@/lib/labels';
import { useAction } from '@/lib/useAction';
import { useApi } from '@/lib/useApi';
import type { EventDetail, EventOutcome } from '@/types';

import { FitBadge, SourceBadge, WhyItFits, sourceHint } from './shared';

const OUTCOMES: EventOutcome[] = ['participated', 'finalist', 'winner'];

export default function EventDetailPage() {
  const { eventId = '' } = useParams();
  const { data, error, loading, reload, setData } = useApi<EventDetail>(`/api/events/${eventId}`);
  const [notice, setNotice] = useState<string | null>(null);

  const update = useAction(async (path: string, body: object, message: string) => {
    const { data: next } = await api.put<{ data: EventDetail }>(
      `/api/events/${eventId}/${path}`,
      body,
    );
    setData(next);
    setNotice(message);
    return true as const;
  });

  if (loading && !data) return <Loading variant="page" />;
  if (error && !data)
    return <ErrorMessage title="Event unavailable" message={error} onRetry={reload} />;
  if (!data) return null;

  const started = data.daysUntil <= 0;
  const status = data.my?.status ?? null;
  const live = data.status === 'published';

  return (
    <>
      <Link
        to="/student/events"
        className="kicker inline-flex items-center gap-2 text-ink-500 hover:text-ink-900"
      >
        <Icon name="arrowLeft" className="size-4" />
        Events
      </Link>

      <header className="mt-5 border-b border-ink-200 pb-7">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{EVENT_TYPE_LABEL[data.type]}</Badge>
          <Badge tone="muted">{EVENT_MODE_LABEL[data.mode]}</Badge>
          <SourceBadge verification={data.verification} label={data.verificationLabel} />
          {live && data.upcoming && <FitBadge match={data.match} />}
        </div>
        <h1 className="mt-4 font-serif text-4xl text-ink-900">{data.title}</h1>
        <p className="mt-2 text-lg text-ink-600">{data.organiser}</p>
      </header>

      <div className="mt-6 space-y-3">
        {notice && (
          <Notice tone="success" onDismiss={() => setNotice(null)}>
            {notice}
          </Notice>
        )}
        {update.error && <ErrorMessage message={update.error} />}
        {data.sharedByYou && data.status === 'pending' && (
          <Notice tone="info" title="Waiting for review">
            You shared this. A moderator checks the link before anyone else sees it; you’ll get a
            notification either way.
          </Notice>
        )}
        {data.sharedByYou && data.status === 'rejected' && (
          <Notice tone="warning" title="Not published">
            {data.reviewNote || 'A moderator decided not to publish this one.'}
          </Notice>
        )}
      </div>

      <div className="mt-8 grid gap-x-12 gap-y-12 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-12">
          <dl className="grid gap-px border border-ink-300 bg-ink-300 sm:grid-cols-2 lg:grid-cols-4">
            <Fact label="When">
              {formatDay(data.startsOn)}
              {data.endsOn && data.endsOn !== data.startsOn && ` – ${formatDay(data.endsOn)}`}
              <span className="block text-xs text-ink-500">
                {data.upcoming ? relativeDays(data.daysUntil) : 'Already happened'}
              </span>
            </Fact>
            <Fact label="Time">{data.time || '—'}</Fact>
            <Fact label="Where">{data.location}</Fact>
            <Fact label="Register by">
              {data.registerBy ? formatDate(data.registerBy, true) : 'On the day'}
              {data.registerBy && !data.registrationOpen && data.upcoming && (
                <span className="block text-xs text-accent-700">Closed</span>
              )}
            </Fact>
            <Fact label="Effort">{data.effort || '—'}</Fact>
            <Fact label="Places">{data.capacity ?? 'Not capped'}</Fact>
            <Fact label="Going from here">{data.going}</Fact>
            <Fact label="Open to">
              {data.eligibleYears.length ? `Year ${data.eligibleYears.join(', ')}` : 'Everyone'}
            </Fact>
          </dl>

          <section aria-labelledby="about-heading">
            <SectionHeading id="about-heading" title="About it" />
            <p className="prose-measure leading-relaxed text-ink-800">{data.description}</p>
            {data.eligibility && (
              <p className="prose-measure mt-4 text-sm text-ink-600">
                <span className="kicker mr-2 text-ink-500">Eligibility</span>
                {data.eligibility}
              </p>
            )}
            <div className="mt-6">
              <p className="kicker text-ink-500">Skills it uses</p>
              <SkillChips
                skills={data.skills}
                highlight={new Set(data.match.have.map((skill) => skill.id))}
                className="mt-2"
                empty="None listed."
              />
            </div>
            {data.tracks.length > 0 && (
              <p className="mt-4 text-sm text-ink-600">
                <span className="kicker mr-2 text-ink-500">Good for</span>
                {data.tracks.map((track) => track.name).join(', ')}
              </p>
            )}
          </section>

          {live && (
            <section aria-labelledby="why-heading">
              <SectionHeading id="why-heading" title="Why you’re seeing it" />
              <WhyItFits match={data.match} />
            </section>
          )}

          {status === 'attended' && (
            <Reflection data={data} run={update.run} pending={update.pending} />
          )}
        </div>

        <aside className="min-w-0 space-y-8">
          {live || data.status === 'archived' ? (
            <section
              aria-labelledby="you-heading"
              className="border border-ink-300 bg-white px-5 py-5"
            >
              <h2 id="you-heading" className="kicker text-ink-500">
                You
              </h2>
              <p className="mt-2 font-serif text-2xl text-ink-900">
                {status ? PARTICIPATION_LABEL[status] : 'Not in your list'}
                {data.my?.outcome &&
                  data.my.outcome !== 'participated' &&
                  ` · ${OUTCOME_LABEL[data.my.outcome]}`}
              </p>

              <div className="mt-5 flex flex-col gap-2">
                {data.upcoming && status !== 'saved' && status !== 'registered' && (
                  <Button
                    variant="secondary"
                    disabled={update.pending}
                    onClick={() =>
                      void update.run(
                        'participation',
                        { status: 'saved' },
                        'Saved. Its dates are on your dashboard.',
                      )
                    }
                  >
                    <Icon name="bookmark" className="size-4" />
                    Save for later
                  </Button>
                )}
                {data.upcoming && status !== 'registered' && (
                  <Button
                    disabled={update.pending}
                    onClick={() =>
                      void update.run(
                        'participation',
                        { status: 'registered' },
                        'Marked as registered. You’ll get a reminder the day before.',
                      )
                    }
                  >
                    <Icon name="check" className="size-4" />
                    I’ve registered
                  </Button>
                )}
                {started && status !== 'attended' && (
                  <Button
                    disabled={update.pending}
                    onClick={() =>
                      void update.run(
                        'participation',
                        { status: 'attended' },
                        'Marked as attended. Add what you took away from it.',
                      )
                    }
                  >
                    <Icon name="award" className="size-4" />I went
                  </Button>
                )}
                {status && (
                  <Button
                    variant="ghost"
                    disabled={update.pending}
                    onClick={() =>
                      void update.run(
                        'participation',
                        { status: 'none' },
                        'Removed from your list.',
                      )
                    }
                  >
                    Remove from my list
                  </Button>
                )}
              </div>

              {data.url ? (
                <p className="mt-5 border-t border-ink-200 pt-4 text-sm">
                  <ExternalLink href={data.url}>Register on the organiser’s site</ExternalLink>
                  <span className="mt-1 block text-xs text-ink-500">
                    OAA doesn’t register you — marking it here is your own record.
                  </span>
                </p>
              ) : (
                <p className="mt-5 border-t border-ink-200 pt-4 text-xs text-ink-500">
                  Registration is through {data.organiser}. Marking it here is your own record.
                </p>
              )}
            </section>
          ) : null}

          <section className="border border-ink-200 bg-ink-50 px-5 py-4">
            <p className="kicker text-ink-500">Where it came from</p>
            <p className="mt-2 text-sm text-ink-700">{sourceHint(data.verification)}</p>
          </section>

          {live && data.upcoming && !status && (
            <button
              type="button"
              disabled={update.pending}
              onClick={() =>
                void update.run(
                  'interest',
                  { notInterested: !data.notInterested },
                  data.notInterested
                    ? 'It can be suggested again.'
                    : 'Got it — suggestions like this will come up less.',
                )
              }
              className="kicker text-ink-500 transition hover:text-ink-900"
            >
              {data.notInterested ? 'Undo “not interested”' : 'Not interested'}
            </button>
          )}
        </aside>
      </div>
    </>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bg-white px-4 py-4">
      <dt className="kicker text-ink-500">{label}</dt>
      <dd className="mt-1.5 text-sm text-ink-900">{children}</dd>
    </div>
  );
}

function Reflection({
  data,
  run,
  pending,
}: {
  data: EventDetail;
  run: (path: string, body: object, message: string) => Promise<true | undefined>;
  pending: boolean;
}) {
  const [outcome, setOutcome] = useState<EventOutcome>(data.my?.outcome ?? 'participated');
  const [reflection, setReflection] = useState(data.my?.reflection ?? '');
  const [skills, setSkills] = useState<string[]>(data.my?.skills.map((skill) => skill.id) ?? []);

  useEffect(() => {
    setOutcome(data.my?.outcome ?? 'participated');
    setReflection(data.my?.reflection ?? '');
    setSkills(data.my?.skills.map((skill) => skill.id) ?? []);
  }, [data.my]);

  return (
    <section aria-labelledby="reflect-heading">
      <SectionHeading
        id="reflect-heading"
        title="What you took away"
        note="Private unless you share your portfolio"
      />
      <form
        className="space-y-6 border border-ink-300 bg-white px-5 py-5"
        onSubmit={(event) => {
          event.preventDefault();
          void run(
            'participation',
            { status: 'attended', outcome, reflection, skillIds: skills },
            'Saved. The skills you used now count as practice on your skill map.',
          );
        }}
      >
        <div>
          <p className="kicker text-ink-500">How it went</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {OUTCOMES.map((option) => (
              <Chip key={option} active={outcome === option} onClick={() => setOutcome(option)}>
                {OUTCOME_LABEL[option]}
              </Chip>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-500">
            Finalist and winner finishes show on your portfolio as achievements.
          </p>
        </div>
        <Field id="reflection" label="In two or three sentences">
          <TextArea
            id="reflection"
            value={reflection}
            onChange={(event) => setReflection(event.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="What you built or learned, and what you’d do differently."
          />
        </Field>
        <Field
          id="reflect-skills"
          label="Skills you actually used"
          help="Only skills on your list count towards your skill map."
        >
          <SkillPicker id="reflect-skills" value={skills} onChange={setSkills} />
        </Field>
        <Button type="submit" size="sm" disabled={pending}>
          Save reflection
        </Button>
      </form>
    </section>
  );
}
