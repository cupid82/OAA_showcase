import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { ExternalLink, SectionHeading } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Checkbox, Field, Select, TextArea, TextInput } from '@/components/ui/Field';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { Chip } from '@/components/ui/Tabs';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { timeAgo, yearLabel } from '@/lib/format';
import { CATEGORY_LABEL, INTERESTS, INTEREST_LABEL } from '@/lib/labels';
import { useAction } from '@/lib/useAction';
import { useApi } from '@/lib/useApi';
import { useCatalog } from '@/lib/useShared';
import type { Interest, Me, NotificationCategory } from '@/types';

const HOURS = [2, 4, 6, 8, 10, 15, 20];

/**
 * Scrolls to `#section` once the page has something to scroll to. Instant, not
 * smooth: arriving at a link should land there, not animate down from the top.
 */
function useHashScroll(ready: boolean) {
  const { hash } = useLocation();
  useEffect(() => {
    if (!ready || !hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [hash, ready]);
}

export default function SettingsPage() {
  const { data, error, loading, reload, setData } = useApi<Me>('/api/me');
  const [notice, setNotice] = useState<string | null>(null);
  useHashScroll(data !== null);

  const save = useAction(async (path: string, body: object, message: string) => {
    const { data: next } = await api.patch<{ data: Me }>(`/api/me/${path}`, body);
    setData(next);
    setNotice(message);
  });

  if (loading && !data) return <Loading variant="page" />;
  if (error && !data) return <ErrorMessage message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="You, your goal, your privacy"
        description="Everything you answered when you joined can be changed here — and nothing about you is public unless you switch it on."
      />

      {/* Sticky, so a save lower down the page is still confirmed where you are. */}
      <div className="sticky top-16 z-10 -mx-4 space-y-3 bg-ink-50/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        {notice && (
          <Notice tone="success" onDismiss={() => setNotice(null)}>
            {notice}
          </Notice>
        )}
        {save.error && <ErrorMessage message={save.error} />}
      </div>

      <div className="max-w-3xl space-y-16 pt-6">
        <Profile me={data} run={save.run} pending={save.pending} />
        <Goal me={data} run={save.run} pending={save.pending} />
        <Privacy me={data} run={save.run} pending={save.pending} />
        <Notifications me={data} run={save.run} pending={save.pending} />

        <section>
          <SectionHeading title="Connected apps" />
          <p className="text-sm text-ink-600">
            GitHub, LinkedIn, X and the rest are managed on their own page.{' '}
            <Link to="/student/connections" className="text-brand-700 underline underline-offset-4">
              Open connected apps
            </Link>
          </p>
        </section>
      </div>
    </>
  );
}

type Run = (path: string, body: object, message: string) => Promise<void | undefined>;

function Section({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-32">
      <SectionHeading id={`${id}-heading`} title={title} note={note} />
      {children}
    </section>
  );
}

