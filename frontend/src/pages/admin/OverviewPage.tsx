import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { SectionHeading } from '@/components/ui/Bits';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Icon } from '@/components/ui/Icon';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/cn';
import { timeAgo } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import type { AdminOverview } from '@/types';

const ACTION_LABEL: Record<string, string> = {
  create: 'published',
  update: 'edited',
  approve: 'approved',
  reject: 'turned down',
  archive: 'archived',
  restore: 'restored',
};

/**
 * The moderator's overview. Counts, never people: no number on this page can be
 * traced back to one student, and the wellbeing split stays hidden until enough
 * students check in that it couldn't be.
 */
export default function OverviewPage() {
  const { data, error, loading, reload } = useApi<AdminOverview>('/api/admin/overview');

  if (loading && !data) return <Loading variant="page" />;
  if (error && !data) return <ErrorMessage message={error} onRetry={reload} />;
  if (!data) return null;

  const pending = data.review.events + data.review.jobs;

  return (
    <>
      <PageHeader
        eyebrow="Moderation"
        title="How OAA is being used"
        description="Counts only. Nothing on these pages shows an individual student’s projects, check-ins or applications — by design, not by permission."
      />

      {pending > 0 && (
        <Notice tone="warning" title={`${pending} waiting for review`} className="mb-10">
          {data.review.events > 0 && (
            <Link
              to="/admin/events?status=pending"
              className="mr-5 text-brand-700 underline underline-offset-4"
            >
              {data.review.events} event{data.review.events === 1 ? '' : 's'}
            </Link>
          )}
          {data.review.jobs > 0 && (
            <Link
              to="/admin/jobs?status=pending"
              className="text-brand-700 underline underline-offset-4"
            >
              {data.review.jobs} job{data.review.jobs === 1 ? '' : 's'}
            </Link>
          )}
        </Notice>
      )}

      <div className="grid gap-px border border-ink-300 bg-ink-300 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          label="Students on OAA"
          value={data.students.onboarded}
          note={`of ${data.students.total} with an account · ${data.students.activeThisMonth} active this month`}
        />
        <Tile
          label="Projects shipped"
          value={data.projects.shipped}
          note={`${data.projects.shippedThisMonth} this month · ${data.projects.building} being built`}
        />
        <Tile
          label="Upcoming events"
          value={data.opportunities.eventsUpcoming}
          note={`${data.opportunities.registrations} registrations from here`}
          to="/admin/events"
        />
        <Tile
          label="Open listings"
          value={data.opportunities.jobsOpen}
          note={`${data.opportunities.applicationsTracked} applications tracked · ${data.opportunities.offers} offers`}
          to="/admin/jobs"
        />
      </div>

      <div className="mt-14 grid gap-x-12 gap-y-14 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section aria-labelledby="gap-heading" className="min-w-0">
          <SectionHeading
            id="gap-heading"
            title="The campus skill gap"
            note="What open listings ask for, against what students can show"
          />
          {data.skillDemand.length === 0 ? (
            <p className="text-sm text-ink-500">No open listings name skills yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-sm">
                <thead>
                  <tr className="border-b border-ink-900 text-left">
                    <th scope="col" className="kicker py-2 pr-4 font-medium text-ink-500">
                      Skill
                    </th>
                    <th
                      scope="col"
                      className="kicker py-2 pr-4 text-right font-medium text-ink-500"
                    >
                      Listings asking
                    </th>
                    <th
                      scope="col"
                      className="kicker py-2 pr-4 text-right font-medium text-ink-500"
                    >
                      Students proven
                    </th>
                    <th scope="col" className="kicker py-2 text-right font-medium text-ink-500">
                      Listing it
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.skillDemand.map((row) => {
                    const gap = row.openings > 0 && row.proven < row.openings;
                    return (
                      <tr key={row.skill.id} className="border-b border-ink-200">
                        <th scope="row" className="py-3 pr-4 text-left font-normal text-ink-900">
                          {row.skill.name}
                          {gap && <span className="kicker ml-2 text-accent-700">gap</span>}
                        </th>
                        <td className="py-3 pr-4 text-right font-mono tabular-nums">
                          {row.openings}
                        </td>
                        <td
                          className={cn(
                            'py-3 pr-4 text-right font-mono tabular-nums',
                            gap && 'text-accent-700',
                          )}
                        >
                          {row.proven}
                        </td>
                        <td className="py-3 text-right font-mono text-ink-500 tabular-nums">
                          {row.listed}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-4 text-xs text-ink-500">
            A gap — more listings than students who can prove the skill — is a cue for a workshop,
            not a judgement of anyone.
          </p>
        </section>

        <aside className="min-w-0 space-y-12">
          <section aria-labelledby="wellbeing-heading">
            <SectionHeading id="wellbeing-heading" title="Wellbeing, in aggregate" />
            <p className="text-sm text-ink-600">
              {data.wellbeing.checkinsThisWeek} check-ins this week · {data.wellbeing.participants}{' '}
              students checking in over the last month.
            </p>
            {data.wellbeing.levels ? (
              <Levels levels={data.wellbeing.levels} />
            ) : (
              <p className="mt-4 border border-ink-200 bg-white px-4 py-3 text-sm text-ink-600">
                The split is hidden until at least {data.wellbeing.threshold} students have a
                reading — below that, a number could point at a person.
              </p>
            )}
          </section>

          <section aria-labelledby="activity-heading">
            <SectionHeading id="activity-heading" title="Recent moderation" />
            {data.recentModeration.length === 0 ? (
              <p className="text-sm text-ink-500">
                Nothing yet. Every publish, edit and review is recorded here, permanently.
              </p>
            ) : (
              <ul>
                {data.recentModeration.map((row) => {
                  const [entity, verb] = row.action.split('.');
                  return (
                    <li key={row.id} className="border-b border-ink-200 py-2.5 text-sm">
                      <p className="text-ink-800">
                        {row.actor} {ACTION_LABEL[verb ?? ''] ?? verb}{' '}
                        <span className="text-ink-900">{row.title}</span>
                      </p>
                      <p className="text-xs text-ink-500">
                        {entity} · {timeAgo(row.at)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}

function Tile({
  label,
  value,
  note,
  to,
}: {
  label: string;
  value: number;
  note: ReactNode;
  to?: string;
}) {
  const body = (
    <>
      <p className="kicker text-ink-500">{label}</p>
      <p className="mt-2 font-serif text-5xl leading-none text-ink-900">{value}</p>
      <p className="mt-2 text-sm text-ink-600">{note}</p>
      {to && (
        <span className="kicker mt-3 inline-flex items-center gap-1.5 text-brand-700">
          Manage <Icon name="arrowRight" className="size-3.5" />
        </span>
      )}
    </>
  );
  return to ? (
    <Link to={to} className="block bg-white px-5 py-5 transition hover:bg-ink-50">
      {body}
    </Link>
  ) : (
    <div className="bg-white px-5 py-5">{body}</div>
  );
}

function Levels({ levels }: { levels: { steady: number; stretched: number; atRisk: number } }) {
  const total = levels.steady + levels.stretched + levels.atRisk || 1;
  const parts = [
    { label: 'Steady', value: levels.steady, className: 'bg-brand-300' },
    { label: 'Stretched', value: levels.stretched, className: 'bg-accent-400' },
    { label: 'Running hot', value: levels.atRisk, className: 'bg-accent-600' },
  ];

  return (
    <div className="mt-4">
      <div className="flex h-3 overflow-hidden" aria-hidden="true">
        {parts.map((part) => (
          <span
            key={part.label}
            className={part.className}
            style={{ width: `${(part.value / total) * 100}%` }}
          />
        ))}
      </div>
      <ul className="mt-3 space-y-1 text-sm">
        {parts.map((part) => (
          <li key={part.label} className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-ink-700">
              <span aria-hidden="true" className={cn('size-2.5', part.className)} />
              {part.label}
            </span>
            <span className="font-mono text-ink-900">{part.value}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-ink-500">
        If “running hot” climbs across campus, that’s a signal to ease deadlines or run a support
        session — never to contact individuals, who aren’t identifiable here.
      </p>
    </div>
  );
}
