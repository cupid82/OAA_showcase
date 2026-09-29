import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import type { BadgeTone } from '@/components/ui/Badge';
import { ProgressBar, SkillChips } from '@/components/ui/Bits';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Select, TextInput } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Loading } from '@/components/ui/Loading';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDay, relativeDays, daysUntil, plural } from '@/lib/format';
import { DIFFICULTY_LABEL, PROJECT_STATUS_LABEL, VISIBILITY_LABEL } from '@/lib/labels';
import { useAction } from '@/lib/useAction';
import { useApi } from '@/lib/useApi';
import { useCatalog } from '@/lib/useShared';
import type {
  DiscoverCard,
  IdeaCard,
  MyProjects,
  ProjectCard,
  ProjectDetail,
  ProjectStatus,
} from '@/types';

export const STATUS_TONE: Record<ProjectStatus, BadgeTone> = {
  idea: 'muted',
  building: 'brand',
  shipped: 'solid',
  paused: 'neutral',
};

export default function ProjectsPage() {
  const [params, setParams] = useSearchParams();
  const tab =
    (['mine', 'discover', 'ideas'] as const).find((value) => value === params.get('tab')) ?? 'mine';
  const mine = useApi<MyProjects>('/api/projects');

  return (
    <>
      <PageHeader
        eyebrow="Projects"
        title="Build things that prove it"
        description="Each project tells its story — the problem, what you did, what happened. Ship it and every skill it used counts as proven."
        actions={
          <>
            {mine.data?.github.connected && (
              <ButtonLink to="/student/connections#github" variant="secondary">
                <Icon name="download" className="size-4" />
                Import from GitHub
              </ButtonLink>
            )}
            <ButtonLink to="/student/projects/new">
              <Icon name="plus" className="size-4" />
              New project
            </ButtonLink>
          </>
        }
      />

      <Tabs
        label="Project views"
        value={tab}
        onChange={(value) => setParams(value === 'mine' ? {} : { tab: value }, { replace: true })}
        tabs={[
          { value: 'mine', label: 'My projects', count: mine.data?.projects.length },
          { value: 'discover', label: 'Find a team' },
          { value: 'ideas', label: 'Ideas' },
        ]}
      />

      <div className="mt-8">
        {tab === 'mine' && <Mine state={mine} />}
        {tab === 'discover' && <Discover />}
        {tab === 'ideas' && <Ideas />}
      </div>
    </>
  );
}

// --- My projects ---------------------------------------------------------------------

function Mine({ state }: { state: ReturnType<typeof useApi<MyProjects>> }) {
  const { data, error, loading, reload } = state;

  if (loading && !data) return <Loading label="Loading your projects…" />;
  if (error && !data) return <ErrorMessage message={error} onRetry={reload} />;
  if (!data) return null;

  if (data.projects.length === 0) {
    return (
      <EmptyState
        title="No projects yet"
        description="Start from a curated idea, add something you’ve already built, or import your repositories from GitHub."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink to="/student/projects?tab=ideas" variant="secondary" size="sm">
              Browse ideas
            </ButtonLink>
            <ButtonLink to="/student/projects/new" size="sm">
              New project
            </ButtonLink>
          </div>
        }
      />
    );
  }

  return (
    <>
      <p className="mb-5 text-sm text-ink-600">
        {data.counts.building} building · {data.counts.shipped} shipped · {data.counts.idea} ideas
        {data.counts.paused > 0 && ` · ${data.counts.paused} paused`}
        {data.pendingRequests > 0 && (
          <>
            {' · '}
            <span className="font-medium text-accent-700">
              {plural(data.pendingRequests, 'person', 'people')} waiting to join
            </span>
          </>
        )}
      </p>

      {data.github.connected && data.github.importable > 0 && (
        <p className="mb-6 flex flex-wrap items-center gap-2 border border-ink-300 bg-white px-4 py-3 text-sm text-ink-700">
          <Icon name="git" className="size-4 text-ink-500" />
          {plural(data.github.importable, 'repository', 'repositories')} on GitHub not imported yet.
          <Link
            to="/student/connections#github"
            className="font-medium text-brand-700 underline underline-offset-4"
          >
            Choose which to import
          </Link>
        </p>
      )}

      <ul className="grid gap-4 lg:grid-cols-2">
        {data.projects.map((project) => (
          <li key={project.id}>
            <ProjectTile project={project} />
          </li>
        ))}
      </ul>
    </>
  );
}