function Profile({ me, run, pending }: { me: Me; run: Run; pending: boolean }) {
  const [handle, setHandle] = useState(me.profile.handle);
  const [headline, setHeadline] = useState(me.profile.headline);
  const [bio, setBio] = useState(me.profile.bio);

  return (
    <Section id="profile" title="Profile">
      <div className="border border-ink-300 bg-white px-5 py-5">
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-4">
          <ReadOnly label="Name">{me.profile.name}</ReadOnly>
          <ReadOnly label="Roll number">
            <span className="font-mono">{me.profile.rollNo}</span>
          </ReadOnly>
          <ReadOnly label="Department">{me.profile.department}</ReadOnly>
          <ReadOnly label="Year">{yearLabel(me.profile.year)}</ReadOnly>
        </dl>
        <p className="mt-4 border-t border-ink-200 pt-3 text-xs text-ink-500">
          From {me.records.source}, synced {timeAgo(me.records.syncedAt)}. OAA only reads these — to
          change them, <ExternalLink href={me.records.url}>open {me.records.source}</ExternalLink>.
        </p>
      </div>

      <form
        className="mt-8 space-y-7"
        onSubmit={(event) => {
          event.preventDefault();
          void run('profile', { handle, headline, bio }, 'Profile saved.');
        }}
      >
        <Field
          id="handle"
          label="Portfolio address"
          help={`Your public page lives at /p/${handle || '…'} — whether anyone can see it is set under Privacy.`}
        >
          <div className="flex items-baseline">
            <span className="font-mono text-sm text-ink-500">/p/</span>
            <TextInput
              id="handle"
              value={handle}
              onChange={(event) => setHandle(event.target.value.toLowerCase())}
              required
              minLength={3}
              maxLength={30}
              pattern="[a-z0-9][a-z0-9-]{1,28}[a-z0-9]"
              className="font-mono"
            />
          </div>
        </Field>
        <Field id="headline" label="Headline" hint={`${headline.length}/120`}>
          <TextInput
            id="headline"
            value={headline}
            onChange={(event) => setHeadline(event.target.value)}
            maxLength={120}
            placeholder="Full-stack student developer — I build things people on campus use."
          />
        </Field>
        <Field id="bio" label="About you" hint={`${bio.length}/600`}>
          <TextArea
            id="bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            maxLength={600}
            rows={4}
          />
        </Field>
        <Button type="submit" disabled={pending}>
          Save profile
        </Button>
      </form>
    </Section>
  );
}

function ReadOnly({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="kicker text-ink-500">{label}</dt>
      <dd className="mt-1 text-sm text-ink-900">{children}</dd>
    </div>
  );
}

