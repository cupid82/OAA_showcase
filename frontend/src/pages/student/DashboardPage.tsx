import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { SectionHeading } from '@/components/ui/Bits';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { ProviderMark } from '@/components/ui/ProviderMark';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { daysUntil, formatDate, formatDay, relativeDays, todayISO } from '@/lib/format';
import { BURNOUT_LABEL } from '@/lib/labels';
import { useAction } from '@/lib/useAction';
import { useApi } from '@/lib/useApi';
import type { ActionKind, Commitment, Today, TodayAction } from '@/types';

const KIND_ICON: Record<ActionKind, IconName> = {
  setup: 'compass',
  request: 'users',
  deadline: 'clock',
  event: 'ticket',
  milestone: 'flag',
  match: 'sparkle',
  portfolio: 'edit',
  project: 'rocket',
  skill: 'layers',
  wellbeing: 'heart',
};

const COMMITMENT_ICON: Record<Commitment['kind'], IconName> = {
  event: 'ticket',
  register: 'clock',
  deadline: 'briefcase',
  milestone: 'flag',
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** "by Sat 3 Oct", "overdue", "today". */
function dueLabel(due: string): string {
  const days = daysUntil(due);
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `By ${formatDay(due)}`;
}

export default function DashboardPage() {
  const { data, error, loading, reload, setData } = useApi<Today>('/api/dashboard');
  const [undo, setUndo] = useState<TodayAction | null>(null);

  const dismiss = useAction(async (action: TodayAction) => {
    const { data: next } = await api.post<{ data: Today }>('/api/dashboard/dismiss', {
      key: action.key,
    });
    setData(next);
    setUndo(action);
  });

  const restore = useAction(async (action: TodayAction) => {
    const { data: next } = await api.post<{ data: Today }>('/api/dashboard/restore', {
      key: action.key,
    });
    setData(next);
    setUndo(null);
  });

  if (loading && !data) return <Loading variant="page" label="Working out your next move…" />;
  if (error && !data) return <ErrorMessage message={error} onRetry={reload} />;
  if (!data) return null;

  const { stats } = data;

  return (
    <>
      <Hero data={data} />

      {/* Held above the list, so the list re-rendering can never take it away. */}
      <div className="mt-6 space-y-3">
        {undo && (
          <Notice tone="success" onDismiss={() => setUndo(null)}>
            Dismissed “{undo.title}”.{' '}
            <button
              type="button"
              onClick={() => void restore.run(undo)}
              className="font-medium text-brand-700 underline underline-offset-4 hover:text-brand-600"
            >
              Undo
            </button>
          </Notice>
        )}
        {(dismiss.error || restore.error) && (
          <ErrorMessage message={dismiss.error ?? restore.error ?? ''} />
        )}

        {data.focus && (
          <Notice
            tone="warning"
            title={data.focus === 'snoozed' ? 'Nudges snoozed' : 'Keeping it quiet'}
          >
            {data.focus === 'snoozed'
              ? 'You snoozed non-urgent nudges, so only deadlines and people waiting on you are shown. '
              : 'Your recent check-ins read “running hot”, so only what is genuinely urgent is shown. '}
            {data.heldBack > 0 &&
              `${data.heldBack} other suggestion${data.heldBack === 1 ? ' is' : 's are'} waiting for when you have room. `}
            <Link
              to="/student/burnout"
              className="font-medium text-brand-700 underline underline-offset-4"
            >
              Open Burnout
            </Link>
          </Notice>
        )}
      </div>

      <div className="mt-10 grid gap-x-12 gap-y-12 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="next-heading" className="min-w-0">
          <SectionHeading
            id="next-heading"
            title="Your next moves"
            note={data.actions.length > 0 ? 'Each says why, what, and by when' : undefined}
          />

          {data.actions.length === 0 ? (
            <EmptyState
              title="Nothing needs you right now"
              description="No deadlines close soon and nobody is waiting on you. A good moment to push a project forward or learn something new."
              action={
                <Link
                  to="/student/projects"
                  className="kicker text-brand-700 underline underline-offset-4"
                >
                  Open your projects
                </Link>
              }
            />
          ) : (
            <ol className="border-t border-ink-300">
              {data.actions.map((action) => (
                <ActionRow
                  key={action.key}
                  action={action}
                  busy={dismiss.pending}
                  onDismiss={() => void dismiss.run(action)}
                />
              ))}
            </ol>
          )}

          <Upcoming items={data.upcoming} />
        </section>

        <aside className="min-w-0 space-y-10">
          <Wellbeing data={data} />
          <Connections data={data} />
          <Wins data={data} />
          <Portfolio data={data} />
        </aside>
      </div>

      <p className="mt-14 border-t border-ink-200 pt-5 text-sm text-ink-500">
        {stats.momentum.visible
          ? 'Momentum counts what you ship, prove and show up to — never marks or attendance.'
          : 'You are hidden from the leaderboard, so only you see your momentum. Change that in Settings.'}
      </p>
    </>
  );
}

function Hero({ data }: { data: Today }) {
  const { stats } = data;

  return (
    <section className="drafting relative overflow-hidden border border-ink-900 bg-ink-950">
      <div className="grid gap-8 px-6 py-8 sm:px-9 sm:py-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="min-w-0">
          <p className="kicker text-ink-400">{formatDay(todayISO())}</p>
          <h1 className="mt-3 font-serif text-4xl text-ink-50 sm:text-5xl">
            {greeting()}, {data.student.firstName}.
          </h1>
          {data.goal ? (
            <p className="mt-4 max-w-xl text-ink-300">
              Working towards <span className="text-ink-50">{data.goal.name}</span>
              {stats.skills.trackTotal > 0 && (
                <>
                  {' '}
                  — {stats.skills.trackProven} of {stats.skills.trackTotal} skills on the path
                  proven.
                </>
              )}{' '}
              <Link
                to="/student/skills"
                className="kicker ml-1 text-brand-300 hover:text-brand-200"
              >
                Skill map →
              </Link>
            </p>
          ) : (
            <p className="mt-4 text-ink-300">
              No goal chosen yet.{' '}
              <Link
                to="/student/settings#goal"
                className="text-brand-300 underline underline-offset-4"
              >
                Pick one
              </Link>{' '}
              and the dashboard starts pointing somewhere.
            </p>
          )}
        </div>

        <Link to="/student/leaderboard" className="group block md:text-right">
          <p className="kicker text-ink-400">Momentum this month</p>
          <p className="mt-2 font-serif text-6xl leading-none text-ink-50">
            {stats.momentum.month}
          </p>
          <p className="mt-2 text-sm text-ink-300 group-hover:text-ink-100">
            {stats.momentum.visible
              ? stats.momentum.rank
                ? `#${stats.momentum.rank} of ${stats.momentum.ranked} on the board`
                : 'Not on the board yet this month'
              : 'Hidden from the board — only you see this'}
          </p>
        </Link>
      </div>

      <dl className="grid grid-cols-2 gap-y-6 border-t border-ink-800 px-6 py-6 sm:px-9 lg:grid-cols-4">
        <PlateFact label="Projects" to="/student/projects">
          {stats.projects.building} building · {stats.projects.shipped} shipped
        </PlateFact>
        <PlateFact label="Skills" to="/student/skills">
          {stats.skills.proven} proven of {stats.skills.listed} listed
        </PlateFact>
        <PlateFact label="Applications" to="/student/jobs">
          {stats.tracking.applications} in play
        </PlateFact>
        <PlateFact label="Events" to="/student/events">
          {stats.tracking.events} coming up
        </PlateFact>
      </dl>
    </section>
  );
}

function PlateFact({ label, to, children }: { label: string; to: string; children: ReactNode }) {
  return (
    <Link to={to} className="group block">
      <dt className="kicker text-ink-500 group-hover:text-ink-400">{label}</dt>
      <dd className="mt-1.5 text-sm text-ink-200 group-hover:text-ink-50">{children}</dd>
    </Link>
  );
}

function ActionRow({
  action,
  onDismiss,
  busy,
}: {
  action: TodayAction;
  onDismiss: () => void;
  busy: boolean;
}) {
  return (
    <li className="group relative flex gap-4 border-b border-ink-200 py-5">
      {action.urgent && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 -left-4 w-0.5 bg-accent-500 sm:-left-5"
        />
      )}
      <span
        className={cn(
          'mt-0.5 flex size-9 shrink-0 items-center justify-center border',
          action.urgent
            ? 'border-accent-400 bg-accent-400/10 text-accent-700'
            : 'border-ink-300 bg-white text-ink-500',
        )}
      >
        <Icon name={KIND_ICON[action.kind]} className="size-[1.1rem]" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h3 className="font-serif text-lg leading-snug text-ink-900">{action.title}</h3>
          {action.due && (
            <Badge tone={action.urgent ? 'accent' : 'muted'} title={formatDate(action.due, true)}>
              {dueLabel(action.due)}
            </Badge>
          )}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-ink-600">{action.why}</p>

        <div className="mt-3 flex flex-wrap items-center gap-4">
          <Link
            to={action.action.to}
            className="kicker inline-flex items-center gap-2 border border-ink-900 bg-ink-900 px-3 py-2 text-ink-50 transition hover:bg-ink-700"
          >
            {action.action.label}
            <Icon name="arrowRight" className="size-3.5" />
          </Link>
          <button
            type="button"
            onClick={onDismiss}
            disabled={busy}
            className="kicker text-ink-500 transition hover:text-ink-900 disabled:opacity-50"
          >
            Not now
          </button>
        </div>
      </div>
    </li>
  );
}