function ProjectTile({ project }: { project: ProjectCard }) {
  return (
    <Link
      to={`/student/projects/${project.id}`}
      className="group flex h-full flex-col border border-ink-300 bg-white px-5 py-5 transition hover:border-ink-500 hover:shadow-card"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={STATUS_TONE[project.status]}>{PROJECT_STATUS_LABEL[project.status]}</Badge>
        <Badge tone="muted">
          <Icon
            name={
              project.visibility === 'private'
                ? 'lock'
                : project.visibility === 'public'
                  ? 'globe'
                  : 'users'
            }
            className="size-3"
          />
          {VISIBILITY_LABEL[project.visibility]}
        </Badge>
        {project.access === 'member' && <Badge tone="neutral">Team member</Badge>}
        {project.source === 'github' && <Badge tone="muted">From GitHub</Badge>}
        {project.pendingRequests > 0 && (
          <Badge tone="accent">{plural(project.pendingRequests, 'request')}</Badge>
        )}
      </div>

      <h3 className="mt-3 font-serif text-2xl text-ink-900 group-hover:text-brand-800">
        {project.title}
      </h3>
      {project.tagline && <p className="mt-1 text-sm text-ink-600">{project.tagline}</p>}

      {project.progress.total > 0 && (
        <div className="mt-4">
          <div className="flex items-baseline justify-between text-xs text-ink-500">
            <span>
              {project.progress.done} of {project.progress.total} milestones
            </span>
            {project.nextTask && (
              <span className={cn(project.nextTask.overdue && 'font-medium text-accent-700')}>
                Next: {project.nextTask.title}
                {project.nextTask.dueDate &&
                  ` · ${project.nextTask.overdue ? 'overdue' : relativeDays(daysUntil(project.nextTask.dueDate))}`}
              </span>
            )}
          </div>
          <ProgressBar
            className="mt-2"
            value={project.progress.done}
            max={project.progress.total}
            label={`${project.title} milestones`}
          />
        </div>
      )}

      <SkillChips skills={project.skills} link={false} className="mt-4" />

      <div className="mt-auto pt-4">
        {project.status === 'shipped' && !project.storyComplete ? (
          <p className="text-xs text-accent-700">
            Shipped, but its story is missing — it can’t prove skills yet.
          </p>
        ) : project.staleDays !== null ? (
          <p className="text-xs text-accent-700">
            Quiet for {project.staleDays} days — next step, or pause it?
          </p>
        ) : (
          <p className="text-xs text-ink-500">
            {project.team > 1 ? `Team of ${project.team} · ` : ''}Updated{' '}
            {formatDay(project.updatedAt)}
          </p>
        )}
      </div>
    </Link>
  );
}

// --- Discover ---------------------------------------------------------------------------

