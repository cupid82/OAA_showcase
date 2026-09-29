import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { SectionHeading } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Select, TextArea } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { api } from '@/lib/api';
import { AXIS_TEXT, GRID, PLANE, STRESS, YOU } from '@/lib/chartTokens';
import { cn } from '@/lib/cn';
import { formatDate, formatDay, minutesLabel, relativeDays } from '@/lib/format';
import { BURNOUT_LABEL } from '@/lib/labels';
import { useAction } from '@/lib/useAction';
import { useApi } from '@/lib/useApi';
import type { CheckinView, Commitment, Wellbeing } from '@/types';

type Answers = Omit<CheckinView, 'week'>;

const DEFAULT_ANSWERS: Answers = {
  energy: 3,
  stress: 3,
  sleepHours: 7,
  workload: 3,
  enjoyment: 3,
  note: '',
};

const QUESTIONS: {
  key: 'energy' | 'stress' | 'workload' | 'enjoyment';
  question: string;
  low: string;
  high: string;
}[] = [
  {
    key: 'energy',
    question: 'How much energy have you had this week?',
    low: 'Drained',
    high: 'Full of it',
  },
  { key: 'stress', question: 'How stressed have you felt?', low: 'Calm', high: 'Overwhelmed' },
  {
    key: 'workload',
    question: 'How manageable is your workload?',
    low: 'Light',
    high: 'Unmanageable',
  },
  {
    key: 'enjoyment',
    question: 'How much are you enjoying what you’re working on?',
    low: 'Dreading it',
    high: 'Enjoying it',
  },
];

const SLEEP_OPTIONS = Array.from({ length: 15 }, (_, index) => 3 + index * 0.5);

const COMMITMENT_ICON: Record<Commitment['kind'], IconName> = {
  event: 'ticket',
  register: 'clock',
  deadline: 'briefcase',
  milestone: 'flag',
};

/**
 * The burnout check. Private by construction: only this student's requests
 * reach it, and the reading is never shown to anyone else or ranked.
 */
