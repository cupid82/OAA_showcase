import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { SectionHeading, SkillChips } from '@/components/ui/Bits';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Checkbox, TextInput } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { Chip } from '@/components/ui/Tabs';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDay, relativeDays } from '@/lib/format';
import { JOB_KIND_LABEL, PIPELINE, STAGE_LABEL, WORK_MODE_LABEL } from '@/lib/labels';
import { useAction } from '@/lib/useAction';
import { useApi } from '@/lib/useApi';
import type { ApplicationStage, JobCard, JobKind, JobsOverview } from '@/types';

import { FitBadge, LISTING_STATUS_TEXT, SourceBadge } from './shared';

const KINDS = Object.keys(JOB_KIND_LABEL) as JobKind[];

export default function JobsPage() {
  const { data, error, loading, reload } = useApi<JobsOverview>('/api/jobs');
  const [kind, setKind] = useState<JobKind | 'all'>('all');
  const [eligibleOnly, setEligibleOnly] = useState(true);
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState<ApplicationStage | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const act = useAction(async (jobId: string, path: string, body: object, message: string) => {
    await api.put(`/api/jobs/${jobId}/${path}`, body);
    setNotice(message);
    reload();
  });

  const open = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data?.open ?? []).filter(
      (job) =>
        (kind === 'all' || job.kind === kind) &&
        (!eligibleOnly || job.match.eligible) &&
        (!needle || `${job.title} ${job.organiser} ${job.location}`.toLowerCase().includes(needle)),
    );
  }, [data, kind, eligibleOnly, query]);

  if (loading && !data) return <Loading variant="page" label="Loading openings…" />;
  if (error && !data) return <ErrorMessage message={error} onRetry={reload} />;
  if (!data) return null;

  const tracked = stage ? data.tracked.filter((job) => job.my?.stage === stage) : data.tracked;
  const closed = data.pipeline.rejected + data.pipeline.withdrawn;

  return (
    <>
      <PageHeader
        eyebrow="Jobs"
        title="Internships, jobs and drives"
        description="Matches explain themselves — the skills you have, and the gap. The tracker is yours alone: nobody else, admins included, sees where you’ve applied."
        actions={
          <ButtonLink to="/student/jobs/share" variant="secondary">
            <Icon name="send" className="size-4" />
            Share an opening
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

      {/* The pipeline — every stage a filter for the list beneath it. */}
      <section aria-labelledby="pipeline-heading">
        <h2 id="pipeline-heading" className="sr-only">
          Your pipeline
        </h2>
        <ol className="grid grid-cols-2 gap-px border border-ink-300 bg-ink-300 sm:grid-cols-4">
          {PIPELINE.map((entry, index) => (
            <li key={entry}>
              <button
                type="button"
                onClick={() => setStage(stage === entry ? null : entry)}
                aria-pressed={stage === entry}
                className={cn(
                  'flex h-full w-full flex-col px-5 py-4 text-left transition',
                  stage === entry ? 'bg-brand-50' : 'bg-white hover:bg-ink-50',
                )}
              >
                <span className="kicker flex items-center gap-2 text-ink-500">
                  <span className="text-brand-600">{index + 1}</span>
                  {STAGE_LABEL[entry]}
                </span>
                <span className="mt-2 font-serif text-4xl leading-none text-ink-900">
                  {data.pipeline[entry]}
                </span>
              </button>
            </li>
          ))}
        </ol>
        {closed > 0 && (
          <p className="mt-2 text-xs text-ink-500">
            Plus {closed} closed ({data.pipeline.rejected} not this time, {data.pipeline.withdrawn}{' '}
            withdrawn).
          </p>
        )}
      </section>

      <section aria-labelledby="tracked-heading" className="mt-12">
        <SectionHeading
          id="tracked-heading"
          title={stage ? `${STAGE_LABEL[stage]}` : 'Your applications'}
          action={
            stage && (
              <button
                type="button"
                onClick={() => setStage(null)}
                className="kicker text-brand-700"
              >
                Show all
              </button>
            )
          }
        />
        {tracked.length === 0 ? (
          <p className="text-sm text-ink-500">
            {stage
              ? 'Nothing at this stage.'
              : 'Nothing tracked yet. Save an opening below and move it along as you go.'}
          </p>
        ) : (
          <ul>
            {tracked.map((job) => (
              <JobRow key={job.id} job={job} />
            ))}
          </ul>
        )}
      </section>

      {data.recommended.length > 0 && (
        <section aria-labelledby="rec-heading" className="mt-14">
          <SectionHeading id="rec-heading" title="Suggested for you" note="Each one says why" />
          <ul className="grid gap-4 lg:grid-cols-2">
            {data.recommended.map((job) => (
              <li key={job.id} className="flex flex-col border border-ink-300 bg-white px-5 py-5">
                <div className="flex flex-wrap items-center gap-2">
                  <FitBadge match={job.match} />
                  <Badge tone="neutral">{JOB_KIND_LABEL[job.kind]}</Badge>
                  <SourceBadge verification={job.verification} label={job.verificationLabel} />
                </div>
                <Link
                  to={`/student/jobs/${job.id}`}
                  className="mt-3 font-serif text-xl text-ink-900 hover:text-brand-700"
                >
                  {job.title}
                </Link>
                <p className="mt-1 text-sm text-ink-500">
                  {job.organiser} · {job.location}
                  {job.deadline && ` · closes ${relativeDays(job.daysLeft ?? 0)}`}
                </p>
                <p className="mt-3 text-sm text-ink-700">
                  {job.match.reasons.slice(0, 2).join(' ')}
                </p>
                {job.match.missing.length > 0 && (
                  <div className="mt-3">
                    <p className="kicker text-ink-500">The gap</p>
                    <SkillChips skills={job.match.missing} className="mt-1.5" />
                  </div>
                )}
                <div className="mt-auto flex flex-wrap gap-3 pt-5">
                  <Button
                    size="sm"
                    disabled={act.pending}
                    onClick={() =>
                      void act.run(
                        job.id,
                        'application',
                        { stage: 'saved' },
                        `Saved “${job.title}”. Its deadline is on your dashboard.`,
                      )
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
                        job.id,
                        'interest',
                        { notInterested: true },
                        'Hidden. Suggestions like it will come up less.',
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

      <section aria-labelledby="open-heading" className="mt-14">
        <SectionHeading
          id="open-heading"
          title="All open listings"
          note={`${data.open.length} open now`}
        />
        <div className="mb-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-end">
          <div className="flex flex-wrap gap-2">
            <Chip active={kind === 'all'} onClick={() => setKind('all')}>
              All
            </Chip>
            {KINDS.map((option) => (
              <Chip key={option} active={kind === option} onClick={() => setKind(option)}>
                {JOB_KIND_LABEL[option]}
              </Chip>
            ))}
          </div>
          <div>
            <label htmlFor="job-search" className="sr-only">
              Search listings
            </label>
            <TextInput
              id="job-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, company, city"
            />
          </div>
        </div>
        <Checkbox
          id="eligible-only"
          className="mb-6"
          checked={eligibleOnly}
          onChange={setEligibleOnly}
          label="Only ones open to my year"
        />

        {open.length === 0 ? (
          <EmptyState
            title="Nothing matches"
            description="Try another kind, or include listings for other years."
          />
        ) : (
          <ul>
            {open.map((job) => (
              <JobRow key={job.id} job={job} />
            ))}
          </ul>
        )}
      </section>

      {data.shared.length > 0 && (
        <section aria-labelledby="shared-heading" className="mt-14">
          <SectionHeading id="shared-heading" title="Shared by you" />
          <ul>
            {data.shared.map((job) => (
              <JobRow key={job.id} job={job} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function JobRow({ job }: { job: JobCard }) {
  const urgent =
    job.open && job.daysLeft !== null && job.daysLeft <= 3 && job.my?.stage === 'saved';

  return (
    <li>
      <Link
        to={`/student/jobs/${job.id}`}
        className="group grid gap-3 border-b border-ink-200 py-5 transition hover:bg-white sm:grid-cols-[minmax(0,1fr)_11rem] sm:gap-6"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{JOB_KIND_LABEL[job.kind]}</Badge>
            <SourceBadge verification={job.verification} label={job.verificationLabel} />
            {job.my && (
              <Badge tone={job.my.stage === 'offer' ? 'solid' : 'brand'}>
                {STAGE_LABEL[job.my.stage]}
              </Badge>
            )}
            {job.status !== 'published' && (
              <Badge tone="accent">{LISTING_STATUS_TEXT[job.status]}</Badge>
            )}
            {!job.match.eligible && <Badge tone="muted">Not your year</Badge>}
          </div>
          <h3 className="mt-2.5 font-serif text-xl text-ink-900 group-hover:text-brand-800">
            {job.title}
          </h3>
          <p className="mt-1 text-sm text-ink-500">
            {job.organiser} · {WORK_MODE_LABEL[job.mode]} · {job.location}
            {job.compensation && ` · ${job.compensation}`}
          </p>
          <SkillChips
            skills={job.skills}
            link={false}
            highlight={new Set(job.match.have.map((skill) => skill.id))}
            className="mt-3"
          />
          {job.my?.note && (
            <p className="mt-2 line-clamp-1 text-xs text-ink-500 italic">
              Your note: {job.my.note}
            </p>
          )}
        </div>
        <div className="text-sm sm:text-right">
          {job.deadline ? (
            <>
              <p className={cn(urgent ? 'font-medium text-accent-700' : 'text-ink-900')}>
                {job.open ? `Closes ${relativeDays(job.daysLeft ?? 0)}` : 'Closed'}
              </p>
              <p className="text-xs text-ink-500">{formatDay(job.deadline)}</p>
            </>
          ) : (
            <p className="text-ink-500">No deadline</p>
          )}
          <p className="mt-1 text-xs text-ink-500">{job.duration}</p>
        </div>
      </Link>
    </li>
  );
}
