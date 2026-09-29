import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Field, TextInput } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Loading } from '@/components/ui/Loading';
import { SkillPicker } from '@/components/ui/SkillPicker';
import { Chip } from '@/components/ui/Tabs';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { INTERESTS, INTEREST_LABEL, LEVEL_LABEL } from '@/lib/labels';
import { useAction } from '@/lib/useAction';
import { useApi } from '@/lib/useApi';
import { useCatalog } from '@/lib/useShared';
import type { Interest, Me, SkillLevel } from '@/types';

const STEPS = ['Your goal', 'Your skills', 'What you’re after', 'Privacy', 'Connect'] as const;
const LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced'];
const HOURS = [2, 4, 6, 8, 10, 15, 20];

/**
 * First sign-in. Five short steps that give the rest of the app something to
 * work with — and every answer can be changed later in Settings, which the page
 * says up front so nobody agonises over a choice.
 */
export default function OnboardingPage() {
  const me = useApi<Me>('/api/me');
  const { catalog } = useCatalog();
  const { refresh, logout } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [skills, setSkills] = useState<Record<string, SkillLevel>>({});
  const [extra, setExtra] = useState<string[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [hours, setHours] = useState(6);
  const [leaderboardVisible, setLeaderboardVisible] = useState(false);
  const [portfolioPublic, setPortfolioPublic] = useState(false);
  const [emailDigest, setEmailDigest] = useState<'off' | 'weekly'>('off');
  const [github, setGithub] = useState('');
  const [linkedin, setLinkedin] = useState('');

  // Each step starts at the top — Continue sits at the bottom of a long step, and
  // the next step's heading should be the first thing seen, not its last field.
  // A block body on purpose: newer browsers return a Promise from scrollTo, and an
  // effect that returns anything but a cleanup function crashes React.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [step]);

  const track = catalog?.tracks.find((entry) => entry.id === trackId) ?? null;
  const skillName = useMemo(
    () => new Map(catalog?.skills.map((skill) => [skill.id, skill.name]) ?? []),
    [catalog],
  );

  const finish = useAction(async () => {
    await api.post('/api/me/onboarding', {
      trackId,
      interests,
      weeklyHours: hours,
      skills: Object.entries(skills).map(([skillId, level]) => ({ skillId, level })),
      emailDigest,
      leaderboardVisible,
      portfolioPublic,
      connections: [
        ...(github.trim() ? [{ provider: 'github', handle: github.trim() }] : []),
        ...(linkedin.trim() ? [{ provider: 'linkedin', handle: linkedin.trim() }] : []),
      ],
    });
    await refresh();
    navigate('/student', { replace: true });
  });

  if (me.loading || !catalog) return <Loading variant="page" label="Setting things up…" />;
  if (me.error || !me.data)
    return (
      <ErrorMessage message={me.error ?? 'Could not load your account.'} onRetry={me.reload} />
    );

  const firstName = me.data.profile.name.split(' ')[0];
  const canContinue = step === 0 ? trackId !== null : step === 2 ? interests.length > 0 : true;

  function setLevel(skillId: string, level: SkillLevel | null) {
    setSkills((current) => {
      const next = { ...current };
      if (level) next[skillId] = level;
      else delete next[skillId];
      return next;
    });
  }

  const trackSkillIds = track?.skillIds ?? [];
  const rows = [...trackSkillIds, ...extra.filter((id) => !trackSkillIds.includes(id))];

  return (
    <div className="relative isolate min-h-screen bg-ink-50">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-80 bg-linear-to-b from-brand-50 to-ink-50"
      />

      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 pt-8 sm:px-6">
        <span className="font-serif text-2xl text-ink-900">OAA</span>
        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/login', { replace: true });
          }}
          className="kicker text-ink-500 transition hover:text-ink-900"
        >
          Log out
        </button>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pt-10 pb-24 sm:px-6">
        <p className="kicker text-brand-700">
          Step {step + 1} of {STEPS.length} · {STEPS[step]}
        </p>
        <div className="mt-3 grid grid-cols-5 gap-1.5" aria-hidden="true">
          {STEPS.map((label, index) => (
            <span
              key={label}
              className={cn('h-1', index <= step ? 'bg-brand-600' : 'bg-ink-200')}
            />
          ))}
        </div>

        {step === 0 && (
          <StepBody
            title={`Welcome, ${firstName}. Where are you headed?`}
            lead="Pick the goal closest to what you want next. It decides which skills, projects and openings OAA puts in front of you. You can change it any time."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {catalog.tracks.map((option) => {
                const selected = option.id === trackId;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setTrackId(option.id)}
                    aria-pressed={selected}
                    className={cn(
                      'flex flex-col border px-5 py-4 text-left transition',
                      selected
                        ? 'border-brand-600 bg-brand-50 shadow-[inset_0_0_0_1px_var(--color-brand-600)]'
                        : 'border-ink-300 bg-white hover:border-ink-500',
                    )}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-serif text-xl text-ink-900">{option.name}</span>
                      {selected && <Icon name="check" className="size-5 text-brand-600" />}
                    </span>
                    <span className="mt-1.5 text-sm text-ink-600">{option.summary}</span>
                  </button>
                );
              })}
            </div>
          </StepBody>
        )}

        {step === 1 && (
          <StepBody
            title="What can you already do?"
            lead={`These are the skills on the ${track?.name ?? 'path you chose'} path. Mark the ones you have — honestly is fine, beginner counts. Proof comes later, from what you build.`}
          >
            <ul className="border-t border-ink-300">
              {rows.map((skillId) => (
                <li
                  key={skillId}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 py-3"
                >
                  <span className="text-ink-900">{skillName.get(skillId) ?? skillId}</span>
                  <div
                    className="flex flex-wrap gap-1.5"
                    role="group"
                    aria-label={`Your level in ${skillName.get(skillId) ?? skillId}`}
                  >
                    <LevelButton active={!skills[skillId]} onClick={() => setLevel(skillId, null)}>
                      Not yet
                    </LevelButton>
                    {LEVELS.map((level) => (
                      <LevelButton
                        key={level}
                        active={skills[skillId] === level}
                        onClick={() => setLevel(skillId, level)}
                      >
                        {LEVEL_LABEL[level]}
                      </LevelButton>
                    ))}
                  </div>
                </li>
              ))}
            </ul>

            <Field
              id="extra-skills"
              label="Anything else you know?"
              className="mt-8"
              help="Add skills outside your path — they appear above so you can set a level."
            >
              <SkillPicker
                id="extra-skills"
                value={extra}
                exclude={trackSkillIds}
                onChange={(next) => {
                  setExtra(next);
                  // A newly added extra skill starts at beginner; a removed one is dropped.
                  setSkills((current) => {
                    const updated: Record<string, SkillLevel> = {};
                    for (const [id, level] of Object.entries(current)) {
                      if (trackSkillIds.includes(id) || next.includes(id)) updated[id] = level;
                    }
                    for (const id of next) updated[id] ??= 'beginner';
                    return updated;
                  });
                }}
              />
            </Field>
          </StepBody>
        )}

        {step === 2 && (
          <StepBody
            title="What are you looking for?"
            lead="Pick everything that interests you. OAA uses this to decide what to suggest — and every suggestion will tell you why."
          >
            <div className="flex flex-wrap gap-2">
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

            <div className="mt-10">
              <p className="kicker text-ink-500">Hours a week for projects and learning</p>
              <p className="mt-1 text-sm text-ink-600">
                Outside classes. OAA compares this with what you take on, so it can tell you when
                you’re overcommitting.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {HOURS.map((value) => (
                  <Chip key={value} active={hours === value} onClick={() => setHours(value)}>
                    {value} h
                  </Chip>
                ))}
              </div>
            </div>
          </StepBody>
        )}

        {step === 3 && (
          <StepBody
            title="You decide what’s public."
            lead="Nothing about you is published unless you switch it on here. Both can be changed later."
          >
            <Choice
              legend="The leaderboard"
              description="It ranks momentum — projects shipped, skills proven, events attended. Never marks."
              options={[
                {
                  value: false,
                  label: 'Keep me off it',
                  hint: 'You still see where you would rank. Nobody else sees you.',
                },
                {
                  value: true,
                  label: 'Show my name',
                  hint: 'Other students see your name and points.',
                },
              ]}
              value={leaderboardVisible}
              onChange={setLeaderboardVisible}
            />
            <Choice
              legend="Public portfolio"
              description={`A page at /p/${me.data.profile.handle} showing only projects you mark public and skills your work proves.`}
              options={[
                {
                  value: false,
                  label: 'Not yet',
                  hint: 'The address shows nothing until you switch it on.',
                },
                {
                  value: true,
                  label: 'Switch it on',
                  hint: 'You can share the link with recruiters.',
                },
              ]}
              value={portfolioPublic}
              onChange={setPortfolioPublic}
            />
            <Choice
              legend="Email"
              description="Everything important is in your in-app inbox. Email is optional."
              options={[
                { value: 'off', label: 'No email', hint: 'The inbox is enough.' },
                {
                  value: 'weekly',
                  label: 'A weekly digest',
                  hint: 'One summary a week, nothing sensitive in the subject line.',
                },
              ]}
              value={emailDigest}
              onChange={setEmailDigest}
            />
          </StepBody>
        )}

        {step === 4 && (
          <StepBody
            title="Connect your accounts — or skip."
            lead="Optional. GitHub lets you import repositories as projects instead of typing them in. By adding a username you agree to OAA linking it to your profile; nothing is fetched until you press sync."
          >
            <div className="space-y-8">
              <Field
                id="github"
                label="GitHub username"
                help="For example: octocat — or paste your profile link."
              >
                <TextInput
                  id="github"
                  value={github}
                  onChange={(event) => setGithub(event.target.value)}
                  placeholder="your-username"
                  autoComplete="off"
                />
              </Field>
              <Field
                id="linkedin"
                label="LinkedIn profile"
                help="Your profile name or the full link."
              >
                <TextInput
                  id="linkedin"
                  value={linkedin}
                  onChange={(event) => setLinkedin(event.target.value)}
                  placeholder="https://www.linkedin.com/in/…"
                  autoComplete="off"
                />
              </Field>
            </div>
            <p className="mt-8 text-sm text-ink-500">
              X, LeetCode, Kaggle and the rest can be linked from{' '}
              <span className="text-ink-700">Connected apps</span> once you’re in.
            </p>
          </StepBody>
        )}

        {finish.error && (
          <ErrorMessage className="mt-8" title="Couldn’t finish" message={finish.error} />
        )}

        <div className="mt-12 flex items-center justify-between border-t border-ink-300 pt-6">
          {step > 0 ? (
            <Button variant="secondary" onClick={() => setStep((value) => value - 1)}>
              <Icon name="arrowLeft" className="size-4" />
              Back
            </Button>
          ) : (
            <Link to="/" className="kicker text-ink-500 hover:text-ink-900">
              Home page
            </Link>
          )}

          {step < STEPS.length - 1 ? (
            <Button disabled={!canContinue} onClick={() => setStep((value) => value + 1)}>
              Continue
              <Icon name="arrowRight" className="size-4" />
            </Button>
          ) : (
            <Button disabled={finish.pending} onClick={() => void finish.run()}>
              {finish.pending ? 'Setting up…' : 'Go to my dashboard'}
              {!finish.pending && <Icon name="arrowRight" className="size-4" />}
            </Button>
          )}
        </div>
        {step === 0 && !trackId && (
          <p className="mt-3 text-right text-xs text-ink-500">Pick a goal to continue.</p>
        )}
        {step === 2 && interests.length === 0 && (
          <p className="mt-3 text-right text-xs text-ink-500">Pick at least one to continue.</p>
        )}
      </main>
    </div>
  );
}

