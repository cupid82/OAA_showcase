import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { SectionHeading } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Checkbox, Field, Select, TextArea, TextInput } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Loading } from '@/components/ui/Loading';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkillPicker } from '@/components/ui/SkillPicker';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { PROJECT_STATUS_LABEL, VISIBILITY_HINT, VISIBILITY_LABEL } from '@/lib/labels';
import { useAction } from '@/lib/useAction';
import { useApi } from '@/lib/useApi';
import type { ProjectDetail, ProjectStatus, Visibility } from '@/types';

interface FormState {
  title: string;
  tagline: string;
  problem: string;
  role: string;
  outcome: string;
  status: ProjectStatus;
  skillIds: string[];
  repoUrl: string;
  demoUrl: string;
  visibility: Visibility;
  openToCollaborators: boolean;
  lookingFor: string;
}

const EMPTY: FormState = {
  title: '',
  tagline: '',
  problem: '',
  role: '',
  outcome: '',
  status: 'building',
  skillIds: [],
  repoUrl: '',
  demoUrl: '',
  visibility: 'private',
  openToCollaborators: false,
  lookingFor: '',
};

const STATUSES: ProjectStatus[] = ['idea', 'building', 'shipped', 'paused'];
const VISIBILITIES: Visibility[] = ['private', 'campus', 'public'];

function fromDetail(project: ProjectDetail): FormState {
  return {
    title: project.title,
    tagline: project.tagline,
    problem: project.problem,
    role: project.role,
    outcome: project.outcome,
    status: project.status,
    skillIds: project.skills.map((skill) => skill.id),
    repoUrl: project.repoUrl ?? '',
    demoUrl: project.demoUrl ?? '',
    visibility: project.visibility,
    openToCollaborators: project.openToCollaborators,
    lookingFor: project.lookingFor,
  };
}