function Goal({ me, run, pending }: { me: Me; run: Run; pending: boolean }) {
  const { catalog } = useCatalog();
  const [trackId, setTrackId] = useState(me.profile.trackId ?? '');
  const [interests, setInterests] = useState<Interest[]>(me.profile.interests);
  const [hours, setHours] = useState(me.profile.weeklyHours ?? 6);

  return (
    <Section id="goal" title="Goal & interests">
      <form
        className="space-y-8"
        onSubmit={(event) => {
          event.preventDefault();
          void run(
            'goal',
            { trackId, interests, weeklyHours: hours },
            'Goal saved. Suggestions will follow it from now on.',
          );
        }}
      >
        <Field id="track" label="Working towards">
          <Select
            id="track"
            value={trackId}
            onChange={(event) => setTrackId(event.target.value)}
            required
          >
            <option value="" disabled>
              Choose a goal
            </option>
            {catalog?.tracks.map((track) => (
              <option key={track.id} value={track.id}>
                {track.name}
              </option>
            ))}
          </Select>
          {trackId && (
            <p className="mt-2 text-sm text-ink-600">
              {catalog?.tracks.find((track) => track.id === trackId)?.summary}
            </p>
          )}
        </Field>

        <div>
          <p className="kicker text-ink-500">Looking for</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {INTERESTS.map((interest) => (
              <Chip
                key={interest}
                active={interests.includes(interest)}
                onClick={() =>
                  setInterests((current) =>
                    current.includes(interest)
                      ? current.filter((entry) => entry !== interest)
                      : [...current, interest],
                  )
                }
              >
                {INTEREST_LABEL[interest]}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <p className="kicker text-ink-500">Hours a week for projects and learning</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {HOURS.map((value) => (
              <Chip key={value} active={hours === value} onClick={() => setHours(value)}>
                {value} h
              </Chip>
            ))}
          </div>
        </div>

        <Button type="submit" disabled={pending || !trackId}>
          Save goal
        </Button>
      </form>
    </Section>
  );
}

function preferencesBody(me: Me, change: Partial<Me['preferences']>) {
  const next = { ...me.preferences, ...change };
  return {
    notify: next.notify,
    emailDigest: next.emailDigest,
    leaderboardVisible: next.leaderboardVisible,
    portfolioPublic: next.portfolioPublic,
  };
}

function Privacy({ me, run, pending }: { me: Me; run: Run; pending: boolean }) {
  const prefs = me.preferences;
  return (
    <Section id="privacy" title="Privacy" note="Changes save straight away">
      <div className="space-y-6">
        <Toggle
          id="leaderboard"
          checked={prefs.leaderboardVisible}
          disabled={pending}
          onChange={(checked) =>
            void run(
              'preferences',
              preferencesBody(me, { leaderboardVisible: checked }),
              checked
                ? 'You’re on the leaderboard.'
                : 'You’re off the leaderboard. You still see where you’d be.',
            )
          }
          label="Show me on the leaderboard"
          description="Other students see your name and momentum points. Off: you’re left out entirely, not anonymised."
        />
        <Toggle
          id="portfolio"
          checked={prefs.portfolioPublic}
          disabled={pending}
          onChange={(checked) =>
            void run(
              'preferences',
              preferencesBody(me, { portfolioPublic: checked }),
              checked ? 'Your portfolio is public.' : 'Your portfolio is private again.',
            )
          }
          label="Public portfolio"
          description={
            <>
              Shows only projects you mark public, skills your work proves, certificates you tick,
              and links you choose.{' '}
              {prefs.portfolioPublic && (
                <Link
                  to={`/p/${me.profile.handle}`}
                  className="text-brand-700 underline underline-offset-4"
                >
                  View it
                </Link>
              )}
            </>
          }
        />
        <p className="text-xs text-ink-500">
          Never shared with anyone, including moderators: your check-ins, your applications and
          notes, and private projects.
        </p>
      </div>
    </Section>
  );
}

function Notifications({ me, run, pending }: { me: Me; run: Run; pending: boolean }) {
  const prefs = me.preferences;
  const categories = Object.keys(CATEGORY_LABEL) as NotificationCategory[];

  return (
    <Section id="notifications" title="Notifications" note="Changes save straight away">
      <p className="mb-5 text-sm text-ink-600">
        Your inbox (the bell, top right) is the record of what needs doing. Switch a category off
        and those notifications are never created.
      </p>
      <div className="space-y-5">
        {categories.map((category) => (
          <Checkbox
            key={category}
            id={`notify-${category}`}
            checked={prefs.notify[category]}
            disabled={pending}
            onChange={(checked) =>
              void run(
                'preferences',
                preferencesBody(me, { notify: { ...prefs.notify, [category]: checked } }),
                `${CATEGORY_LABEL[category].label}: ${checked ? 'on' : 'off'}.`,
              )
            }
            label={CATEGORY_LABEL[category].label}
            description={CATEGORY_LABEL[category].hint}
          />
        ))}
      </div>

      <div className="mt-8 border-t border-ink-200 pt-6">
        <p className="kicker text-ink-500">Email</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(['off', 'weekly'] as const).map((option) => (
            <Chip
              key={option}
              active={prefs.emailDigest === option}
              onClick={() =>
                void run(
                  'preferences',
                  preferencesBody(me, { emailDigest: option }),
                  option === 'weekly' ? 'Weekly digest chosen.' : 'No email.',
                )
              }
            >
              {option === 'off' ? 'No email' : 'Weekly digest'}
            </Chip>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-500">
          OAA doesn’t send email yet — this saves your choice for when it does. A digest never puts
          anything sensitive in the subject line.
        </p>
      </div>
    </Section>
  );
}

function Toggle({
  id,
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-6 border border-ink-300 bg-white px-5 py-4">
      <div>
        <label htmlFor={id} className="text-ink-900">
          {label}
        </label>
        <p className="mt-1 text-sm text-ink-600">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-1 h-6 w-11 shrink-0 border transition disabled:opacity-50',
          checked ? 'border-brand-600 bg-brand-600' : 'border-ink-300 bg-ink-100',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-4.5 bg-white shadow-sm transition-all',
            checked ? 'left-[calc(100%-1.25rem)]' : 'left-0.5',
          )}
        />
        <span className="sr-only">{checked ? 'On' : 'Off'}</span>
      </button>
    </div>
  );
}
