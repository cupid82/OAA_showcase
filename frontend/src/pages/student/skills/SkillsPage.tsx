import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Badge } from '@/components/ui/Badge';
import type { BadgeTone } from '@/components/ui/Badge';
import { ExternalLink, SectionHeading, SkillChips } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Checkbox, Field, Select, TextInput } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkillPicker } from '@/components/ui/SkillPicker';
import { api } from '@/lib/api';
import { AXIS_TEXT, GRID, YOU } from '@/lib/chartTokens';
import { cn } from '@/lib/cn';
import { formatDate, formatDay, minutesLabel, plural, todayISO } from '@/lib/format';
import { LEVEL_LABEL, PROOF_HINT, PROOF_LABEL } from '@/lib/labels';
import { useAction } from '@/lib/useAction';
import { useApi } from '@/lib/useApi';
import { useCatalog } from '@/lib/useShared';
import type { MySkill, ProofStage, SkillLevel, SkillsOverview, TrackSkillView } from '@/types';

export const PROOF_TONE: Record<ProofStage, BadgeTone> = {
  proven: 'solid',
  practising: 'brand',
  claimed: 'muted',
};

const LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced'];

export default function SkillsPage() {
  const { data, error, loading, reload, setData } = useApi<SkillsOverview>('/api/skills');
  const [notice, setNotice] = useState<string | null>(null);

  const write = useAction(
    async (request: () => Promise<{ data: SkillsOverview }>, message?: string) => {
      const { data: next } = await request();
      setData(next);
      if (message) setNotice(message);
      return true as const;
    },
  );

  if (loading && !data) return <Loading variant="page" label="Drawing your skill map…" />;
  if (error && !data) return <ErrorMessage message={error} onRetry={reload} />;
  if (!data) return null;

  const add = (skillId: string, level: SkillLevel, name: string) =>
    void write.run(
      () => api.post('/api/skills', { skillId, level }),
      `${name} added to your skills.`,
    );

  return (
    <>
      <PageHeader
        eyebrow="Skills"
        title="Your skill map"
        description="What you say you can do, and what your work proves — kept side by side, never blended into one score."
      />

      <div className="mb-8 space-y-3">
        {notice && (
          <Notice tone="success" onDismiss={() => setNotice(null)}>
            {notice}
          </Notice>
        )}
        {write.error && <ErrorMessage message={write.error} />}
      </div>

      {data.track ? (
        <TrackMap track={data.track} />
      ) : (
        <Notice tone="info" title="No goal chosen">
          Pick a goal in{' '}
          <Link to="/student/settings#goal" className="text-brand-700 underline underline-offset-4">
            Settings
          </Link>{' '}
          and this page draws the path to it.
        </Notice>
      )}

      <Suggestions data={data} onAdd={add} pending={write.pending} />

      <div className="mt-14 grid gap-x-12 gap-y-14 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-14">
          <MySkills data={data} run={write.run} pending={write.pending} onAdd={add} />
          <Certificates data={data} run={write.run} pending={write.pending} />
        </div>
        <aside className="min-w-0">
          <Practice data={data} />
        </aside>
      </div>
    </>
  );
}

/** Resolves `true` on success, `undefined` if it failed (the page shows the error). */
type Run = (
  request: () => Promise<{ data: SkillsOverview }>,
  message?: string,
) => Promise<true | undefined>;

// --- Track map -----------------------------------------------------------------------

const TILE: Record<ProofStage | 'none', string> = {
  proven: 'border-brand-600 bg-brand-600 text-white',
  practising: 'border-brand-400 bg-brand-50 text-brand-900',
  claimed: 'border-ink-300 bg-white text-ink-800',
  none: 'border-dashed border-ink-300 bg-transparent text-ink-500',
};

