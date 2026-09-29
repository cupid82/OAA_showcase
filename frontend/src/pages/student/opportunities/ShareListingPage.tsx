import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Field, Select, TextArea, TextInput } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkillPicker } from '@/components/ui/SkillPicker';
import { Chip } from '@/components/ui/Tabs';
import { api } from '@/lib/api';
import { todayISO } from '@/lib/format';
import { EVENT_MODE_LABEL, EVENT_TYPE_LABEL, JOB_KIND_LABEL, WORK_MODE_LABEL } from '@/lib/labels';
import { useAction } from '@/lib/useAction';
import type { EventMode, EventType, JobKind, WorkMode } from '@/types';

/**
 * A student shares something they found. It is stored as pending, labelled
 * "student-shared", and stays invisible to everyone else until a moderator has
 * checked it. A source link is required so there is something to check.
 */
export default function ShareListingPage({ kind }: { kind: 'event' | 'job' }) {
  const navigate = useNavigate();
  const isEvent = kind === 'event';

  const [title, setTitle] = useState('');
  const [organiser, setOrganiser] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [eligibility, setEligibility] = useState('');
  const [years, setYears] = useState<number[]>([]);
  const [effort, setEffort] = useState('');

  const [type, setType] = useState<EventType>('hackathon');
  const [eventMode, setEventMode] = useState<EventMode>('online');
  const [location, setLocation] = useState('');
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [time, setTime] = useState('');
  const [registerBy, setRegisterBy] = useState('');

  const [jobKind, setJobKind] = useState<JobKind>('internship');
  const [workMode, setWorkMode] = useState<WorkMode>('remote');
  const [compensation, setCompensation] = useState('');
  const [duration, setDuration] = useState('');
  const [deadline, setDeadline] = useState('');

  const share = useAction(async () => {
    const common = {
      title,
      organiser,
      url,
      description,
      skillIds,
      eligibility,
      eligibleYears: years,
      effort,
    };
    const body = isEvent
      ? {
          ...common,
          type,
          mode: eventMode,
          location,
          startsOn,
          endsOn: endsOn || null,
          time,
          registerBy: registerBy || null,
        }
      : {
          ...common,
          kind: jobKind,
          mode: workMode,
          location,
          compensation,
          duration,
          deadline: deadline || null,
          niceSkillIds: [],
        };
    const { data } = await api.post<{ data: { id: string } }>(
      isEvent ? '/api/events' : '/api/jobs',
      body,
    );
    navigate(`/student/${isEvent ? 'events' : 'jobs'}/${data.id}`);
  });

  const back = isEvent ? '/student/events' : '/student/jobs';

  return (
    <>
      <Link
        to={back}
        className="kicker inline-flex items-center gap-2 text-ink-500 hover:text-ink-900"
      >
        <Icon name="arrowLeft" className="size-4" />
        {isEvent ? 'Events' : 'Jobs'}
      </Link>

      <PageHeader
        eyebrow={isEvent ? 'Events' : 'Jobs'}
        title={isEvent ? 'Share an event you found' : 'Share an opening you found'}
        description="Found something worth passing on? Share it. A moderator checks the link first; once it’s live it’s labelled student-shared, so nobody mistakes it for a college posting."
      />

      <form
        className="max-w-3xl space-y-8"
        onSubmit={(event) => {
          event.preventDefault();
          void share.run();
        }}
      >
        <Notice tone="info" title="Before you share">
          Only share things you found in a public place. Never paste anything that asks people for
          payment or passwords.
        </Notice>

        <div className="grid gap-8 sm:grid-cols-2">
          <Field id="title" label="Title" className="sm:col-span-2">
            <TextInput
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              minLength={3}
              maxLength={120}
            />
          </Field>
          <Field id="organiser" label={isEvent ? 'Organised by' : 'Company or organisation'}>
            <TextInput
              id="organiser"
              value={organiser}
              onChange={(event) => setOrganiser(event.target.value)}
              required
              minLength={2}
              maxLength={100}
            />
          </Field>
          <Field
            id="url"
            label="Source link"
            help="Where you found it — the moderator checks this."
          >
            <TextInput
              id="url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              required
              placeholder="https://…"
            />
          </Field>
        </div>

        {isEvent ? (
          <>
            <div>
              <p className="kicker text-ink-500">Kind of event</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(Object.keys(EVENT_TYPE_LABEL) as EventType[]).map((option) => (
                  <Chip key={option} active={type === option} onClick={() => setType(option)}>
                    {EVENT_TYPE_LABEL[option]}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="grid gap-8 sm:grid-cols-2">
              <Field id="mode" label="Format">
                <Select
                  id="mode"
                  value={eventMode}
                  onChange={(event) => setEventMode(event.target.value as EventMode)}
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
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  required
                  minLength={2}
                  placeholder="Online, or the venue"
                />
              </Field>
              <Field id="starts" label="Starts">
                <TextInput
                  id="starts"
                  type="date"
                  min={todayISO()}
                  value={startsOn}
                  onChange={(event) => setStartsOn(event.target.value)}
                  required
                />
              </Field>
              <Field id="ends" label="Ends (optional)">
                <TextInput
                  id="ends"
                  type="date"
                  min={startsOn || todayISO()}
                  value={endsOn}
                  onChange={(event) => setEndsOn(event.target.value)}
                />
              </Field>
              <Field id="time" label="Time (optional)">
                <TextInput
                  id="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  placeholder="10:00 – 13:00"
                  maxLength={60}
                />
              </Field>
              <Field id="register" label="Register by (optional)">
                <TextInput
                  id="register"
                  type="date"
                  min={todayISO()}
                  max={endsOn || startsOn || undefined}
                  value={registerBy}
                  onChange={(event) => setRegisterBy(event.target.value)}
                />
              </Field>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="kicker text-ink-500">Kind of opening</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(Object.keys(JOB_KIND_LABEL) as JobKind[]).map((option) => (
                  <Chip key={option} active={jobKind === option} onClick={() => setJobKind(option)}>
                    {JOB_KIND_LABEL[option]}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="grid gap-8 sm:grid-cols-2">
              <Field id="workmode" label="Where the work happens">
                <Select
                  id="workmode"
                  value={workMode}
                  onChange={(event) => setWorkMode(event.target.value as WorkMode)}
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
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  required
                  minLength={2}
                  placeholder="Remote, or the city"
                />
              </Field>
              <Field id="pay" label="Pay (optional)">
                <TextInput
                  id="pay"
                  value={compensation}
                  onChange={(event) => setCompensation(event.target.value)}
                  placeholder="₹20,000 / month"
                  maxLength={80}
                />
              </Field>
              <Field id="duration" label="Duration (optional)">
                <TextInput
                  id="duration"
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                  placeholder="3 months"
                  maxLength={80}
                />
              </Field>
              <Field id="deadline" label="Apply by (optional)">
                <TextInput
                  id="deadline"
                  type="date"
                  min={todayISO()}
                  value={deadline}
                  onChange={(event) => setDeadline(event.target.value)}
                />
              </Field>
            </div>
          </>
        )}

        <Field
          id="description"
          label="What is it?"
          help="A sentence or two in your own words — what it is and who it’s for."
        >
          <TextArea
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
            minLength={20}
            maxLength={2000}
            rows={4}
          />
        </Field>

        <Field id="skills" label="Skills it asks for" help="These drive who it gets suggested to.">
          <SkillPicker id="skills" value={skillIds} onChange={setSkillIds} />
        </Field>

        <div className="grid gap-8 sm:grid-cols-2">
          <Field id="effort" label="Expected effort (optional)">
            <TextInput
              id="effort"
              value={effort}
              onChange={(event) => setEffort(event.target.value)}
              placeholder={isEvent ? 'One weekend' : '20 hours a week'}
              maxLength={80}
            />
          </Field>
          <Field id="eligibility" label="Who can apply (optional)">
            <TextInput
              id="eligibility"
              value={eligibility}
              onChange={(event) => setEligibility(event.target.value)}
              placeholder="Any year"
              maxLength={300}
            />
          </Field>
        </div>

        <div>
          <p className="kicker text-ink-500">Open to years (leave empty for everyone)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((year) => (
              <Chip
                key={year}
                active={years.includes(year)}
                onClick={() =>
                  setYears((current) =>
                    current.includes(year)
                      ? current.filter((entry) => entry !== year)
                      : [...current, year].sort(),
                  )
                }
              >
                Year {year}
              </Chip>
            ))}
          </div>
        </div>

        {share.error && <ErrorMessage title="Couldn’t share it" message={share.error} />}

        <div className="border-t border-ink-300 pt-6">
          <Button type="submit" disabled={share.pending}>
            <Icon name="send" className="size-4" />
            {share.pending ? 'Sending…' : 'Send for review'}
          </Button>
        </div>
      </form>
    </>
  );
}
