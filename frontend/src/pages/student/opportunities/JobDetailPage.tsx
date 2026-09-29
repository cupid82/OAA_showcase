import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { ExternalLink, SectionHeading, SkillChips } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { TextArea } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDate, relativeDays, timeAgo } from '@/lib/format';
import { JOB_KIND_LABEL, STAGE_LABEL, WORK_MODE_LABEL } from '@/lib/labels';
import { useAction } from '@/lib/useAction';
import { useApi } from '@/lib/useApi';
import type { ApplicationStage, JobDetail } from '@/types';

import { FitBadge, SourceBadge, WhyItFits, sourceHint } from './shared';

const STAGES: ApplicationStage[] = [
  'saved',
  'applied',
  'interviewing',
  'offer',
  'rejected',
  'withdrawn',
];

export default function JobDetailPage() {
  const { jobId = '' } = useParams();
  const { data, error, loading, reload, setData } = useApi<JobDetail>(`/api/jobs/${jobId}`);
  const [notice, setNotice] = useState<string | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    setNote(data?.my?.note ?? '');
  }, [data?.my?.note]);

  const update = useAction(async (path: string, body: object, message: string) => {
    const { data: next } = await api.put<{ data: JobDetail }>(`/api/jobs/${jobId}/${path}`, body);
    setData(next);
    setNotice(message);
  });

  if (loading && !data) return <Loading variant="page" />;
  if (error && !data)
    return <ErrorMessage title="Listing unavailable" message={error} onRetry={reload} />;
  if (!data) return null;

  const live = data.status === 'published' || data.status === 'archived';
  const stage = data.my?.stage ?? null;

  return (
    <>
      <Link
        to="/student/jobs"
        className="kicker inline-flex items-center gap-2 text-ink-500 hover:text-ink-900"
      >
        <Icon name="arrowLeft" className="size-4" />
        Jobs
      </Link>

      <header className="mt-5 border-b border-ink-200 pb-7">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{JOB_KIND_LABEL[data.kind]}</Badge>
          <Badge tone="muted">{WORK_MODE_LABEL[data.mode]}</Badge>
          <SourceBadge verification={data.verification} label={data.verificationLabel} />
          {data.status === 'published' && <FitBadge match={data.match} />}
        </div>
        <h1 className="mt-4 font-serif text-4xl text-ink-900">{data.title}</h1>
        <p className="mt-2 text-lg text-ink-600">
          {data.organiser} · {data.location}
        </p>
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
            You shared this. A moderator checks it before anyone else sees it.
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
            <Fact label="Deadline">
              {data.deadline ? formatDate(data.deadline, true) : 'None given'}
              {data.deadline && (
                <span
                  className={cn(
                    'block text-xs',
                    data.open && (data.daysLeft ?? 99) <= 3 ? 'text-accent-700' : 'text-ink-500',
                  )}
                >
                  {data.open ? `closes ${relativeDays(data.daysLeft ?? 0)}` : 'closed'}
                </span>
              )}
            </Fact>
            <Fact label="Pay">{data.compensation || '—'}</Fact>
            <Fact label="Duration">{data.duration || '—'}</Fact>
            <Fact label="Commitment">{data.effort || '—'}</Fact>
          </dl>

          <section aria-labelledby="role-heading">
            <SectionHeading id="role-heading" title="The role" />
            <p className="prose-measure leading-relaxed text-ink-800">{data.description}</p>
            <p className="prose-measure mt-4 text-sm text-ink-600">
              <span className="kicker mr-2 text-ink-500">Eligibility</span>
              {data.eligibility || 'Not stated.'}{' '}
              {data.eligibleYears.length > 0 && (
                <span
                  className={cn(
                    data.match.eligible ? 'text-ink-500' : 'font-medium text-accent-700',
                  )}
                >
                  (Open to year {data.eligibleYears.join(', ')}
                  {data.match.eligible ? '' : ' — not yours'}.)
                </span>
              )}
            </p>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="kicker text-ink-500">Asks for</p>
                <SkillChips
                  skills={data.skills}
                  highlight={new Set(data.match.have.map((skill) => skill.id))}
                  className="mt-2"
                  empty="No specific skills."
                />
              </div>
              {data.niceSkills.length > 0 && (
                <div>
                  <p className="kicker text-ink-500">Nice to have</p>
                  <SkillChips
                    skills={data.niceSkills}
                    highlight={new Set(data.match.niceHave.map((skill) => skill.id))}
                    className="mt-2"
                  />
                </div>
              )}
            </div>
          </section>

          {data.status === 'published' && (
            <section aria-labelledby="why-heading">
              <SectionHeading id="why-heading" title="How you fit" />
              <WhyItFits match={data.match} />
              {data.match.missing.length > 0 && (
                <p className="mt-4 text-sm text-ink-600">
                  Each skill in the gap links to what it is and where to start — and to other
                  openings that ask for it.
                </p>
              )}
            </section>
          )}
        </div>

        <aside className="min-w-0 space-y-8">
          {live && (
            <section
              aria-labelledby="tracker-heading"
              className="border border-ink-300 bg-white px-5 py-5"
            >
              <h2 id="tracker-heading" className="kicker text-ink-500">
                Your tracker · private
              </h2>
              <p className="mt-2 font-serif text-2xl text-ink-900">
                {stage ? STAGE_LABEL[stage] : 'Not tracking'}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-1.5">
                {STAGES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    disabled={update.pending || option === stage}
                    onClick={() =>
                      void update.run(
                        'application',
                        { stage: option },
                        `Marked as ${STAGE_LABEL[option].toLowerCase()}.`,
                      )
                    }
                    className={cn(
                      'border px-2.5 py-2 text-left text-xs transition disabled:cursor-default',
                      option === stage
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-ink-300 bg-white text-ink-700 hover:border-ink-500',
                    )}
                  >
                    {STAGE_LABEL[option]}
                  </button>
                ))}
              </div>

              {stage && (
                <>
                  <label htmlFor="app-note" className="kicker mt-6 block text-ink-500">
                    Private note
                  </label>
                  <TextArea
                    id="app-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={1000}
                    rows={3}
                    placeholder="Interview on Friday. Revise…"
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={update.pending || note === (data.my?.note ?? '')}
                      onClick={() => void update.run('application', { stage, note }, 'Note saved.')}
                    >
                      Save note
                    </Button>
                    <button
                      type="button"
                      onClick={() =>
                        void update.run('application', { stage: 'none' }, 'Stopped tracking it.')
                      }
                      className="kicker text-ink-500 hover:text-red-600"
                    >
                      Stop tracking
                    </button>
                  </div>

                  <ol className="mt-6 border-t border-ink-200 pt-4">
                    {[...(data.my?.timeline ?? [])].reverse().map((entry) => (
                      <li
                        key={`${entry.stage}-${entry.at}`}
                        className="flex items-baseline justify-between gap-3 py-1 text-xs"
                      >
                        <span className="text-ink-800">{STAGE_LABEL[entry.stage]}</span>
                        <span className="font-mono text-ink-500">{timeAgo(entry.at)}</span>
                      </li>
                    ))}
                  </ol>
                </>
              )}

              <div className="mt-5 border-t border-ink-200 pt-4 text-sm">
                {data.url ? (
                  <>
                    <ExternalLink href={data.url}>Apply on their site</ExternalLink>
                    <span className="mt-1 block text-xs text-ink-500">
                      OAA doesn’t apply for you — the tracker is your own record.
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-ink-500">
                    Apply through the college placement cell. The tracker is your own record.
                  </span>
                )}
              </div>
            </section>
          )}

          <section className="border border-ink-200 bg-ink-50 px-5 py-4">
            <p className="kicker text-ink-500">Where it came from</p>
            <p className="mt-2 text-sm text-ink-700">{sourceHint(data.verification)}</p>
          </section>

          {data.status === 'published' && !stage && (
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