function Discover() {
  const { catalog } = useCatalog();
  const [query, setQuery] = useState('');
  const [skill, setSkill] = useState('');
  const params = new URLSearchParams();
  if (query.trim()) params.set('q', query.trim());
  if (skill) params.set('skill', skill);
  const { data, error, loading, reload } = useApi<DiscoverCard[]>(
    `/api/projects/discover?${params.toString()}`,
  );

  return (
    <>
      <div className="grid gap-6 border-b border-ink-300 pb-6 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          <label htmlFor="discover-q" className="kicker block text-ink-500">
            Search
          </label>
          <TextInput
            id="discover-q"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Title, idea or the help they need"
          />
        </div>
        <div>
          <label htmlFor="discover-skill" className="kicker block text-ink-500">
            Uses the skill
          </label>
          <Select
            id="discover-skill"
            value={skill}
            onChange={(event) => setSkill(event.target.value)}
          >
            <option value="">Any skill</option>
            {catalog?.skills.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <p className="mt-5 text-sm text-ink-600">
        Projects other students made visible on campus. Open ones are looking for help — ask to join
        from the project’s page.
      </p>

      {loading && !data && <Loading />}
      {error && <ErrorMessage className="mt-6" message={error} onRetry={reload} />}

      {data && data.length === 0 && (
        <EmptyState
          className="mt-6"
          title="Nothing matches"
          description="Try another word, or clear the skill filter."
        />
      )}

      {data && data.length > 0 && (
        <ul className="mt-6 border-t border-ink-300">
          {data.map((project) => (
            <li key={project.id}>
              <Link
                to={`/student/projects/${project.id}`}
                className="group grid gap-3 border-b border-ink-200 py-5 transition hover:bg-white sm:grid-cols-[minmax(0,1fr)_14rem] sm:gap-8"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {project.openToCollaborators ? (
                      <Badge tone="brand">Looking for help</Badge>
                    ) : (
                      <Badge tone="muted">Not recruiting</Badge>
                    )}
                    <Badge tone={STATUS_TONE[project.status]}>
                      {PROJECT_STATUS_LABEL[project.status]}
                    </Badge>
                    {project.myRequest === 'pending' && (
                      <Badge tone="accent">You asked to join</Badge>
                    )}
                  </div>
                  <h3 className="mt-2.5 font-serif text-xl text-ink-900 group-hover:text-brand-800">
                    {project.title}
                  </h3>
                  {project.tagline && (
                    <p className="mt-1 text-sm text-ink-600">{project.tagline}</p>
                  )}
                  {project.openToCollaborators && project.lookingFor && (
                    <p className="mt-2 text-sm text-ink-800">
                      <span className="kicker mr-2 text-ink-500">Wanted</span>
                      {project.lookingFor}
                    </p>
                  )}
                  <SkillChips
                    skills={project.skills}
                    link={false}
                    highlight={new Set(project.sharedSkills.map((entry) => entry.id))}
                    className="mt-3"
                  />
                </div>
                <div className="text-sm text-ink-600 sm:text-right">
                  <p className="text-ink-900">{project.owner.name}</p>
                  <p className="text-xs text-ink-500">
                    {project.owner.department} · Year {project.owner.year}
                  </p>
                  <p className="mt-2 text-xs text-ink-500">Team of {project.team}</p>
                  {project.sharedSkills.length > 0 && (
                    <p className="mt-2 text-xs text-brand-700">
                      You share {plural(project.sharedSkills.length, 'skill')}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// --- Ideas -------------------------------------------------------------------------------------

function Ideas() {
  const { data, error, loading, reload } = useApi<IdeaCard[]>('/api/projects/ideas');
  const navigate = useNavigate();
  const [open, setOpen] = useState<string | null>(null);

  const start = useAction(async (ideaId: string) => {
    const { data: project } = await api.post<{ data: ProjectDetail }>(
      `/api/projects/ideas/${ideaId}/start`,
      {},
    );
    navigate(`/student/projects/${project.id}?started=1`);
  });

  if (loading && !data) return <Loading label="Loading ideas…" />;
  if (error && !data) return <ErrorMessage message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <>
      <p className="mb-6 max-w-2xl text-sm text-ink-600">
        Small, real projects with a starting set of milestones. Ideas that fit your goal come first.
        Starting one copies it into your projects — the problem statement is yours to write.
      </p>
      {start.error && <ErrorMessage className="mb-6" message={start.error} />}

      <ul className="grid gap-4 lg:grid-cols-2">
        {data.map((idea) => (
          <li key={idea.id} className="flex flex-col border border-ink-300 bg-white px-5 py-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{DIFFICULTY_LABEL[idea.difficulty]}</Badge>
              <Badge tone="muted">About {idea.hours} h</Badge>
              {idea.forYourGoal && <Badge tone="brand">Fits your goal</Badge>}
            </div>
            <h3 className="mt-3 font-serif text-2xl text-ink-900">{idea.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{idea.summary}</p>
            <SkillChips skills={idea.skills} className="mt-4" />

            <button
              type="button"
              onClick={() => setOpen(open === idea.id ? null : idea.id)}
              aria-expanded={open === idea.id}
              className="kicker mt-4 flex items-center gap-1.5 self-start text-ink-500 transition hover:text-ink-900"
            >
              <Icon name={open === idea.id ? 'chevronDown' : 'chevronRight'} className="size-3.5" />
              {idea.milestones.length} milestones
            </button>
            {open === idea.id && (
              <ol className="mt-2 space-y-1.5 border-l border-ink-200 pl-4 text-sm text-ink-700">
                {idea.milestones.map((milestone) => (
                  <li key={milestone}>{milestone}</li>
                ))}
              </ol>
            )}

            <div className="mt-auto pt-5">
              {idea.startedAs ? (
                <ButtonLink
                  to={`/student/projects/${idea.startedAs}`}
                  variant="secondary"
                  size="sm"
                >
                  Open your project
                </ButtonLink>
              ) : (
                <Button size="sm" disabled={start.pending} onClick={() => void start.run(idea.id)}>
                  <Icon name="rocket" className="size-4" />
                  Start this project
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
