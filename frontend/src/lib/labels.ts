/**
 * Every enum the API sends, in the words the UI uses. One place, so a project
 * cannot be "Shipped" on one screen and "Done" on another.
 */
import type {
  ApplicationStage,
  BurnoutLevel,
  EventMode,
  EventOutcome,
  EventType,
  Interest,
  JobKind,
  NotificationCategory,
  ParticipationStatus,
  ProjectStatus,
  ProofStage,
  SkillLevel,
  Visibility,
  WorkMode,
} from '@/types';

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  idea: 'Idea',
  building: 'Building',
  shipped: 'Shipped',
  paused: 'Paused',
};

export const VISIBILITY_LABEL: Record<Visibility, string> = {
  private: 'Private',
  campus: 'Campus',
  public: 'Public',
};

export const VISIBILITY_HINT: Record<Visibility, string> = {
  private: 'Only you and your team can see it.',
  campus: 'Any signed-in student can find it — needed to ask for collaborators.',
  public: 'Shown on your public portfolio too, if your portfolio is switched on.',
};

export const LEVEL_LABEL: Record<SkillLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export const PROOF_LABEL: Record<ProofStage, string> = {
  claimed: 'Claimed',
  practising: 'Practising',
  proven: 'Proven',
};

export const PROOF_HINT: Record<ProofStage, string> = {
  claimed: 'On your list, with nothing behind it yet.',
  practising: 'Used in a project you are building, at an event, or practised this month.',
  proven: 'Used in a shipped project that tells its story, or backed by a certificate.',
};

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  hackathon: 'Hackathon',
  workshop: 'Workshop',
  contest: 'Contest',
  talk: 'Talk',
  meetup: 'Meetup',
  bootcamp: 'Bootcamp',
};

export const EVENT_MODE_LABEL: Record<EventMode, string> = {
  'in-person': 'In person',
  online: 'Online',
  hybrid: 'Hybrid',
};

export const PARTICIPATION_LABEL: Record<ParticipationStatus, string> = {
  saved: 'Saved',
  registered: 'Registered',
  attended: 'Attended',
};

export const OUTCOME_LABEL: Record<EventOutcome, string> = {
  participated: 'Took part',
  finalist: 'Finalist',
  winner: 'Winner',
};

export const JOB_KIND_LABEL: Record<JobKind, string> = {
  internship: 'Internship',
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  fellowship: 'Fellowship',
  research: 'Research',
  'campus-drive': 'Campus drive',
};

export const WORK_MODE_LABEL: Record<WorkMode, string> = {
  onsite: 'On site',
  remote: 'Remote',
  hybrid: 'Hybrid',
};

export const STAGE_LABEL: Record<ApplicationStage, string> = {
  saved: 'Saved',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Not this time',
  withdrawn: 'Withdrawn',
};

/** The order the pipeline reads in, left to right. */
export const PIPELINE: ApplicationStage[] = ['saved', 'applied', 'interviewing', 'offer'];

export const INTEREST_LABEL: Record<Interest, string> = {
  internships: 'Internships',
  jobs: 'Full-time jobs',
  hackathons: 'Hackathons',
  workshops: 'Workshops & bootcamps',
  contests: 'Coding contests',
  meetups: 'Talks & meetups',
  research: 'Research',
  fellowships: 'Fellowships',
};

export const INTERESTS = Object.keys(INTEREST_LABEL) as Interest[];

export const CATEGORY_LABEL: Record<NotificationCategory, { label: string; hint: string }> = {
  opportunities: { label: 'Jobs & opportunities', hint: 'New matches and closing deadlines.' },
  events: { label: 'Events', hint: 'Registration deadlines and events you are going to.' },
  projects: { label: 'Projects', hint: 'Join requests and decisions on your teams.' },
  wellbeing: { label: 'Check-in reminders', hint: 'A weekly nudge to check in. Never more.' },
  reminders: { label: 'Milestones', hint: 'Milestones due today or tomorrow.' },
};

export const BURNOUT_LABEL: Record<BurnoutLevel, { label: string; summary: string }> = {
  steady: {
    label: 'Steady',
    summary: 'Your recent weeks look sustainable. Keep protecting what’s working.',
  },
  stretched: {
    label: 'Stretched',
    summary: 'You’re carrying a lot. Nothing alarming — worth easing off one thing.',
  },
  'at-risk': {
    label: 'Running hot',
    summary:
      'Your check-ins and the fortnight ahead add up to more than is sustainable. Time to take something off the plate.',
  },
};

export const DIFFICULTY_LABEL: Record<string, string> = {
  starter: 'Starter',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export const TRACK_STAGE_LABEL: Record<string, string> = {
  foundation: 'Foundations',
  core: 'Core',
  advanced: 'Going further',
};
