import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { ExternalLink, SectionHeading } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Field, Select, TextInput } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { Chip } from '@/components/ui/Tabs';
import { api } from '@/lib/api';
import {
  addDaysISO,
  daysUntil,
  formatDate,
  formatDay,
  minutesLabel,
  relativeDays,
  todayISO,
} from '@/lib/format';
import { DIFFICULTY_LABEL, LEVEL_LABEL, PROOF_HINT, PROOF_LABEL } from '@/lib/labels';
import { useAction } from '@/lib/useAction';
import { useApi } from '@/lib/useApi';
import type { EvidenceRef, SkillDetail, SkillLevel } from '@/types';

import { PROOF_TONE } from './SkillsPage';

const LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced'];
const QUICK_MINUTES = [15, 30, 45, 60, 90, 120];

export default function SkillDetailPage() {
  const { skillId = '' } = useParams();
  const { data, error, loading, reload, setData } = useApi<SkillDetail>(`/api/skills/${skillId}`);
  const [notice, setNotice] = useState<string | null>(null);

  const [minutes, setMinutes] = useState(45);
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [level, setLevel] = useState<SkillLevel>('beginner');

  const log = useAction(async () => {
    const { data: next } = await api.post<{ data: SkillDetail }>(
      `/api/skills/${skillId}/practice`,
      { minutes, date, note },
    );
    setData(next);
    setNote('');
    setNotice(`Logged ${minutesLabel(minutes)} of ${next.skill.name}.`);
  });

  const listIt = useAction(async () => {
    await api.post('/api/skills', { skillId, level });
    reload();
    setNotice('Added to your skills.');
  });

  const changeLevel = useAction(async (next: SkillLevel) => {
    await api.patch(`/api/skills/${skillId}`, { level: next });
    reload();
  });

  const removeLog = useAction(async (logId: string) => {
    await api.delete(`/api/skills/practice/${logId}`);
    reload();
  });

  if (loading && !data) return <Loading variant="page" />;
  if (error && !data)
    return <ErrorMessage title="Skill unavailable" message={error} onRetry={reload} />;
  if (!data) return null;

  const { skill, proof } = data;
  const anyEvidence =
    proof.shippedProjects.length +
      proof.activeProjects.length +
      proof.certificates.length +
      proof.events.length >
    0;
  const failure = log.error ?? listIt.error ?? changeLevel.error ?? removeLog.error;

  return (
    <>
      <Link
        to="/student/skills"
        className="kicker inline-flex items-center gap-2 text-ink-500 hover:text-ink-900"
      >
        <Icon name="arrowLeft" className="size-4" />
        Skills
      </Link>

      <header className="mt-5 border-b border-ink-200 pb-7">
        <p className="kicker text-brand-700">{skill.category}</p>
        <h1 className="mt-2.5 font-serif text-4xl text-ink-900">{skill.name}</h1>
        <p className="prose-measure mt-2.5 text-ink-600">{skill.description}</p>
        {skill.resourceUrl && (
          <p className="mt-4 text-sm">
            <span className="kicker mr-2 text-ink-500">Start here</span>
            <ExternalLink href={skill.resourceUrl}>
              {skill.resourceLabel ?? 'A good free resource'}
            </ExternalLink>
          </p>
        )}
      </header>

      <div className="mt-6 space-y-3">
        {notice && (
          <Notice tone="success" onDismiss={() => setNotice(null)}>
            {notice}
          </Notice>
        )}
        {failure && <ErrorMessage message={failure} />}
      </div>

      <div className="mt-8 grid gap-x-12 gap-y-12 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-12">
          {/* Where you stand */}
          <section
            aria-labelledby="stand-heading"
            className="grid gap-px border border-ink-300 bg-ink-300 sm:grid-cols-2"
          >
            <div className="bg-white px-5 py-5">
              <p className="kicker text-ink-500">You say</p>
              {data.listed ? (
                <>
                  <label htmlFor="level" className="sr-only">
                    Your level
                  </label>
                  <Select
                    id="level"
                    value={data.level ?? 'beginner'}
                    onChange={(event) => void changeLevel.run(event.target.value as SkillLevel)}
                    className="mt-1 max-w-48 font-serif text-2xl"
                  >
                    {LEVELS.map((option) => (
                      <option key={option} value={option}>
                        {LEVEL_LABEL[option]}
                      </option>
                    ))}
                  </Select>
                </>
              ) : (
                <div className="mt-2">
                  <p className="font-serif text-2xl text-ink-400">Not on your list</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Select
                      id="new-level"
                      aria-label="Your level"
                      value={level}
                      onChange={(event) => setLevel(event.target.value as SkillLevel)}
                      className="w-36 py-1.5 text-sm"
                    >
                      {LEVELS.map((option) => (
                        <option key={option} value={option}>
                          {LEVEL_LABEL[option]}
                        </option>
                      ))}
                    </Select>
                    <Button size="sm" disabled={listIt.pending} onClick={() => void listIt.run()}>
                      Add to my skills
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="bg-white px-5 py-5">
              <p id="stand-heading" className="kicker text-ink-500">
                Your work shows
              </p>
              <div className="mt-2 flex items-center gap-3">
                <p className="font-serif text-2xl text-ink-900">{PROOF_LABEL[proof.stage]}</p>
                <Badge tone={PROOF_TONE[proof.stage]}>
                  {proof.stage === 'proven' && proof.provenAt
                    ? `since ${formatDate(proof.provenAt, true)}`
                    : 'evidence'}
                </Badge>
              </div>
              <p className="mt-1.5 text-sm text-ink-600">{PROOF_HINT[proof.stage]}</p>
            </div>
          </section>

          {data.inTrack && (
            <p className="border-l-2 border-brand-400 pl-4 text-sm text-ink-700">
              <span className="kicker mr-2 text-brand-700">{data.inTrack.label} of your goal</span>
              {data.inTrack.why}
            </p>
          )}

          {/* Evidence */}
          <section aria-labelledby="evidence-heading">
            <SectionHeading id="evidence-heading" title="The evidence" />
            {anyEvidence ? (
              <dl className="grid gap-6 sm:grid-cols-2">
                <Evidence
                  label="Shipped projects"
                  items={proof.shippedProjects}
                  to={(id) => `/student/projects/${id}`}
                />
                <Evidence
                  label="Projects in progress"
                  items={proof.activeProjects}
                  to={(id) => `/student/projects/${id}`}
                />
                <Evidence label="Certificates" items={proof.certificates} />
                <Evidence
                  label="Events where you used it"
                  items={proof.events}
                  to={(id) => `/student/events/${id}`}
                />
              </dl>
            ) : (
              <p className="text-sm text-ink-500">
                Nothing yet. Tag {skill.name} on a project you build, add a certificate, or mention
                it when you reflect on an event.
              </p>
            )}
          </section>

          {/* Practice */}
          <section aria-labelledby="practice-heading" id="practice">
            <SectionHeading
              id="practice-heading"
              title="Practice"
              note={
                proof.practiceMinutes30d > 0
                  ? `${minutesLabel(proof.practiceMinutes30d)} in the last 30 days`
                  : undefined
              }
            />
            {data.listed ? (
              <form
                className="space-y-6 border border-ink-300 bg-white px-5 py-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  void log.run();
                }}
              >
                <div>
                  <p className="kicker text-ink-500">How long</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {QUICK_MINUTES.map((value) => (
                      <Chip
                        key={value}
                        active={minutes === value}
                        onClick={() => setMinutes(value)}
                      >
                        {minutesLabel(value)}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div className="grid gap-6 sm:grid-cols-[10rem_minmax(0,1fr)]">
                  <Field id="practice-date" label="When">
                    <TextInput
                      id="practice-date"
                      type="date"
                      value={date}
                      min={addDaysISO(todayISO(), -60)}
                      max={todayISO()}
                      onChange={(event) => setDate(event.target.value)}
                      required
                    />
                  </Field>
                  <Field id="practice-note" label="On what (optional)">
                    <TextInput
                      id="practice-note"
                      value={note}
                      maxLength={200}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Generics and narrowing"
                    />
                  </Field>
                </div>
                <Button type="submit" size="sm" disabled={log.pending}>
                  {log.pending ? 'Logging…' : 'Log practice'}
                </Button>
              </form>
            ) : (
              <p className="text-sm text-ink-500">
                Add {skill.name} to your skills to log practice on it.
              </p>
            )}

            {data.practice.length > 0 && (
              <ul className="mt-5">
                {data.practice.map((entry) => (
                  <li
                    key={entry.id}
                    className="group flex items-baseline justify-between gap-3 border-b border-ink-200 py-2 text-sm"
                  >
                    <span className="min-w-0 text-ink-800">
                      {formatDay(entry.date)}
                      {entry.note && <span className="text-ink-500"> — {entry.note}</span>}
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="font-mono text-xs text-ink-500">
                        {minutesLabel(entry.minutes)}
                      </span>
                      <button
                        type="button"
                        onClick={() => void removeLog.run(entry.id)}
                        aria-label={`Delete practice on ${formatDay(entry.date)}`}
                        className="text-ink-300 opacity-0 transition group-hover:opacity-100 hover:text-red-600 focus-visible:opacity-100"
                      >
                        <Icon name="trash" className="size-3.5" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-10">
          <SideList
            title="Openings that ask for it"
            empty="No open listing asks for this right now."
          >
            {data.openings.jobs.map((job) => (
              <SideItem
                key={job.id}
                to={`/student/jobs/${job.id}`}
                title={job.title}
                meta={`${job.organiser}${job.deadline ? ` · closes ${relativeDays(daysUntil(job.deadline))}` : ''}`}
                tag={job.required ? undefined : 'Nice to have'}
              />
            ))}
            {data.openings.events.map((event) => (
              <SideItem
                key={event.id}
                to={`/student/events/${event.id}`}
                title={event.title}
                meta={`${event.organiser} · ${formatDay(event.startsOn)}`}
                tag="Event"
              />
            ))}
          </SideList>

          <SideList title="Practise it with a project" empty="No curated idea uses this one yet.">
            {data.ideas.map((idea) => (
              <SideItem
                key={idea.id}
                to="/student/projects?tab=ideas"
                title={idea.title}
                meta={`${DIFFICULTY_LABEL[idea.difficulty] ?? idea.difficulty} · about ${idea.hours} h`}
              />
            ))}
          </SideList>
        </aside>
      </div>
    </>
  );
}

function Evidence({
  label,
  items,
  to,
}: {
  label: string;
  items: EvidenceRef[];
  to?: (id: string) => string;
}) {
  return (
    <div>
      <dt className="kicker text-ink-500">{label}</dt>
      <dd className="mt-2">
        {items.length === 0 ? (
          <span className="text-sm text-ink-400">None</span>
        ) : (
          <ul className="space-y-1.5">
            {items.map((item) => (
              <li key={item.id} className="text-sm">
                {to ? (
                  <Link
                    to={to(item.id)}
                    className="text-ink-900 underline decoration-ink-300 underline-offset-4 hover:text-brand-700"
                  >
                    {item.title}
                  </Link>
                ) : (
                  <span className="text-ink-900">{item.title}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </dd>
    </div>
  );
}

function SideList({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: ReactNode[];
}) {
  const items = children.flat().filter(Boolean);
  return (
    <section>
      <SectionHeading title={title} />
      {items.length === 0 ? <p className="text-sm text-ink-500">{empty}</p> : <ul>{items}</ul>}
    </section>
  );
}

function SideItem({
  to,
  title,
  meta,
  tag,
}: {
  to: string;
  title: string;
  meta: string;
  tag?: string;
}) {
  return (
    <li>
      <Link to={to} className="group block border-b border-ink-200 py-3">
        <span className="flex items-start justify-between gap-3">
          <span className="text-sm text-ink-900 group-hover:text-brand-700">{title}</span>
          {tag && <Badge tone="muted">{tag}</Badge>}
        </span>
        <span className="mt-0.5 block text-xs text-ink-500">{meta}</span>
      </Link>
    </li>
  );
}