export default function BurnoutPage() {
  const { data, error, loading, reload, setData } = useApi<Wellbeing>('/api/wellbeing');
  const [notice, setNotice] = useState<string | null>(null);

  const write = useAction(async (request: () => Promise<{ data: Wellbeing }>, message: string) => {
    const { data: next } = await request();
    setData(next);
    setNotice(message);
    return true as const;
  });

  if (loading && !data) return <Loading variant="page" label="Reading your weeks…" />;
  if (error && !data) return <ErrorMessage message={error} onRetry={reload} />;
  if (!data) return null;

  const { reading } = data;
  const snoozed = data.snoozeUntil !== null;

  return (
    <>
      <PageHeader
        eyebrow="Burnout"
        title="How you’re really doing"
        description="A two-minute weekly check-in, read against what’s coming up. Private: nobody else sees your answers — not your college, not the leaderboard. It’s an early warning, not a diagnosis."
      />

      <div className="mb-8 space-y-3">
        {notice && (
          <Notice tone="success" onDismiss={() => setNotice(null)}>
            {notice}
          </Notice>
        )}
        {write.error && <ErrorMessage message={write.error} />}
      </div>

      <div className="grid gap-x-12 gap-y-12 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="min-w-0 space-y-12">
          <Reading data={data} />

          {reading.factors.length > 0 && (
            <section aria-labelledby="factors-heading">
              <SectionHeading
                id="factors-heading"
                title="What’s behind it"
                note="And one thing to try for each"
              />
              <ul className="space-y-4">
                {reading.factors.map((factor) => (
                  <li
                    key={factor.key}
                    className="border-l-2 border-accent-500 bg-white py-3 pr-4 pl-4"
                  >
                    <p className="text-ink-900">{factor.detail}</p>
                    <p className="mt-1.5 text-sm text-ink-600">{factor.advice}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Trend history={data.history} />

          <Commitments items={data.commitments} capacity={data.capacity} />
        </div>

        <aside className="min-w-0 space-y-10">
          <CheckinForm data={data} run={write.run} pending={write.pending} />

          <section aria-labelledby="snooze-heading">
            <SectionHeading id="snooze-heading" title="Quiet mode" />
            <p className="text-sm text-ink-600">
              {snoozed
                ? `Non-urgent nudges are held back until ${formatDate(data.snoozeUntil ?? '', true)}. Deadlines and people waiting on you still come through.`
                : 'Hold back non-urgent nudges for a while. Deadlines and people waiting on you still come through.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[3, 7, 14].map((days) => (
                <Button
                  key={days}
                  size="sm"
                  variant="secondary"
                  disabled={write.pending}
                  onClick={() =>
                    void write.run(
                      () => api.put('/api/wellbeing/snooze', { days }),
                      `Quiet for ${days} days. Only what’s urgent will reach you.`,
                    )
                  }
                >
                  {days} days
                </Button>
              ))}
              {snoozed && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={write.pending}
                  onClick={() =>
                    void write.run(
                      () => api.put('/api/wellbeing/snooze', { days: 0 }),
                      'Nudges are back on.',
                    )
                  }
                >
                  Turn it off
                </Button>
              )}
            </div>
          </section>

          <section aria-labelledby="support-heading">
            <SectionHeading id="support-heading" title="Talk to someone" />
            <p className="text-sm text-ink-600">
              If things feel like more than a busy patch, a person helps more than a page. Both of
              these are free and confidential.
            </p>
            <ul className="mt-4 space-y-3">
              {data.support.map((contact) => (
                <li key={contact.name} className="border border-ink-300 bg-white px-4 py-4">
                  <p className="font-serif text-lg text-ink-900">{contact.name}</p>
                  <p className="mt-1 text-sm text-ink-600">{contact.detail}</p>
                  <p className="mt-2 font-mono text-sm text-ink-900">{contact.contact}</p>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="privacy-heading">
            <SectionHeading id="privacy-heading" title="Your data" />
            <p className="text-sm text-ink-600">
              {data.totalCheckins === 0
                ? 'No check-ins stored.'
                : `${data.totalCheckins} check-in${data.totalCheckins === 1 ? '' : 's'} stored, visible only to you. Moderators see a count across the whole college — and only once enough students check in that nobody can be picked out.`}
            </p>
            {data.totalCheckins > 0 && (
              <ConfirmButton
                className="mt-4"
                confirmLabel="Delete all — sure?"
                onConfirm={() =>
                  void write.run(
                    () => api.delete('/api/wellbeing/checkins'),
                    'All your check-ins are deleted.',
                  )
                }
              >
                <Icon name="trash" className="size-4" />
                Delete all my check-ins
              </ConfirmButton>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}

function Reading({ data }: { data: Wellbeing }) {
  const { reading } = data;

  if (reading.level === null) {
    return (
      <section className="lattice-ink border border-ink-300 px-6 py-8">
        <p className="kicker text-ink-500">This week’s reading</p>
        <p className="mt-3 font-serif text-3xl text-ink-900">Not enough check-ins yet</p>
        <p className="prose-measure mt-2 text-ink-600">
          {reading.basedOn === 0
            ? 'Check in this week and next, and OAA can read how your load looks. It won’t guess before then — no data is not the same as fine.'
            : 'One more check-in in the next few weeks and OAA can read how your load looks. It won’t guess before then.'}
        </p>
      </section>
    );
  }

  const score = reading.score ?? 0;
  const hot = reading.level === 'at-risk';

  return (
    <section
      aria-labelledby="reading-heading"
      className={cn(
        'border px-6 py-7',
        hot ? 'border-accent-500 bg-accent-400/10' : 'border-ink-300 bg-white',
      )}
    >
      <p className="kicker text-ink-500">This week’s reading</p>
      <h2 id="reading-heading" className="mt-3 font-serif text-4xl text-ink-900">
        {BURNOUT_LABEL[reading.level].label}
      </h2>
      <p className="prose-measure mt-2 text-ink-700">{BURNOUT_LABEL[reading.level].summary}</p>

      {/* Three zones and a marker — where the load sits, without pretending to precision. */}
      <div className="mt-6" aria-hidden="true">
        <div className="relative grid h-2 grid-cols-[35fr_25fr_40fr] gap-0.5">
          <span className="bg-brand-200" />
          <span className="bg-accent-400/50" />
          <span className="bg-accent-500/70" />
          <span
            className="absolute -top-1.5 h-5 w-1 -translate-x-1/2 bg-ink-900 ring-2 ring-white"
            style={{ left: `${Math.min(99, Math.max(1, score))}%` }}
          />
        </div>
        <div className="mt-2 grid grid-cols-[35fr_25fr_40fr] text-[11px] text-ink-500">
          <span>Steady</span>
          <span>Stretched</span>
          <span>Running hot</span>
        </div>
      </div>

      <p className="mt-5 text-xs text-ink-500">
        Based on {reading.basedOn} check-in{reading.basedOn === 1 ? '' : 's'} from the last four
        weeks and {data.commitments.length} thing{data.commitments.length === 1 ? '' : 's'} dated in
        the next two.
      </p>
    </section>
  );
}

function Scale({
  value,
  onChange,
  low,
  high,
  name,
}: {
  value: number;
  onChange: (value: number) => void;
  low: string;
  high: string;
  name: string;
}) {
  return (
    <div>
      <div className="grid grid-cols-5 gap-1" role="radiogroup" aria-label={name}>
        {[1, 2, 3, 4, 5].map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={value === option}
            onClick={() => onChange(option)}
            className={cn(
              'border py-2 text-sm transition',
              value === option
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-ink-300 bg-white text-ink-600 hover:border-ink-500',
            )}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-ink-500">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}

function CheckinForm({
  data,
  run,
  pending,
}: {
  data: Wellbeing;
  run: (request: () => Promise<{ data: Wellbeing }>, message: string) => Promise<true | undefined>;
  pending: boolean;
}) {
  const existing = data.thisWeek.checkin;
  const [editing, setEditing] = useState(existing === null);
  const [answers, setAnswers] = useState<Answers>(existing ?? DEFAULT_ANSWERS);

  useEffect(() => {
    setAnswers(existing ?? DEFAULT_ANSWERS);
    setEditing(existing === null);
  }, [existing]);

  const set = <K extends keyof Answers>(key: K, value: Answers[K]) =>
    setAnswers((current) => ({ ...current, [key]: value }));

  if (!editing && existing) {
    return (
      <section
        aria-labelledby="checkin-heading"
        className="border border-ink-300 bg-white px-5 py-5"
      >
        <p id="checkin-heading" className="kicker text-ink-500">
          Week of {formatDay(data.thisWeek.week)}
        </p>
        <p className="mt-2 flex items-center gap-2 font-serif text-2xl text-ink-900">
          <Icon name="check" className="size-5 text-brand-600" />
          Checked in
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <Answer label="Energy">{existing.energy}/5</Answer>
          <Answer label="Stress">{existing.stress}/5</Answer>
          <Answer label="Sleep">{existing.sleepHours} h</Answer>
          <Answer label="Workload">{existing.workload}/5</Answer>
          <Answer label="Enjoyment">{existing.enjoyment}/5</Answer>
        </dl>
        <Button size="sm" variant="secondary" className="mt-5" onClick={() => setEditing(true)}>
          Change my answers
        </Button>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="checkin-heading"
      className="border border-brand-300 bg-white px-5 py-5"
    >
      <h2 id="checkin-heading" className="font-serif text-2xl text-ink-900">
        This week’s check-in
      </h2>
      <p className="mt-1 text-sm text-ink-600">
        Five questions. Answer for the week as a whole, not today.
      </p>

      <form
        className="mt-6 space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          void run(
            () => api.post('/api/wellbeing/checkins', answers),
            'Checked in. Thanks for being honest with yourself.',
          );
        }}
      >
        {QUESTIONS.map((question) => (
          <fieldset key={question.key}>
            <legend className="mb-2 text-sm text-ink-900">{question.question}</legend>
            <Scale
              name={question.question}
              value={answers[question.key]}
              onChange={(value) => set(question.key, value)}
              low={question.low}
              high={question.high}
            />
          </fieldset>
        ))}

        <div>
          <label htmlFor="sleep" className="mb-2 block text-sm text-ink-900">
            Roughly how many hours of sleep a night?
          </label>
          <Select
            id="sleep"
            value={answers.sleepHours}
            onChange={(event) => set('sleepHours', Number(event.target.value))}
            className="max-w-40"
          >
            {SLEEP_OPTIONS.map((hours) => (
              <option key={hours} value={hours}>
                {hours} h{hours === 10 ? ' or more' : ''}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label htmlFor="checkin-note" className="mb-2 block text-sm text-ink-900">
            Anything on your mind? <span className="text-ink-500">(optional, only you see it)</span>
          </label>
          <TextArea
            id="checkin-note"
            value={answers.note}
            onChange={(event) => set('note', event.target.value)}
            rows={2}
            maxLength={500}
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : existing ? 'Update check-in' : 'Check in'}
          </Button>
          {existing && (
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}

function Answer({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between border-b border-ink-100 py-1">
      <dt className="text-ink-500">{label}</dt>
      <dd className="text-ink-900">{children}</dd>
    </div>
  );
}

function Trend({ history }: { history: CheckinView[] }) {
  if (history.length < 2) {
    return (
      <section aria-labelledby="trend-heading">
        <SectionHeading id="trend-heading" title="Your weeks" />
        <p className="text-sm text-ink-500">The trend appears once you have two check-ins.</p>
      </section>
    );
  }

  const chart = history.map((entry) => ({ ...entry, label: formatDay(entry.week).slice(4) }));

  return (
    <section aria-labelledby="trend-heading">
      <SectionHeading
        id="trend-heading"
        title="Your weeks"
        note={
          <span className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-0.5 w-4" style={{ backgroundColor: YOU }} />
              Energy
            </span>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="w-4 border-t-2 border-dashed"
                style={{ borderColor: STRESS }}
              />
              Stress
            </span>
          </span>
        }
      />
      <figure>
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart} margin={{ top: 8, right: 12, bottom: 0, left: -28 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: GRID }}
                tick={{ fill: AXIS_TEXT, fontSize: 12 }}
              />
              <YAxis
                domain={[1, 5]}
                ticks={[1, 2, 3, 4, 5]}
                tickLine={false}
                axisLine={false}
                tick={{ fill: AXIS_TEXT, fontSize: 12 }}
              />
              <Tooltip
                cursor={{ stroke: GRID, strokeWidth: 1 }}
                content={({ active, payload }) => {
                  const point = active
                    ? (payload?.[0]?.payload as (typeof chart)[number] | undefined)
                    : undefined;
                  if (!point) return null;
                  return (
                    <div className="border border-ink-300 bg-white px-3 py-2 text-sm shadow-card">
                      <p className="kicker text-ink-500">Week of {formatDate(point.week)}</p>
                      <p className="mt-1 text-ink-900">
                        Energy {point.energy} · Stress {point.stress}
                      </p>
                      <p className="text-ink-600">
                        Sleep {point.sleepHours} h · Workload {point.workload} · Enjoyment{' '}
                        {point.enjoyment}
                      </p>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="energy"
                stroke={YOU}
                strokeWidth={2}
                dot={{ r: 3.5, fill: YOU, stroke: PLANE, strokeWidth: 2 }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="stress"
                stroke={STRESS}
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={{ r: 3.5, fill: STRESS, stroke: PLANE, strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <figcaption className="mt-2 text-xs text-ink-500">
          Each point is one weekly check-in, 1 to 5. Stress is dashed so the two lines stay distinct
          without colour.
        </figcaption>
      </figure>
    </section>
  );
}

function Commitments({
  items,
  capacity,
}: {
  items: Commitment[];
  capacity: Wellbeing['capacity'];
}) {
  return (
    <section aria-labelledby="load-heading">
      <SectionHeading id="load-heading" title="What’s coming at you" note="The next two weeks" />

      <dl className="mb-6 grid gap-px border border-ink-300 bg-ink-300 sm:grid-cols-3">
        <div className="bg-white px-4 py-4">
          <dt className="kicker text-ink-500">Dated items</dt>
          <dd className="mt-1.5 font-serif text-3xl text-ink-900">{items.length}</dd>
        </div>
        <div className="bg-white px-4 py-4">
          <dt className="kicker text-ink-500">Practice this week</dt>
          <dd className="mt-1.5 font-serif text-3xl text-ink-900">
            {minutesLabel(capacity.practiceMinutesThisWeek)}
          </dd>
        </div>
        <div className="bg-white px-4 py-4">
          <dt className="kicker text-ink-500">Your weekly budget</dt>
          <dd className="mt-1.5 font-serif text-3xl text-ink-900">
            {capacity.weeklyHours === null ? '—' : `${capacity.weeklyHours} h`}
          </dd>
        </div>
      </dl>

      {items.length === 0 ? (
        <p className="text-sm text-ink-500">Nothing dated in the next fortnight.</p>
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
                  <span
                    className={cn(
                      'block truncate text-xs',
                      item.daysUntil < 0 ? 'text-accent-700' : 'text-ink-500',
                    )}
                  >
                    {item.detail}
                  </span>
                </span>
                <span className="hidden text-xs text-ink-500 sm:block">
                  {relativeDays(item.daysUntil)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {items.length >= 4 && (
        <p className="mt-4 text-sm text-ink-600">
          That’s a lot for two weeks. Pausing a project, or dropping one event, is a decision — not
          a failure.
        </p>
      )}
    </section>
  );
}
