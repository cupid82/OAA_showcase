import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ExternalLink, SectionHeading } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Field, Select, TextArea, TextInput } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkillPicker } from '@/components/ui/SkillPicker';
import { Chip } from '@/components/ui/Tabs';
import { api } from '@/lib/api';
import { EVENT_MODE_LABEL, EVENT_TYPE_LABEL, JOB_KIND_LABEL, WORK_MODE_LABEL } from '@/lib/labels';
import { useAction } from '@/lib/useAction';
import { useApi } from '@/lib/useApi';
import { useCatalog } from '@/lib/useShared';
import type {
  AdminEvent,
  AdminJob,
  EventMode,
  EventType,
  JobKind,
  Verification,
  WorkMode,
} from '@/types';

type Form = {
  title: string;
  organiser: string;
  description: string;
  eligibility: string;
  eligibleYears: number[];
  skillIds: string[];
  trackIds: string[];
  effort: string;
  url: string;
  verification: Verification;
  // Event
  type: EventType;
  eventMode: EventMode;
  location: string;
  startsOn: string;
  endsOn: string;
  time: string;
  registerBy: string;
  capacity: string;
  // Job
  kind: JobKind;
  workMode: WorkMode;
  compensation: string;
  duration: string;
  deadline: string;
  niceSkillIds: string[];
};

const BLANK: Form = {
  title: '',
  organiser: '',
  description: '',
  eligibility: '',
  eligibleYears: [],
  skillIds: [],
  trackIds: [],
  effort: '',
  url: '',
  verification: 'college',
  type: 'workshop',
  eventMode: 'in-person',
  location: '',
  startsOn: '',
  endsOn: '',
  time: '',
  registerBy: '',
  capacity: '',
  kind: 'internship',
  workMode: 'onsite',
  compensation: '',
  duration: '',
  deadline: '',
  niceSkillIds: [],
};

const SOURCES: { value: Verification; label: string; hint: string }[] = [
  {
    value: 'college',
    label: 'College-posted',
    hint: 'The college itself, a department or a club.',
  },
  { value: 'partner', label: 'Partner-posted', hint: 'An organisation the college works with.' },
  {
    value: 'external',
    label: 'Unverified external link',
    hint: 'Found elsewhere; nobody here vouches for it.',
  },
];

function fromEvent(row: AdminEvent): Form {
  return {
    ...BLANK,
    title: row.title,
    organiser: row.organiser,
    description: row.description,
    eligibility: row.eligibility,
    eligibleYears: row.eligibleYears,
    skillIds: row.skillIds,
    trackIds: row.trackIds,
    effort: row.effort,
    url: row.url ?? '',
    verification: row.verification,
    type: row.type,
    eventMode: row.mode,
    location: row.location,
    startsOn: row.startsOn,
    endsOn: row.endsOn ?? '',
    time: row.time,
    registerBy: row.registerBy ?? '',
    capacity: row.capacity === null ? '' : String(row.capacity),
  };
}

function fromJob(row: AdminJob): Form {
  return {
    ...BLANK,
    title: row.title,
    organiser: row.organiser,
    description: row.description,
    eligibility: row.eligibility,
    eligibleYears: row.eligibleYears,
    skillIds: row.skillIds,
    trackIds: row.trackIds,
    effort: row.effort,
    url: row.url ?? '',
    verification: row.verification,
    kind: row.kind,
    workMode: row.mode,
    location: row.location,
    compensation: row.compensation,
    duration: row.duration,
    deadline: row.deadline ?? '',
    niceSkillIds: row.niceSkillIds,
  };
}

