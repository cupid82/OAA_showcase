import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { ExternalLink, ProgressBar, SectionHeading, SkillChips } from '@/components/ui/Bits';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { TextArea, TextInput } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDate, formatDay, timeAgo, todayISO } from '@/lib/format';
import { PROJECT_STATUS_LABEL, VISIBILITY_HINT, VISIBILITY_LABEL } from '@/lib/labels';
import { useAction } from '@/lib/useAction';
import { useApi } from '@/lib/useApi';
import type { ProjectDetail, ProjectStatus } from '@/types';

import { STATUS_TONE } from './ProjectsPage';

export default function ProjectDetailPage() {
  const { projectId = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { data, error, loading, reload, setData } = useApi<ProjectDetail>(
    `/api/projects/${projectId}`,
  );
  const [notice, setNotice] = useState<string | null>(
    params.get('started') ? 'Project started. Write its problem statement to make it yours.' : null,
  );

  /** Every write returns the fresh project, so the page never refetches. */
  const write = useAction(
    async (request: () => Promise<{ data: ProjectDetail | null }>, message?: string) => {
      const { data: next } = await request();
      if (next) setData(next);
      if (message) setNotice(message);
      return next;
    },
  );

  if (loading && !data) return <Loading variant="page" label="Loading project…" />;
  if (error && !data)
    return <ErrorMessage title="Project unavailable" message={error} onRetry={reload} />;
  if (!data) return null;

  const team = data.access !== 'viewer';
  const owner = data.access === 'owner';

  function setStatus(status: ProjectStatus, message: string) {
    void write.run(() => api.patch(`/api/projects/${projectId}`, { status }), message);
  }

  return (
    <>
      <Link
        to="/student/projects"
        className="kicker inline-flex items-center gap-2 text-ink-500 hover:text-ink-900"
      >
        <Icon name="arrowLeft" className="size-4" />
        Projects
      </Link>

      {/* Header */}
      <header className="mt-5 border-b border-ink-200 pb-7">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={STATUS_TONE[data.status]}>{PROJECT_STATUS_LABEL[data.status]}</Badge>
          <Badge tone="muted" title={VISIBILITY_HINT[data.visibility]}>
            <Icon
              name={
                data.visibility === 'private'
                  ? 'lock'
                  : data.visibility === 'public'
                    ? 'globe'
                    : 'users'
              }
              className="size-3"
            />
            {VISIBILITY_LABEL[data.visibility]}
          </Badge>
          {data.openToCollaborators && <Badge tone="brand">Looking for help</Badge>}
          {data.source === 'github' && <Badge tone="muted">Imported from GitHub</Badge>}
          {data.idea && <Badge tone="muted">From idea: {data.idea.title}</Badge>}
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <h1 className="font-serif text-4xl text-ink-900">{data.title}</h1>
            {data.tagline && (
              <p className="prose-measure mt-2 text-lg text-ink-600">{data.tagline}</p>
            )}
            <p className="mt-3 text-sm text-ink-500">
              {owner ? 'Yours' : `By ${data.owner.name}`}
              {data.members.length > 0 && ` · team of ${data.members.length + 1}`}
              {data.shippedAt
                ? ` · shipped ${formatDate(data.shippedAt, true)}`
                : ` · started ${formatDate(data.createdAt, true)}`}
            </p>
          </div>

          {owner && (
            <div className="flex flex-wrap gap-2">
              <ButtonLink to={`/student/projects/${data.id}/edit`} variant="secondary" size="sm">
                <Icon name="edit" className="size-4" />
                Edit
              </ButtonLink>
              {data.status !== 'shipped' && (
                <Button
                  size="sm"
                  disabled={write.pending}
                  onClick={() =>
                    setStatus(
                      'shipped',
                      'Shipped. Its skills count as proven once its story is written.',
                    )
                  }
                >
                  <Icon name="rocket" className="size-4" />
                  Mark shipped
                </Button>
              )}
              {data.status === 'building' && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={write.pending}
                  onClick={() =>
                    setStatus('paused', 'Paused. It won’t nag you until you pick it up again.')
                  }
                >
                  <Icon name="pause" className="size-4" />
                  Pause
                </Button>
              )}
              {(data.status === 'paused' || data.status === 'idea') && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={write.pending}
                  onClick={() => setStatus('building', 'Back to building.')}
                >
                  Start building
                </Button>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="mt-6 space-y-3">
        {notice && (
          <Notice tone="success" onDismiss={() => setNotice(null)}>
            {notice}
          </Notice>
        )}
        {write.error && <ErrorMessage message={write.error} />}
      </div>

      <div className="mt-8 grid gap-x-12 gap-y-12 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-12">
          <Story data={data} />
          <Milestones data={data} team={team} run={write.run} pending={write.pending} />
        </div>

        <aside className="min-w-0 space-y-10">
          {team && !data.storyComplete && <StoryChecklist data={data} />}
          <Team
            data={data}
            run={write.run}
            onLeft={() => navigate('/student/projects', { replace: true })}
          />
          {owner && data.joinRequests.length > 0 && (
            <Requests data={data} run={write.run} pending={write.pending} />
          )}
          {data.access === 'viewer' && (
            <AskToJoin data={data} run={write.run} pending={write.pending} />
          )}
          <Links data={data} />
        </aside>
      </div>
    </>
  );
}

type Run = (
  request: () => Promise<{ data: ProjectDetail | null }>,
  message?: string,
) => Promise<ProjectDetail | null | undefined>;

function Story({ data }: { data: ProjectDetail }) {
  const blocks: { label: string; text: string; empty: string }[] = [
    {
      label: 'The problem',
      text: data.problem,
      empty: 'No problem statement yet — what does this solve, and for whom?',
    },
    { label: 'What I did', text: data.role, empty: 'Not written yet.' },
    {
      label: 'What happened',
      text: data.outcome,
      empty:
        data.status === 'shipped'
          ? 'Users, results, what you learned — not written yet.'
          : 'Written once it ships.',
    },
  ];

  return (
    <section aria-labelledby="story-heading">
      <SectionHeading id="story-heading" title="The story" />
      <dl className="space-y-6">
        {blocks.map((block) => (
          <div key={block.label}>
            <dt className="kicker text-ink-500">{block.label}</dt>
            <dd
              className={cn(
                'prose-measure mt-2 leading-relaxed',
                block.text ? 'text-ink-800' : 'text-sm text-ink-400 italic',
              )}
            >
              {block.text || block.empty}
            </dd>
          </div>
        ))}
        <div>
          <dt className="kicker text-ink-500">Skills used</dt>
          <dd className="mt-2">
            <SkillChips skills={data.skills} empty="No skills tagged yet." />
          </dd>
        </div>
      </dl>
    </section>
  );
}

function Milestones({
  data,
  team,
  run,
  pending,
}: {
  data: ProjectDetail;
  team: boolean;
  run: Run;
  pending: boolean;
}) {
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');

  async function add(event: React.FormEvent) {
    event.preventDefault();
    const created = await run(() =>
      api.post(`/api/projects/${data.id}/tasks`, { title, dueDate: due || null }),
    );
    if (created) {
      setTitle('');
      setDue('');
    }
  }

  return (
    <section aria-labelledby="milestones-heading">
      <SectionHeading
        id="milestones-heading"
        title="Milestones"
        note={
          data.progress.total > 0
            ? `${data.progress.done} of ${data.progress.total} done`
            : undefined
        }
      />

      {data.progress.total > 0 && (
        <ProgressBar
          className="mb-5"
          value={data.progress.done}
          max={data.progress.total}
          label="Milestones done"
        />
      )}

      {data.tasks.length === 0 ? (
        <p className="text-sm text-ink-500">
          {team
            ? 'Break the project into a few steps you could each finish in a sitting or two.'
            : 'No milestones shared.'}
        </p>
      ) : (
        <ul className="border-t border-ink-200">
          {data.tasks.map((task) => (
            <li key={task.id} className="group flex items-start gap-3 border-b border-ink-200 py-3">
              {team ? (
                <input
                  type="checkbox"
                  checked={task.done}
                  disabled={pending}
                  onChange={(event) =>
                    void run(() =>
                      api.patch(`/api/projects/${data.id}/tasks/${task.id}`, {
                        done: event.target.checked,
                      }),
                    )
                  }
                  aria-label={`${task.done ? 'Undo' : 'Complete'}: ${task.title}`}
                  className="mt-1 size-4 shrink-0 cursor-pointer accent-brand-600"
                />
              ) : (
                <Icon
                  name={task.done ? 'check' : 'minus'}
                  className={cn('mt-0.5 size-4', task.done ? 'text-brand-600' : 'text-ink-300')}
                />
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'text-sm',
                    task.done ? 'text-ink-500 line-through decoration-ink-300' : 'text-ink-900',
                  )}
                >
                  {task.title}
                </p>
                <p className="mt-0.5 text-xs text-ink-500">
                  {task.done ? (
                    `Done${task.doneBy ? ` by ${task.doneBy}` : ''}${task.doneAt ? ` · ${formatDay(task.doneAt)}` : ''}`
                  ) : task.dueDate ? (
                    <span className={cn(task.overdue && 'font-medium text-accent-700')}>
                      {task.overdue ? 'Overdue — was due' : 'Due'} {formatDay(task.dueDate)}
                    </span>
                  ) : (
                    'No date'
                  )}
                </p>
              </div>
              {team && (
                <button
                  type="button"
                  onClick={() =>
                    void run(() => api.delete(`/api/projects/${data.id}/tasks/${task.id}`))
                  }
                  aria-label={`Delete milestone: ${task.title}`}
                  className="p-1 text-ink-300 opacity-0 transition group-hover:opacity-100 hover:text-red-600 focus-visible:opacity-100"
                >
                  <Icon name="trash" className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {team && (
        <form
          onSubmit={add}
          className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end"
        >
          <div>
            <label htmlFor="task-title" className="kicker block text-ink-500">
              New milestone
            </label>
            <TextInput
              id="task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Deploy it and share the link"
              required
              minLength={2}
            />
          </div>
          <div>
            <label htmlFor="task-due" className="kicker block text-ink-500">
              Due (optional)
            </label>
            <TextInput
              id="task-due"
              type="date"
              value={due}
              min={todayISO()}
              onChange={(event) => setDue(event.target.value)}
            />
          </div>
          <Button type="submit" size="sm" disabled={pending || title.trim().length < 2}>
            <Icon name="plus" className="size-4" />
            Add
          </Button>
        </form>
      )}
    </section>
  );
}

function StoryChecklist({ data }: { data: ProjectDetail }) {
  const items: [boolean, string][] = [
    [data.story.problem, 'A problem statement (a sentence or two)'],
    [data.story.skills, 'The skills it used'],
    [data.story.role, 'What you personally did'],
    [data.story.link, 'A repository or demo link'],
    [data.story.outcome, 'What happened'],
  ];

  return (
    <section
      aria-labelledby="checklist-heading"
      className="border border-accent-400 bg-accent-400/10 px-5 py-5"
    >
      <h2 id="checklist-heading" className="font-serif text-lg text-ink-900">
        Finish the story
      </h2>
      <p className="mt-1 text-sm text-ink-600">
        Until it has a problem statement and its skills, shipping this can’t prove anything — or
        earn momentum.
      </p>
      <ul className="mt-4 space-y-2">
        {items.map(([done, label]) => (
          <li key={label} className="flex items-center gap-2.5 text-sm">
            <Icon
              name={done ? 'check' : 'minus'}
              className={cn('size-4', done ? 'text-brand-600' : 'text-ink-400')}
            />
            <span
              className={done ? 'text-ink-500 line-through decoration-ink-300' : 'text-ink-800'}
            >
              {label}
            </span>
          </li>
        ))}
      </ul>
      {data.access === 'owner' && (
        <ButtonLink to={`/student/projects/${data.id}/edit`} size="sm" className="mt-5">
          Write it
        </ButtonLink>
      )}
    </section>
  );
}

function Team({ data, run, onLeft }: { data: ProjectDetail; run: Run; onLeft: () => void }) {
  const me = data.access;
  const self = data.members.find((member) => member.isYou);

  async function remove(studentId: string, self: boolean) {
    const result = await run(() => api.delete(`/api/projects/${data.id}/members/${studentId}`));
    if (self && result === null) onLeft();
  }

  return (
    <section aria-labelledby="team-heading">
      <SectionHeading id="team-heading" title="Team" />
      <ul>
        <Person
          name={data.owner.name}
          meta={`${data.owner.department} · Year ${data.owner.year}`}
          role="Owner"
        />
        {data.members.map((member) => (
          <Person
            key={member.studentId}
            name={member.isYou ? `${member.name} (you)` : member.name}
            meta={`Joined ${formatDate(member.joinedAt, true)}`}
            role={member.role}
            action={
              me === 'owner' ? (
                <button
                  type="button"
                  onClick={() => void remove(member.studentId, false)}
                  className="kicker text-ink-400 hover:text-red-600"
                >
                  Remove
                </button>
              ) : undefined
            }
          />
        ))}
      </ul>
      {me === 'member' && self && (
        <button
          type="button"
          onClick={() => void remove(self.studentId, true)}
          className="kicker mt-3 text-ink-500 hover:text-red-600"
        >
          Leave this project
        </button>
      )}
    </section>
  );
}

function Person({
  name,
  meta,
  role,
  action,
}: {
  name: string;
  meta: string;
  role: string;
  action?: ReactNode;
}) {
  return (
    <li className="flex items-start justify-between gap-3 border-b border-ink-200 py-3">
      <div className="min-w-0">
        <p className="text-sm text-ink-900">{name}</p>
        <p className="text-xs text-ink-500">
          <span className="text-ink-700">{role}</span> · {meta}
        </p>
      </div>
      {action}
    </li>
  );
}

function Requests({ data, run, pending }: { data: ProjectDetail; run: Run; pending: boolean }) {
  return (
    <section aria-labelledby="requests-heading">
      <SectionHeading id="requests-heading" title="Asking to join" />
      <ul className="space-y-4">
        {data.joinRequests.map((request) => (
          <li key={request.id} className="border border-ink-300 bg-white px-4 py-4">
            <p className="text-sm text-ink-900">{request.student.name}</p>
            <p className="text-xs text-ink-500">
              {request.student.department} · Year {request.student.year} ·{' '}
              {timeAgo(request.createdAt)}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-700">“{request.message}”</p>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                disabled={pending}
                onClick={() =>
                  void run(
                    () =>
                      api.patch(`/api/projects/${data.id}/join-requests/${request.id}`, {
                        decision: 'accepted',
                      }),
                    `${request.student.name} is on the team.`,
                  )
                }
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() =>
                  void run(
                    () =>
                      api.patch(`/api/projects/${data.id}/join-requests/${request.id}`, {
                        decision: 'declined',
                      }),
                    'Declined. They’ve been told, kindly.',
                  )
                }
              >
                Decline
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AskToJoin({ data, run, pending }: { data: ProjectDetail; run: Run; pending: boolean }) {
  const [message, setMessage] = useState('');

  if (data.myRequest?.status === 'pending') {
    return (
      <Notice tone="info" title="Request sent">
        You asked to join {timeAgo(data.myRequest.createdAt)}. {data.owner.name} will see it in
        their inbox.
      </Notice>
    );
  }

  if (!data.openToCollaborators) {
    return (
      <p className="border border-ink-200 bg-white px-4 py-4 text-sm text-ink-600">
        {data.owner.name} isn’t looking for collaborators on this one right now.
      </p>
    );
  }

  return (
    <section
      aria-labelledby="ask-heading"
      className="border border-brand-300 bg-brand-50/60 px-5 py-5"
    >
      <h2 id="ask-heading" className="font-serif text-lg text-ink-900">
        Ask to join
      </h2>
      {data.lookingFor && (
        <p className="mt-1 text-sm text-ink-700">
          <span className="kicker mr-2 text-ink-500">Wanted</span>
          {data.lookingFor}
        </p>
      )}
      {data.myRequest?.status === 'declined' && (
        <p className="mt-2 text-xs text-ink-500">
          Your last request wasn’t accepted — you can ask again if things have changed.
        </p>
      )}
      <form
        className="mt-4"
        onSubmit={(event) => {
          event.preventDefault();
          void run(
            () => api.post(`/api/projects/${data.id}/join-requests`, { message }),
            'Request sent.',
          );
        }}
      >
        <label htmlFor="join-message" className="kicker block text-ink-500">
          What would you bring?
        </label>
        <TextArea
          id="join-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={3}
          required
          minLength={10}
          maxLength={400}
          placeholder="A sentence or two — what you can do, and why this project."
        />
        <Button
          type="submit"
          size="sm"
          className="mt-4"
          disabled={pending || message.trim().length < 10}
        >
          <Icon name="send" className="size-4" />
          Send request
        </Button>
      </form>
    </section>
  );
}

function Links({ data }: { data: ProjectDetail }) {
  if (!data.repoUrl && !data.demoUrl) return null;
  return (
    <section aria-labelledby="links-heading">
      <SectionHeading id="links-heading" title="Links" />
      <ul className="space-y-2 text-sm">
        {data.repoUrl && (
          <li>
            <ExternalLink href={data.repoUrl}>Repository</ExternalLink>
          </li>
        )}
        {data.demoUrl && (
          <li>
            <ExternalLink href={data.demoUrl}>Live demo</ExternalLink>
          </li>
        )}
      </ul>
    </section>
  );
}