function Upcoming({ items }: { items: Commitment[] }) {
  return (
    <section aria-labelledby="upcoming-heading" className="mt-14">
      <SectionHeading id="upcoming-heading" title="Coming up" note="The next two weeks" />
      {items.length === 0 ? (
        <p className="text-sm text-ink-500">
          Nothing dated in the next fortnight. Save an event or a job and its dates show up here.
        </p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={`${item.kind}-${item.link}-${item.date}-${item.title}`}>
              <Link
                to={item.link}
                className="group flex items-center gap-4 border-b border-ink-200 py-3 transition hover:bg-white"
              >
                <span className="w-24 shrink-0 font-mono text-xs text-ink-500">
                  {formatDay(item.date)}
                </span>
                <Icon name={COMMITMENT_ICON[item.kind]} className="size-4 text-ink-400" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink-900 group-hover:text-brand-700">
                    {item.title}
                  </span>
                  <span className="block truncate text-xs text-ink-500">{item.detail}</span>
                </span>
                <span className="hidden text-xs text-ink-500 sm:block">
                  {relativeDays(item.daysUntil)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Wellbeing({ data }: { data: Today }) {
  const level = data.wellbeing.level;

  return (
    <section aria-labelledby="wellbeing-heading">
      <SectionHeading id="wellbeing-heading" title="How you’re doing" />
      <div
        className={cn(
          'border px-5 py-5',
          level === 'at-risk' ? 'border-accent-400 bg-accent-400/10' : 'border-ink-300 bg-white',
        )}
      >
        <p className="kicker text-ink-500">Burnout check · private</p>
        <p className="mt-2 font-serif text-2xl text-ink-900">
          {level ? BURNOUT_LABEL[level].label : 'Not enough check-ins yet'}
        </p>
        <p className="mt-1.5 text-sm text-ink-600">
          {level
            ? BURNOUT_LABEL[level].summary
            : 'Two weekly check-ins and OAA can tell you how your load looks. Until then it won’t guess.'}
        </p>
        <Link
          to="/student/burnout"
          className="kicker mt-4 inline-flex items-center gap-2 text-brand-700 transition hover:text-brand-600"
        >
          {data.wellbeing.checkedInThisWeek ? 'See the detail' : 'Check in for this week'}
          <Icon name="arrowRight" className="size-3.5" />
        </Link>
      </div>
    </section>
  );
}

function Connections({ data }: { data: Today }) {
  const connected = data.connections.filter((row) => row.connected).length;

  return (
    <section aria-labelledby="apps-heading">
      <SectionHeading
        id="apps-heading"
        title="Connected apps"
        action={
          <Link to="/student/connections" className="kicker text-brand-700 hover:text-brand-600">
            Manage
          </Link>
        }
      />
      <ul className="grid grid-cols-4 gap-2">
        {data.connections.map((row) => (
          <li key={row.id}>
            <Link
              to="/student/connections"
              title={`${row.name} — ${row.connected ? 'connected' : 'not connected'}`}
              className="flex flex-col items-center gap-1.5"
            >
              <ProviderMark provider={row.id} connected={row.connected} className="size-12" />
              <span className="kicker max-w-full truncate text-[9px] text-ink-500">{row.name}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-ink-500">
        {connected === 0
          ? 'None linked yet. GitHub can import your repositories as projects.'
          : `${connected} linked. You choose which ones appear on your portfolio.`}
      </p>
    </section>
  );
}

function Wins({ data }: { data: Today }) {
  if (data.recentWins.length === 0) return null;

  return (
    <section aria-labelledby="wins-heading">
      <SectionHeading id="wins-heading" title="Recent momentum" />
      <ul>
        {data.recentWins.map((win) => (
          <li
            key={`${win.source}-${win.label}-${win.at}`}
            className="flex items-baseline justify-between gap-4 border-b border-ink-200 py-2.5 text-sm"
          >
            <span className="min-w-0 text-ink-800">{win.label}</span>
            <span className="shrink-0 font-mono text-xs text-brand-700">+{win.points}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Portfolio({ data }: { data: Today }) {
  return (
    <section aria-labelledby="portfolio-heading">
      <SectionHeading id="portfolio-heading" title="Your portfolio" />
      {data.portfolio.public ? (
        <p className="text-sm text-ink-600">
          Live at{' '}
          <Link
            to={`/p/${data.portfolio.handle}`}
            className="font-mono text-brand-700 underline underline-offset-4"
          >
            /p/{data.portfolio.handle}
          </Link>
          . It shows only public projects and skills your work proves.
        </p>
      ) : (
        <p className="text-sm text-ink-600">
          Off. When you’re ready, switch it on in{' '}
          <Link
            to="/student/settings#privacy"
            className="text-brand-700 underline underline-offset-4"
          >
            Settings
          </Link>{' '}
          — only what you mark public ever appears.
        </p>
      )}
    </section>
  );
}