/** New project, or editing one — the same form. Only the owner reaches edit. */
export default function ProjectFormPage() {
  const { projectId } = useParams();
  const editing = projectId !== undefined;
  const navigate = useNavigate();
  const existing = useApi<ProjectDetail>(editing ? `/api/projects/${projectId}` : null);
  const [form, setForm] = useState<FormState>(EMPTY);

  useEffect(() => {
    if (existing.data) setForm(fromDetail(existing.data));
  }, [existing.data]);

  const save = useAction(async () => {
    const body = {
      ...form,
      repoUrl: form.repoUrl.trim() || null,
      demoUrl: form.demoUrl.trim() || null,
      lookingFor: form.openToCollaborators ? form.lookingFor : '',
    };
    const { data } = editing
      ? await api.patch<{ data: ProjectDetail }>(`/api/projects/${projectId}`, body)
      : await api.post<{ data: ProjectDetail }>('/api/projects', body);
    navigate(`/student/projects/${data.id}`);
  });

  const remove = useAction(async () => {
    await api.delete(`/api/projects/${projectId}`);
    navigate('/student/projects', { replace: true });
  });

  if (editing && existing.loading && !existing.data) return <Loading variant="page" />;
  if (editing && existing.error)
    return <ErrorMessage message={existing.error} onRetry={existing.reload} />;
  if (editing && existing.data && existing.data.access !== 'owner') {
    return (
      <ErrorMessage
        title="Not yours to edit"
        message="Only the project’s owner can change its details."
      />
    );
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const problemShort = form.problem.trim().length > 0 && form.problem.trim().length < 20;

  return (
    <>
      <Link
        to={editing ? `/student/projects/${projectId}` : '/student/projects'}
        className="kicker inline-flex items-center gap-2 text-ink-500 hover:text-ink-900"
      >
        <Icon name="arrowLeft" className="size-4" />
        {editing ? 'Back to the project' : 'Projects'}
      </Link>

      <PageHeader
        eyebrow="Projects"
        title={editing ? `Edit ${existing.data?.title ?? 'project'}` : 'A new project'}
        description="Only the name is required. The story — problem, role, outcome — is what makes it evidence, so write it when you can."
      />

      <form
        className="max-w-3xl space-y-12"
        onSubmit={(event) => {
          event.preventDefault();
          void save.run();
        }}
      >
        <section className="space-y-7">
          <SectionHeading title="The basics" />
          <Field id="title" label="Name">
            <TextInput
              id="title"
              value={form.title}
              onChange={(event) => set('title', event.target.value)}
              required
              minLength={2}
              maxLength={80}
              placeholder="Campus Eats"
            />
          </Field>
          <Field id="tagline" label="One line" hint={`${form.tagline.length}/140`}>
            <TextInput
              id="tagline"
              value={form.tagline}
              onChange={(event) => set('tagline', event.target.value)}
              maxLength={140}
              placeholder="Pre-order from the canteen and skip the queue."
            />
          </Field>
          <Field id="status" label="Where it’s at">
            <Select
              id="status"
              value={form.status}
              onChange={(event) => set('status', event.target.value as ProjectStatus)}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {PROJECT_STATUS_LABEL[status]}
                </option>
              ))}
            </Select>
          </Field>
        </section>

        <section className="space-y-7">
          <SectionHeading title="The story" note="This is what turns it into proof" />
          <Field
            id="problem"
            label="The problem"
            help={
              problemShort
                ? 'A little more — at least a sentence. This is what makes it count as proof.'
                : 'What does it solve, and for whom? A sentence or two.'
            }
          >
            <TextArea
              id="problem"
              value={form.problem}
              onChange={(event) => set('problem', event.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="The canteen queue eats twenty minutes of a forty-five-minute lunch break…"
            />
          </Field>
          <Field id="role" label="What you did">
            <TextArea
              id="role"
              value={form.role}
              onChange={(event) => set('role', event.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Built the front end and the ordering API; ran the pilot."
            />
          </Field>
          <Field
            id="outcome"
            label="What happened"
            help="Users, results, what you learned. Worth writing even if it didn’t work out."
          >
            <TextArea
              id="outcome"
              value={form.outcome}
              onChange={(event) => set('outcome', event.target.value)}
              maxLength={1000}
              rows={2}
            />
          </Field>
          <Field
            id="skills"
            label="Skills it used"
            help="Shipping a project that tells its story proves each of these skills."
          >
            <SkillPicker
              id="skills"
              value={form.skillIds}
              onChange={(next) => set('skillIds', next)}
            />
          </Field>
        </section>

        <section className="space-y-7">
          <SectionHeading title="Links" />
          <div className="grid gap-7 sm:grid-cols-2">
            <Field id="repo" label="Repository">
              <TextInput
                id="repo"
                type="url"
                value={form.repoUrl}
                onChange={(event) => set('repoUrl', event.target.value)}
                placeholder="https://github.com/…"
              />
            </Field>
            <Field id="demo" label="Live demo">
              <TextInput
                id="demo"
                type="url"
                value={form.demoUrl}
                onChange={(event) => set('demoUrl', event.target.value)}
                placeholder="https://…"
              />
            </Field>
          </div>
        </section>

        <section>
          <SectionHeading title="Who can see it" />
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Visibility">
            {VISIBILITIES.map((visibility) => {
              const selected = form.visibility === visibility;
              return (
                <label
                  key={visibility}
                  className={cn(
                    'flex cursor-pointer flex-col border px-4 py-3 transition',
                    selected
                      ? 'border-brand-600 bg-brand-50'
                      : 'border-ink-300 bg-white hover:border-ink-500',
                  )}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="visibility"
                      checked={selected}
                      onChange={() =>
                        setForm((current) => ({
                          ...current,
                          visibility,
                          openToCollaborators:
                            visibility === 'private' ? false : current.openToCollaborators,
                        }))
                      }
                      className="accent-brand-600"
                    />
                    <span className="text-sm text-ink-900">{VISIBILITY_LABEL[visibility]}</span>
                  </span>
                  <span className="mt-1 text-xs text-ink-500">{VISIBILITY_HINT[visibility]}</span>
                </label>
              );
            })}
          </div>

          <Checkbox
            id="open"
            className="mt-7"
            checked={form.openToCollaborators}
            disabled={form.visibility === 'private'}
            onChange={(checked) => set('openToCollaborators', checked)}
            label="Looking for collaborators"
            description={
              form.visibility === 'private'
                ? 'Make it visible on campus first — nobody can ask to join a project they can’t see.'
                : 'It appears under “Find a team”, and students can ask to join.'
            }
          />
          {form.openToCollaborators && (
            <Field id="lookingFor" label="Who you’re looking for" className="mt-6">
              <TextInput
                id="lookingFor"
                value={form.lookingFor}
                onChange={(event) => set('lookingFor', event.target.value)}
                maxLength={200}
                placeholder="A designer for the room screens."
              />
            </Field>
          )}
        </section>

        {save.error && <ErrorMessage title="Couldn’t save" message={save.error} />}

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-ink-300 pt-6">
          <Button type="submit" disabled={save.pending || form.title.trim().length < 2}>
            {save.pending ? 'Saving…' : editing ? 'Save changes' : 'Create project'}
          </Button>
          {editing && (
            <div className="flex items-center gap-3">
              {remove.error && <span className="text-sm text-red-700">{remove.error}</span>}
              <ConfirmButton
                onConfirm={() => void remove.run()}
                disabled={remove.pending}
                confirmLabel="Delete for good?"
              >
                <Icon name="trash" className="size-4" />
                Delete project
              </ConfirmButton>
            </div>
          )}
        </div>
      </form>
    </>
  );
}