/** Publish a new listing, or edit one — including checking a student's share. */
export default function ListingFormPage({ kind }: { kind: 'event' | 'job' }) {
  const { id } = useParams();
  const editing = id !== undefined;
  const plural = kind === 'event' ? 'events' : 'jobs';
  const navigate = useNavigate();
  const { catalog } = useCatalog();
  const existing = useApi<AdminEvent | AdminJob>(editing ? `/api/admin/${plural}/${id}` : null);
  const [form, setForm] = useState<Form>(BLANK);

  useEffect(() => {
    if (!existing.data) return;
    setForm(
      kind === 'event'
        ? fromEvent(existing.data as AdminEvent)
        : fromJob(existing.data as AdminJob),
    );
  }, [existing.data, kind]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const save = useAction(async () => {
    const common = {
      title: form.title,
      organiser: form.organiser,
      description: form.description,
      eligibility: form.eligibility,
      eligibleYears: form.eligibleYears,
      skillIds: form.skillIds,
      trackIds: form.trackIds,
      effort: form.effort,
      url: form.url.trim() || null,
      verification: form.verification,
    };
    const body =
      kind === 'event'
        ? {
            ...common,
            type: form.type,
            mode: form.eventMode,
            location: form.location,
            startsOn: form.startsOn,
            endsOn: form.endsOn || null,
            time: form.time,
            registerBy: form.registerBy || null,
            capacity: form.capacity ? Number(form.capacity) : null,
          }
        : {
            ...common,
            kind: form.kind,
            mode: form.workMode,
            location: form.location,
            compensation: form.compensation,
            duration: form.duration,
            deadline: form.deadline || null,
            niceSkillIds: form.niceSkillIds,
          };

    if (editing) await api.put(`/api/admin/${plural}/${id}`, body);
    else await api.post(`/api/admin/${plural}`, body);
    navigate(`/admin/${plural}`);
  });

  if (editing && existing.loading && !existing.data) return <Loading variant="page" />;
  if (editing && existing.error)
    return <ErrorMessage message={existing.error} onRetry={existing.reload} />;

  const shared = existing.data?.verification === 'student';
  const isEvent = kind === 'event';

  return (
    <>
      <Link
        to={`/admin/${plural}`}
        className="kicker inline-flex items-center gap-2 text-ink-500 hover:text-ink-900"
      >
        <Icon name="arrowLeft" className="size-4" />
        {isEvent ? 'Events' : 'Jobs'}
      </Link>

      <PageHeader
        eyebrow="Moderation"
        title={
          editing
            ? `Edit “${existing.data?.title ?? ''}”`
            : isEvent
              ? 'Publish an event'
              : 'Publish an opening'
        }
        description={
          editing
            ? 'Changes apply straight away and are recorded in the moderation log.'
            : 'It goes live as soon as you save, and students it fits well are notified — respecting their settings.'
        }
      />

      {shared && existing.data && (
        <Notice
          tone="info"
          title={`Shared by ${existing.data.sharedBy ?? 'a student'}`}
          className="mb-8 max-w-3xl"
        >
          Its label stays “Student-shared”. Check the source before approving:{' '}
          {existing.data.url ? (
            <ExternalLink href={existing.data.url}>{existing.data.url}</ExternalLink>
          ) : (
            'no link given.'
          )}
        </Notice>
      )}

      <form
        className="max-w-3xl space-y-12"
        onSubmit={(event) => {
          event.preventDefault();
          void save.run();
        }}
      >
        <section className="space-y-7">
          <SectionHeading title="What it is" />
          <Field id="title" label="Title">
            <TextInput
              id="title"
              value={form.title}
              onChange={(event) => set('title', event.target.value)}
              required
              minLength={3}
              maxLength={120}
            />
          </Field>
          <div className="grid gap-7 sm:grid-cols-2">
            <Field id="organiser" label={isEvent ? 'Organised by' : 'Company or organisation'}>
              <TextInput
                id="organiser"
                value={form.organiser}
                onChange={(event) => set('organiser', event.target.value)}
                required
                minLength={2}
                maxLength={100}
              />
            </Field>
            {isEvent ? (
              <Field id="type" label="Kind">
                <Select
                  id="type"
                  value={form.type}
                  onChange={(event) => set('type', event.target.value as EventType)}
                >
                  {(Object.keys(EVENT_TYPE_LABEL) as EventType[]).map((option) => (
                    <option key={option} value={option}>
                      {EVENT_TYPE_LABEL[option]}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : (
              <Field id="kind" label="Kind">
                <Select
                  id="kind"
                  value={form.kind}
                  onChange={(event) => set('kind', event.target.value as JobKind)}
                >
                  {(Object.keys(JOB_KIND_LABEL) as JobKind[]).map((option) => (
                    <option key={option} value={option}>
                      {JOB_KIND_LABEL[option]}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>
          <Field id="description" label="Description">
            <TextArea
              id="description"
              value={form.description}
              onChange={(event) => set('description', event.target.value)}
              required
              minLength={20}
              maxLength={2000}
              rows={5}
            />
          </Field>
        </section>

        <section className="space-y-7">
          <SectionHeading title={isEvent ? 'When and where' : 'The role'} />
          {isEvent ? (
            <div className="grid gap-7 sm:grid-cols-2">
              <Field id="mode" label="Format">
                <Select
                  id="mode"
                  value={form.eventMode}
                  onChange={(event) => set('eventMode', event.target.value as EventMode)}
                >
                  {(Object.keys(EVENT_MODE_LABEL) as EventMode[]).map((option) => (
                    <option key={option} value={option}>
                      {EVENT_MODE_LABEL[option]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field id="location" label="Where">
                <TextInput
                  id="location"
                  value={form.location}
                  onChange={(event) => set('location', event.target.value)}
                  required
                  minLength={2}
                />
              </Field>
              <Field id="starts" label="Starts">
                <TextInput
                  id="starts"
                  type="date"
                  value={form.startsOn}
                  onChange={(event) => set('startsOn', event.target.value)}
                  required
                />
              </Field>
              <Field id="ends" label="Ends (optional)">
                <TextInput
                  id="ends"
                  type="date"
                  min={form.startsOn || undefined}
                  value={form.endsOn}
                  onChange={(event) => set('endsOn', event.target.value)}
                />
              </Field>
              <Field id="time" label="Time">
                <TextInput
                  id="time"
                  value={form.time}
                  onChange={(event) => set('time', event.target.value)}
                  placeholder="14:00 – 17:00"
                  maxLength={60}
                />
              </Field>
              <Field id="register" label="Register by (optional)">
                <TextInput
                  id="register"
                  type="date"
                  max={form.endsOn || form.startsOn || undefined}
                  value={form.registerBy}
                  onChange={(event) => set('registerBy', event.target.value)}
                />
              </Field>
              <Field id="capacity" label="Places (optional)">
                <TextInput
                  id="capacity"
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(event) => set('capacity', event.target.value)}
                />
              </Field>
              <Field id="effort" label="Effort">
                <TextInput
                  id="effort"
                  value={form.effort}
                  onChange={(event) => set('effort', event.target.value)}
                  placeholder="3 hours · bring a laptop"
                  maxLength={80}
                />
              </Field>
            </div>
          ) : (
            <div className="grid gap-7 sm:grid-cols-2">
              <Field id="workmode" label="Where the work happens">
                <Select
                  id="workmode"
                  value={form.workMode}
                  onChange={(event) => set('workMode', event.target.value as WorkMode)}
                >
                  {(Object.keys(WORK_MODE_LABEL) as WorkMode[]).map((option) => (
                    <option key={option} value={option}>
                      {WORK_MODE_LABEL[option]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field id="location" label="Location">
                <TextInput
                  id="location"
                  value={form.location}
                  onChange={(event) => set('location', event.target.value)}
                  required
                  minLength={2}
                />
              </Field>
              <Field id="pay" label="Pay">
                <TextInput
                  id="pay"
                  value={form.compensation}
                  onChange={(event) => set('compensation', event.target.value)}
                  placeholder="₹25,000 / month"
                  maxLength={80}
                />
              </Field>
              <Field id="duration" label="Duration">
                <TextInput
                  id="duration"
                  value={form.duration}
                  onChange={(event) => set('duration', event.target.value)}
                  placeholder="6 months"
                  maxLength={80}
                />
              </Field>
              <Field id="deadline" label="Apply by">
                <TextInput
                  id="deadline"
                  type="date"
                  value={form.deadline}
                  onChange={(event) => set('deadline', event.target.value)}
                />
              </Field>
              <Field id="effort" label="Commitment">
                <TextInput
                  id="effort"
                  value={form.effort}
                  onChange={(event) => set('effort', event.target.value)}
                  placeholder="Full-time"
                  maxLength={80}
                />
              </Field>
            </div>
          )}
        </section>

        <section className="space-y-7">
          <SectionHeading title="Who it’s for" note="Drives matching and who gets notified" />
          <Field id="skills" label="Skills it asks for">
            <SkillPicker
              id="skills"
              value={form.skillIds}
              onChange={(next) => set('skillIds', next)}
              exclude={form.niceSkillIds}
            />
          </Field>
          {!isEvent && (
            <Field id="nice" label="Nice to have">
              <SkillPicker
                id="nice"
                value={form.niceSkillIds}
                onChange={(next) => set('niceSkillIds', next)}
                exclude={form.skillIds}
              />
            </Field>
          )}
          <div>
            <p className="kicker text-ink-500">Goals it suits</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {catalog?.tracks.map((track) => (
                <Chip
                  key={track.id}
                  active={form.trackIds.includes(track.id)}
                  onClick={() =>
                    set(
                      'trackIds',
                      form.trackIds.includes(track.id)
                        ? form.trackIds.filter((entry) => entry !== track.id)
                        : [...form.trackIds, track.id],
                    )
                  }
                >
                  {track.name}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="kicker text-ink-500">Open to years (none selected = everyone)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[1, 2, 3, 4].map((year) => (
                <Chip
                  key={year}
                  active={form.eligibleYears.includes(year)}
                  onClick={() =>
                    set(
                      'eligibleYears',
                      form.eligibleYears.includes(year)
                        ? form.eligibleYears.filter((entry) => entry !== year)
                        : [...form.eligibleYears, year].sort(),
                    )
                  }
                >
                  Year {year}
                </Chip>
              ))}
            </div>
          </div>
          <Field id="eligibility" label="Eligibility, in words">
            <TextInput
              id="eligibility"
              value={form.eligibility}
              onChange={(event) => set('eligibility', event.target.value)}
              maxLength={300}
            />
          </Field>
        </section>

        <section className="space-y-7">
          <SectionHeading title="Source" note="Students see this label on the listing" />
          {shared ? (
            <p className="text-sm text-ink-700">Student-shared — the label stays as it is.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Source">
              {SOURCES.map((source) => (
                <label
                  key={source.value}
                  className={`flex cursor-pointer flex-col border px-4 py-3 transition ${form.verification === source.value ? 'border-brand-600 bg-brand-50' : 'border-ink-300 bg-white hover:border-ink-500'}`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="source"
                      checked={form.verification === source.value}
                      onChange={() => set('verification', source.value)}
                      className="accent-brand-600"
                    />
                    <span className="text-sm text-ink-900">{source.label}</span>
                  </span>
                  <span className="mt-1 text-xs text-ink-500">{source.hint}</span>
                </label>
              ))}
            </div>
          )}
          <Field
            id="url"
            label={isEvent ? 'Registration or info link' : 'Application link'}
            help="Leave empty when registration is through the college."
          >
            <TextInput
              id="url"
              type="url"
              value={form.url}
              onChange={(event) => set('url', event.target.value)}
              placeholder="https://…"
            />
          </Field>
        </section>

        {save.error && <ErrorMessage title="Couldn’t save" message={save.error} />}

        <div className="border-t border-ink-300 pt-6">
          <Button type="submit" disabled={save.pending}>
            {save.pending ? 'Saving…' : editing ? 'Save changes' : 'Publish'}
          </Button>
        </div>
      </form>
    </>
  );
}