function TrackMap({ track }: { track: NonNullable<SkillsOverview['track']> }) {
  return (
    <section aria-labelledby="track-heading" className="border border-ink-300 bg-white">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink-200 px-6 py-5">
        <div>
          <p className="kicker text-ink-500">Your goal</p>
          <h2 id="track-heading" className="mt-1.5 font-serif text-3xl text-ink-900">
            {track.name}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-600">{track.summary}</p>
        </div>
        <div className="text-right">
          <p className="font-serif text-4xl leading-none text-ink-900">
            {track.proven}
            <span className="text-2xl text-ink-400">/{track.total}</span>
          </p>
          <p className="kicker mt-1.5 text-ink-500">proven</p>
          <Link
            to="/student/settings#goal"
            className="kicker mt-3 inline-block text-brand-700 hover:text-brand-600"
          >
            Change goal
          </Link>
        </div>
      </div>

      <div className="grid gap-px bg-ink-200 md:grid-cols-3">
        {track.stages.map((stage) => (
          <div key={stage.stage} className="bg-white px-5 py-5">
            <p className="kicker text-ink-500">{stage.label}</p>
            <ul className="mt-3 space-y-2">
              {stage.skills.map((skill) => (
                <li key={skill.id}>
                  <TrackTile skill={skill} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-ink-200 px-6 py-3 text-xs text-ink-500">
        {(['proven', 'practising', 'claimed', 'none'] as const).map((key) => (
          <span key={key} className="flex items-center gap-2">
            <span aria-hidden="true" className={cn('size-3 border', TILE[key])} />
            {key === 'none' ? 'Not on your list' : PROOF_LABEL[key]}
          </span>
        ))}
      </div>
    </section>
  );
}

function TrackTile({ skill }: { skill: TrackSkillView }) {
  const state = skill.proof ?? 'none';
  return (
    <Link
      to={`/student/skills/${skill.id}`}
      title={skill.why}
      className={cn(
        'flex items-center justify-between gap-3 border px-3 py-2 text-sm transition hover:opacity-90',
        TILE[state],
      )}
    >
      <span>{skill.name}</span>
      {skill.proof === 'proven' && <Icon name="check" className="size-4" />}
    </Link>
  );
}

// --- Suggestions ---------------------------------------------------------------------------

function Suggestions({
  data,
  onAdd,
  pending,
}: {
  data: SkillsOverview;
  onAdd: (skillId: string, level: SkillLevel, name: string) => void;
  pending: boolean;
}) {
  const { usedNotListed, nextForGoal } = data.suggestions;
  if (usedNotListed.length === 0 && nextForGoal.length === 0) return null;

  return (
    <section aria-label="Suggestions" className="mt-8 grid gap-4 lg:grid-cols-2">
      {usedNotListed.length > 0 && (
        <div className="border border-ink-300 bg-white px-5 py-5">
          <p className="kicker text-ink-500">In your work, not on your list</p>
          <p className="mt-1.5 text-sm text-ink-600">
            Your projects, certificates or reflections use these. Add them and the evidence counts.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {usedNotListed.map((skill) => (
              <li key={skill.id}>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => onAdd(skill.id, 'beginner', skill.name)}
                >
                  <Icon name="plus" className="size-3.5" />
                  {skill.name}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {nextForGoal.length > 0 && (
        <div className="border border-ink-300 bg-white px-5 py-5">
          <p className="kicker text-ink-500">Next for your goal</p>
          <ul className="mt-3">
            {nextForGoal.map((skill) => (
              <li
                key={skill.id}
                className="flex items-start justify-between gap-4 border-b border-ink-200 py-2.5 last:border-b-0"
              >
                <div className="min-w-0">
                  <Link
                    to={`/student/skills/${skill.id}`}
                    className="text-sm text-ink-900 hover:text-brand-700"
                  >
                    {skill.name}
                  </Link>
                  <p className="text-xs text-ink-500">{skill.why}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => onAdd(skill.id, 'beginner', skill.name)}
                >
                  Start
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// --- My skills -------------------------------------------------------------------------------

function evidenceLine(skill: MySkill): string {
  const { proof } = skill;
  const parts: string[] = [];
  if (proof.shippedProjects.length)
    parts.push(`shipped in ${proof.shippedProjects.map((p) => p.title).join(', ')}`);
  if (proof.certificates.length) parts.push(plural(proof.certificates.length, 'certificate'));
  if (proof.activeProjects.length)
    parts.push(`used in ${proof.activeProjects.map((p) => p.title).join(', ')}`);
  if (proof.events.length) parts.push(`used at ${plural(proof.events.length, 'event')}`);
  if (proof.practiceMinutes30d > 0)
    parts.push(`${minutesLabel(proof.practiceMinutes30d)} practice this month`);
  return parts.length ? parts.join(' · ') : 'Nothing behind it yet';
}

function MySkills({
  data,
  run,
  pending,
  onAdd,
}: {
  data: SkillsOverview;
  run: Run;
  pending: boolean;
  onAdd: (skillId: string, level: SkillLevel, name: string) => void;
}) {
  const { skillName } = useCatalog();
  const [adding, setAdding] = useState<string[]>([]);
  const [level, setLevel] = useState<SkillLevel>('beginner');
  const listed = useMemo(() => data.skills.map((skill) => skill.id), [data.skills]);

  return (
    <section aria-labelledby="mine-heading">
      <SectionHeading
        id="mine-heading"
        title="Your skills"
        note={`${data.counts.proven} proven · ${data.counts.practising} practising · ${data.counts.claimed} claimed`}
      />

      {data.skills.length === 0 ? (
        <EmptyState
          title="No skills listed yet"
          description="Add what you can already do below — beginner counts."
        />
      ) : (
        <ul className="border-t border-ink-200">
          {data.skills.map((skill) => (
            <li
              key={skill.id}
              className="grid gap-3 border-b border-ink-200 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Link
                    to={`/student/skills/${skill.id}`}
                    className="font-serif text-lg text-ink-900 hover:text-brand-700"
                  >
                    {skill.name}
                  </Link>
                  <Badge tone={PROOF_TONE[skill.proof.stage]} title={PROOF_HINT[skill.proof.stage]}>
                    {PROOF_LABEL[skill.proof.stage]}
                  </Badge>
                  {skill.inTrack && <Badge tone="muted">On your path</Badge>}
                </div>
                <p className="mt-1 text-xs text-ink-500">{evidenceLine(skill)}</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="sr-only" htmlFor={`level-${skill.id}`}>
                  Your level in {skill.name}
                </label>
                <Select
                  id={`level-${skill.id}`}
                  value={skill.level}
                  disabled={pending}
                  onChange={(event) =>
                    void run(() =>
                      api.patch(`/api/skills/${skill.id}`, { level: event.target.value }),
                    )
                  }
                  className="w-36 py-1.5 text-sm"
                >
                  {LEVELS.map((option) => (
                    <option key={option} value={option}>
                      {LEVEL_LABEL[option]}
                    </option>
                  ))}
                </Select>
                <Link
                  to={`/student/skills/${skill.id}#practice`}
                  className="kicker whitespace-nowrap text-brand-700 hover:text-brand-600"
                >
                  Log practice
                </Link>
                <ConfirmButton
                  size="sm"
                  confirmLabel="Remove?"
                  onConfirm={() =>
                    void run(
                      () => api.delete(`/api/skills/${skill.id}`),
                      `${skill.name} removed from your list.`,
                    )
                  }
                >
                  <Icon name="close" className="size-3.5" />
                  <span className="sr-only">Remove {skill.name}</span>
                </ConfirmButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form
        className="mt-6 grid gap-4 border border-ink-300 bg-white px-5 py-5 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          const [first] = adding;
          if (!first) return;
          onAdd(first, level, skillName(first));
          setAdding([]);
        }}
      >
        <Field id="add-skill" label="Add a skill">
          <SkillPicker
            id="add-skill"
            value={adding}
            onChange={setAdding}
            max={1}
            exclude={listed}
          />
        </Field>
        <Field id="add-level" label="Your level">
          <Select
            id="add-level"
            value={level}
            onChange={(event) => setLevel(event.target.value as SkillLevel)}
          >
            {LEVELS.map((option) => (
              <option key={option} value={option}>
                {LEVEL_LABEL[option]}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" size="sm" disabled={pending || adding.length === 0}>
          Add
        </Button>
      </form>
    </section>
  );
}

// --- Certificates ------------------------------------------------------------------------------

function Certificates({
  data,
  run,
  pending,
}: {
  data: SkillsOverview;
  run: Run;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [issuer, setIssuer] = useState('');
  const [issuedOn, setIssuedOn] = useState(todayISO());
  const [url, setUrl] = useState('');
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [show, setShow] = useState(true);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const saved = await run(
      () =>
        api.post('/api/skills/certificates', {
          title,
          issuer,
          issuedOn,
          url: url || null,
          skillIds,
          showOnPortfolio: show,
        }),
      'Certificate added. The skills it covers count as proven.',
    );
    if (!saved) return;
    setOpen(false);
    setTitle('');
    setIssuer('');
    setUrl('');
    setSkillIds([]);
  }

  return (
    <section aria-labelledby="certs-heading">
      <SectionHeading
        id="certs-heading"
        title="Certificates & courses"
        action={
          !open && (
            <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
              <Icon name="plus" className="size-3.5" />
              Add
            </Button>
          )
        }
      />

      {data.certificates.length === 0 && !open && (
        <p className="text-sm text-ink-500">
          None yet. A finished course with a certificate proves the skills it covers.
        </p>
      )}

      {data.certificates.length > 0 && (
        <ul className="border-t border-ink-200">
          {data.certificates.map((certificate) => (
            <li
              key={certificate.id}
              className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-200 py-4"
            >
              <div className="min-w-0">
                <p className="text-ink-900">
                  {certificate.url ? (
                    <ExternalLink href={certificate.url}>{certificate.title}</ExternalLink>
                  ) : (
                    certificate.title
                  )}
                </p>
                <p className="text-xs text-ink-500">
                  {certificate.issuer} · {formatDate(certificate.issuedOn, true)}
                  {!certificate.showOnPortfolio && ' · hidden from portfolio'}
                </p>
                <SkillChips skills={certificate.skills} className="mt-2" />
              </div>
              <ConfirmButton
                size="sm"
                confirmLabel="Remove?"
                onConfirm={() =>
                  void run(
                    () => api.delete(`/api/skills/certificates/${certificate.id}`),
                    'Certificate removed.',
                  )
                }
              >
                Remove
              </ConfirmButton>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <form onSubmit={submit} className="mt-4 space-y-6 border border-ink-300 bg-white px-5 py-5">
          <div className="grid gap-6 sm:grid-cols-2">
            <Field id="cert-title" label="Title">
              <TextInput
                id="cert-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                minLength={2}
                placeholder="Responsive Web Design"
              />
            </Field>
            <Field id="cert-issuer" label="Issued by">
              <TextInput
                id="cert-issuer"
                value={issuer}
                onChange={(event) => setIssuer(event.target.value)}
                required
                minLength={2}
                placeholder="freeCodeCamp, NPTEL, Coursera…"
              />
            </Field>
            <Field id="cert-date" label="Issued on">
              <TextInput
                id="cert-date"
                type="date"
                max={todayISO()}
                value={issuedOn}
                onChange={(event) => setIssuedOn(event.target.value)}
                required
              />
            </Field>
            <Field id="cert-url" label="Link (optional)">
              <TextInput
                id="cert-url"
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://…"
              />
            </Field>
          </div>
          <Field id="cert-skills" label="Skills it covers">
            <SkillPicker id="cert-skills" value={skillIds} onChange={setSkillIds} />
          </Field>
          <Checkbox
            id="cert-show"
            checked={show}
            onChange={setShow}
            label="Show on my public portfolio"
            description="Only matters if your portfolio is switched on."
          />
          <div className="flex gap-3">
            <Button type="submit" size="sm" disabled={pending}>
              Save certificate
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

// --- Practice ------------------------------------------------------------------------------------

function Practice({ data }: { data: SkillsOverview }) {
  const { practice } = data;
  const chart = practice.weeks.map((week) => ({ ...week, label: formatDay(week.week).slice(4) }));

  return (
    <section aria-labelledby="practice-heading">
      <SectionHeading id="practice-heading" title="Practice" />
      <p className="font-serif text-4xl leading-none text-ink-900">
        {minutesLabel(practice.thisWeekMinutes)}
      </p>
      <p className="mt-1.5 text-sm text-ink-600">
        logged this week
        {practice.weeklyTarget !== null &&
          ` — you set aside ${practice.weeklyTarget / 60} h a week for projects and learning`}
      </p>

      <figure className="mt-6">
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: GRID }}
                tick={{ fill: AXIS_TEXT, fontSize: 11 }}
                interval={1}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: AXIS_TEXT, fontSize: 11 }}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: 'rgb(122 129 201 / 0.08)' }}
                content={({ active, payload }) => {
                  const point = active
                    ? (payload?.[0]?.payload as (typeof chart)[number] | undefined)
                    : undefined;
                  if (!point) return null;
                  return (
                    <div className="border border-ink-300 bg-white px-3 py-2 text-sm shadow-card">
                      <p className="kicker text-ink-500">Week of {formatDate(point.week)}</p>
                      <p className="mt-1 text-ink-900">{minutesLabel(point.minutes)}</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="minutes" fill={YOU} radius={[2, 2, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <figcaption className="mt-2 text-xs text-ink-500">
          Minutes per week, last eight weeks. Points stop at a weekly cap — a steady week beats an
          all-nighter.
        </figcaption>
      </figure>

      <h3 className="kicker mt-8 text-ink-500">Recent</h3>
      {practice.recent.length === 0 ? (
        <p className="mt-2 text-sm text-ink-500">
          Nothing logged yet. Open a skill to log time on it.
        </p>
      ) : (
        <ul className="mt-2">
          {practice.recent.map((entry) => (
            <li
              key={entry.id}
              className="flex items-baseline justify-between gap-3 border-b border-ink-200 py-2 text-sm"
            >
              <Link
                to={`/student/skills/${entry.skill.id}`}
                className="min-w-0 truncate text-ink-800 hover:text-brand-700"
              >
                {entry.skill.name}
                {entry.note && <span className="text-ink-500"> — {entry.note}</span>}
              </Link>
              <span className="shrink-0 font-mono text-xs text-ink-500">
                {formatDay(entry.date)} · {minutesLabel(entry.minutes)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