function StepBody({ title, lead, children }: { title: string; lead: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h1 className="font-serif text-4xl text-ink-900">{title}</h1>
      <p className="prose-measure mt-3 text-ink-600">{lead}</p>
      <div className="mt-10">{children}</div>
    </section>
  );
}

function LevelButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'border px-2.5 py-1 text-xs transition',
        active
          ? 'border-brand-600 bg-brand-600 text-white'
          : 'border-ink-300 bg-white text-ink-600 hover:border-ink-500',
      )}
    >
      {children}
    </button>
  );
}

function Choice<T extends string | boolean>({
  legend,
  description,
  options,
  value,
  onChange,
}: {
  legend: string;
  description: string;
  options: { value: T; label: string; hint: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="border-t border-ink-300 py-6 first:border-t-0 first:pt-0">
      <legend className="float-left w-full font-serif text-xl text-ink-900">{legend}</legend>
      <p className="clear-both pt-1 text-sm text-ink-600">{description}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <label
              key={String(option.value)}
              className={cn(
                'flex cursor-pointer gap-3 border px-4 py-3 transition',
                selected
                  ? 'border-brand-600 bg-brand-50'
                  : 'border-ink-300 bg-white hover:border-ink-500',
              )}
            >
              <input
                type="radio"
                name={legend}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="mt-1 accent-brand-600"
              />
              <span>
                <span className="block text-sm text-ink-900">{option.label}</span>
                <span className="mt-0.5 block text-xs text-ink-500">{option.hint}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
