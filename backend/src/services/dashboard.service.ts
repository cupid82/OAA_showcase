/**
 * Today — the student's home screen.
 *
 * Its job is not to show every number; it is to help the student make the next
 * useful move. Every action answers three questions: **why am I seeing this,
 * what do I do, and by when?** — and every one can be dismissed.
 *
 * Two things make it quieter on purpose:
 * - a student who snoozed nudges (from the Burnout page), and
 * - a student whose check-ins read "at risk"
 * see only what is genuinely urgent, and are told how much was held back.
 */
import { getDb, persist } from '../data/store.js';
import { addDays, daysBetween, monthStart, weekStart } from '../lib/dates.js';
import { assessBurnout } from '../lib/burnout.js';
import type { BurnoutLevel } from '../lib/burnout.js';
import { isRecommended } from '../lib/matching.js';
import { isStoryComplete } from '../lib/skillProof.js';
import { listConnections } from './connection.service.js';
import { projectsOf, skillProofs } from './evidence.js';
import { matchEvent, matchJob, matchStudentOf } from './match.service.js';
import { getLeaderboard, momentumTotals, recentMomentum } from './momentum.service.js';
import type { LedgerView } from './momentum.service.js';
import { STALE_AFTER_DAYS } from './project.service.js';
import {
  dismissedKeys,
  findStudent,
  nowISO,
  preferencesOf,
  setDismissal,
  today,
} from './shared.js';
import { commitmentsFor } from './wellbeing.service.js';
import type { Commitment } from './wellbeing.service.js';

export type ActionKind =
  | 'setup'
  | 'request'
  | 'deadline'
  | 'event'
  | 'milestone'
  | 'match'
  | 'portfolio'
  | 'project'
  | 'skill'
  | 'wellbeing';

export interface TodayAction {
  key: string;
  kind: ActionKind;
  title: string;
  /** Why the student is seeing it. */
  why: string;
  /** What to do. */
  action: { label: string; to: string };
  /** By when — null for "whenever suits you". */
  due: string | null;
  urgent: boolean;
}

export interface Today {
  student: { name: string; firstName: string; handle: string };
  goal: { id: string; name: string } | null;
  date: string;
  actions: TodayAction[];
  /** How many actions focus mode held back. */
  heldBack: number;
  focus: 'snoozed' | 'at-risk' | null;
  stats: {
    momentum: { month: number; all: number; rank: number | null; visible: boolean; ranked: number };
    projects: { building: number; shipped: number };
    skills: { listed: number; proven: number; trackProven: number; trackTotal: number };
    tracking: { applications: number; events: number };
  };
  upcoming: Commitment[];
  recentWins: LedgerView[];
  wellbeing: { level: BurnoutLevel | null; checkedInThisWeek: boolean; lastCheckin: string | null };
  connections: { id: string; name: string; connected: boolean }[];
  portfolio: { public: boolean; handle: string };
}

const MAX_ACTIONS = 6;

interface Candidate extends TodayAction {
  priority: number;
}

const dayWord = (days: number) =>
  days < 0
    ? `${-days} day${days === -1 ? '' : 's'} ago`
    : days === 0
      ? 'today'
      : days === 1
        ? 'tomorrow'
        : `in ${days} days`;

export function getToday(studentId: string): Today {
  const db = getDb();
  const student = findStudent(studentId);
  const now = today();
  const prefs = preferencesOf(studentId);
  const dismissed = dismissedKeys(studentId);
  const track = student.trackId ? db.tracks.find((row) => row.id === student.trackId) : undefined;
  const proofs = skillProofs(db, studentId, now);
  const projects = projectsOf(db, studentId);
  const ownedIds = new Set(projects.filter((p) => p.ownerId === studentId).map((p) => p.id));
  const commitments = commitmentsFor(studentId);
  const checkins = db.checkins.filter((row) => row.studentId === studentId);
  const reading = assessBurnout(checkins, commitments.length, now);
  const thisWeek = weekStart(now);
  const connections = listConnections(studentId);
  const candidates: Candidate[] = [];
  const add = (candidate: Candidate) => candidates.push(candidate);

  // --- Getting set up -----------------------------------------------------------
  if (!track) {
    add({
      key: 'setup:goal',
      kind: 'setup',
      title: 'Pick a goal to work towards',
      why: 'Your goal decides which skills, projects and openings OAA puts in front of you.',
      action: { label: 'Choose a goal', to: '/student/settings#goal' },
      due: null,
      urgent: false,
      priority: 85,
    });
  }
  if (proofs.size < 3) {
    add({
      key: 'setup:skills',
      kind: 'setup',
      title: 'Add the skills you already have',
      why: 'Matching and your skill map both start from what you list. Three is enough to begin.',
      action: { label: 'Add skills', to: '/student/skills' },
      due: null,
      urgent: false,
      priority: 65,
    });
  }
  if (projects.length === 0) {
    add({
      key: 'setup:first-project',
      kind: 'setup',
      title: 'Start your first project',
      why: 'Projects are the proof behind every skill. Pick a curated idea if you don’t have one yet.',
      action: { label: 'Browse ideas', to: '/student/projects?tab=ideas' },
      due: null,
      urgent: false,
      priority: 62,
    });
  }
  if (!connections.some((row) => row.id === 'github' && row.connection)) {
    add({
      key: 'setup:github',
      kind: 'setup',
      title: 'Connect GitHub',
      why: 'Import your repositories as projects instead of typing them in, and see which languages you really use.',
      action: { label: 'Connect', to: '/student/connections' },
      due: null,
      urgent: false,
      priority: 30,
    });
  }

  // --- People waiting on you -------------------------------------------------------
  for (const request of db.joinRequests.filter(
    (row) => row.status === 'pending' && ownedIds.has(row.projectId),
  )) {
    const who = db.students.find((row) => row.id === request.studentId);
    const project = db.projects.find((row) => row.id === request.projectId);
    if (!who || !project) continue;
    add({
      key: `request:${request.id}`,
      kind: 'request',
      title: `${who.name} wants to join ${project.title}`,
      why: `They wrote: “${request.message.length > 120 ? `${request.message.slice(0, 119)}…` : request.message}”`,
      action: { label: 'Review request', to: `/student/projects/${project.id}` },
      due: null,
      urgent: false,
      priority: 90,
    });
  }

  // --- Deadlines -----------------------------------------------------------------
  for (const application of db.applications.filter(
    (row) => row.studentId === studentId && row.stage === 'saved',
  )) {
    const job = db.jobs.find((row) => row.id === application.jobId);
    if (!job?.deadline || job.status !== 'published') continue;
    const days = daysBetween(now, job.deadline);
    if (days < 0 || days > 7) continue;
    add({
      key: `deadline:job:${job.id}`,
      kind: 'deadline',
      title: `Apply to ${job.title}`,
      why: `${job.organiser} · Applications close ${dayWord(days)}, and you saved it but haven’t marked it applied.`,
      action: { label: 'Open listing', to: `/student/jobs/${job.id}` },
      due: job.deadline,
      urgent: days <= 3,
      priority: days <= 3 ? 100 : 75,
    });
  }

  for (const participation of db.eventParticipation.filter((row) => row.studentId === studentId)) {
    const event = db.events.find((row) => row.id === participation.eventId);
    if (!event || event.status !== 'published') continue;

    if (participation.status === 'saved' && event.registerBy) {
      const days = daysBetween(now, event.registerBy);
      if (days >= 0 && days <= 7) {
        add({
          key: `deadline:register:${event.id}`,
          kind: 'deadline',
          title: `Register for ${event.title}`,
          why: `Registration closes ${dayWord(days)}. You saved it, but haven’t registered.`,
          action: { label: 'Open event', to: `/student/events/${event.id}` },
          due: event.registerBy,
          urgent: days <= 3,
          priority: days <= 3 ? 98 : 72,
        });
      }
    }

    if (participation.status === 'registered') {
      const days = daysBetween(now, event.startsOn);
      if (days >= 0 && days <= 3) {
        add({
          key: `event:${event.id}:${event.startsOn}`,
          kind: 'event',
          title: `${event.title} is ${dayWord(days)}`,
          why: `You registered. ${event.time ? `${event.time} · ` : ''}${event.location}.`,
          action: { label: 'See details', to: `/student/events/${event.id}` },
          due: event.startsOn,
          urgent: days <= 1,
          priority: 70,
        });
      }
    }

    if (participation.status === 'attended' && participation.reflection.trim() === '') {
      add({
        key: `reflect:${event.id}`,
        kind: 'portfolio',
        title: `What did you take away from ${event.title}?`,
        why: 'Two sentences and the skills you used turn attendance into evidence on your skill map.',
        action: { label: 'Add a reflection', to: `/student/events/${event.id}` },
        due: null,
        urgent: false,
        priority: 42,
      });
    }
  }

  // --- Projects --------------------------------------------------------------------
  const building = projects.filter((project) => project.status === 'building');
  const dueTasks = db.projectTasks
    .filter(
      (task) =>
        !task.done &&
        task.dueDate !== null &&
        task.dueDate <= addDays(now, 7) &&
        building.some((project) => project.id === task.projectId),
    )
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
    .slice(0, 2);

  for (const task of dueTasks) {
    const project = building.find((row) => row.id === task.projectId);
    const days = daysBetween(now, task.dueDate ?? now);
    add({
      key: `milestone:${task.id}:${task.dueDate}`,
      kind: 'milestone',
      title: task.title,
      why:
        days < 0
          ? `Overdue by ${-days} day${days === -1 ? '' : 's'} on ${project?.title}. Finish it, or move the date — both are fine.`
          : `Next milestone on ${project?.title}, due ${dayWord(days)}.`,
      action: { label: 'Open project', to: `/student/projects/${task.projectId}` },
      due: task.dueDate,
      urgent: days < 0,
      priority: days < 0 ? 80 : days <= 3 ? 72 : 60,
    });
  }

  const stale = building
    .filter((project) => project.ownerId === studentId)
    .map((project) => ({ project, quiet: daysBetween(project.updatedAt.slice(0, 10), now) }))
    .filter((entry) => entry.quiet >= STALE_AFTER_DAYS)
    .sort((a, b) => b.quiet - a.quiet)[0];
  if (stale) {
    add({
      key: `stale:${stale.project.id}`,
      kind: 'project',
      title: `${stale.project.title} hasn’t moved in ${stale.quiet} days`,
      why: 'Pick the next small step — or pause it. A paused project stops nagging you.',
      action: { label: 'Open project', to: `/student/projects/${stale.project.id}` },
      due: null,
      urgent: false,
      priority: 38,
    });
  }

  for (const project of projects.filter(
    (row) => row.status === 'shipped' && row.ownerId === studentId,
  )) {
    if (!isStoryComplete(project)) {
      add({
        key: `story:${project.id}`,
        kind: 'portfolio',
        title: `Tell the story of ${project.title}`,
        why: 'It’s shipped, but without the problem it solves it can’t prove your skills or earn momentum.',
        action: { label: 'Edit project', to: `/student/projects/${project.id}/edit` },
        due: null,
        urgent: false,
        priority: 44,
      });
    } else if (!project.repoUrl && !project.demoUrl) {
      add({
        key: `link:${project.id}`,
        kind: 'portfolio',
        title: `Add a link to ${project.title}`,
        why: 'A repository or a live demo is the first thing anyone reading your portfolio clicks.',
        action: { label: 'Edit project', to: `/student/projects/${project.id}/edit` },
        due: null,
        urgent: false,
        priority: 32,
      });
    }
  }

  // --- Skills -------------------------------------------------------------------------
  if (track) {
    const skillNames = new Map(db.skills.map((skill) => [skill.id, skill.name]));
    const claimed = track.skills.find(
      (entry) => entry.stage !== 'advanced' && proofs.get(entry.skillId)?.stage === 'claimed',
    );
    if (claimed) {
      const name = skillNames.get(claimed.skillId) ?? claimed.skillId;
      add({
        key: `prove:${claimed.skillId}`,
        kind: 'skill',
        title: `Put ${name} to work`,
        why: `It’s on your list and your ${track.name} path, but nothing you’ve built shows it yet.`,
        action: { label: 'See how', to: `/student/skills/${claimed.skillId}` },
        due: null,
        urgent: false,
        priority: 34,
      });
    }

    const next = track.skills.find((entry) => !proofs.has(entry.skillId));
    if (next) {
      const name = skillNames.get(next.skillId) ?? next.skillId;
      add({
        key: `next-skill:${next.skillId}`,
        kind: 'skill',
        title: `Start on ${name}`,
        why: `The next skill on your ${track.name} path. ${next.why}`,
        action: { label: 'Open skill', to: `/student/skills/${next.skillId}` },
        due: null,
        urgent: false,
        priority: 28,
      });
    }
  }

  // --- Matches ------------------------------------------------------------------------
  const matchStudent = matchStudentOf(studentId);
  const trackedJobs = new Set(
    db.applications.filter((row) => row.studentId === studentId).map((row) => row.jobId),
  );
  const bestJob = db.jobs
    .filter(
      (job) =>
        job.status === 'published' &&
        (job.deadline === null || job.deadline >= now) &&
        !trackedJobs.has(job.id) &&
        !dismissed.has(`job:${job.id}`),
    )
    .map((job) => ({ job, match: matchJob(matchStudent, job) }))
    .filter((entry) => isRecommended(entry.match))
    .sort((a, b) => b.match.score - a.match.score)[0];
  if (bestJob) {
    add({
      key: `match:job:${bestJob.job.id}`,
      kind: 'match',
      title: `${bestJob.job.title} at ${bestJob.job.organiser}`,
      why: bestJob.match.reasons.slice(0, 2).join(' '),
      action: { label: 'Look at it', to: `/student/jobs/${bestJob.job.id}` },
      due: bestJob.job.deadline,
      urgent: false,
      priority: 50,
    });
  }

  const listedEvents = new Set(
    db.eventParticipation.filter((row) => row.studentId === studentId).map((row) => row.eventId),
  );
  const bestEvent = db.events
    .filter(
      (event) =>
        event.status === 'published' &&
        event.startsOn >= now &&
        (event.registerBy === null || event.registerBy >= now) &&
        !listedEvents.has(event.id) &&
        !dismissed.has(`event:${event.id}`),
    )
    .map((event) => ({ event, match: matchEvent(matchStudent, event) }))
    .filter((entry) => isRecommended(entry.match))
    .sort(
      (a, b) => b.match.score - a.match.score || a.event.startsOn.localeCompare(b.event.startsOn),
    )[0];
  if (bestEvent) {
    add({
      key: `match:event:${bestEvent.event.id}`,
      kind: 'match',
      title: bestEvent.event.title,
      why: bestEvent.match.reasons.slice(0, 2).join(' '),
      action: { label: 'Look at it', to: `/student/events/${bestEvent.event.id}` },
      due: bestEvent.event.registerBy ?? bestEvent.event.startsOn,
      urgent: false,
      priority: 45,
    });
  }

  // --- Wellbeing -------------------------------------------------------------------------
  if (reading.level === 'at-risk') {
    add({
      key: `wellbeing:at-risk:${thisWeek}`,
      kind: 'wellbeing',
      title: 'Your load looks heavy right now',
      why: 'Your recent check-ins and the fortnight ahead add up to more than is sustainable. Only you can see this.',
      action: { label: 'Look at it together', to: '/student/burnout' },
      due: null,
      urgent: false,
      priority: 95,
    });
  } else if (!checkins.some((row) => row.week === thisWeek)) {
    add({
      key: `checkin:${thisWeek}`,
      kind: 'wellbeing',
      title: 'Two-minute check-in',
      why: 'Five quick questions about your week. It’s private — nobody else ever sees the answers.',
      action: { label: 'Check in', to: '/student/burnout' },
      due: null,
      urgent: false,
      priority: 35,
    });
  }

  // --- Choose what to show ------------------------------------------------------------------
  const snoozed = prefs.snoozeUntil !== null && prefs.snoozeUntil > nowISO();
  const focus: Today['focus'] = snoozed
    ? 'snoozed'
    : reading.level === 'at-risk'
      ? 'at-risk'
      : null;

  const live = candidates.filter((candidate) => !dismissed.has(`today:${candidate.key}`));
  const essential = (candidate: Candidate) =>
    candidate.urgent || candidate.kind === 'request' || candidate.kind === 'wellbeing';
  const shown = (focus ? live.filter(essential) : live)
    .sort((a, b) => b.priority - a.priority || (a.due ?? '9999').localeCompare(b.due ?? '9999'))
    .slice(0, MAX_ACTIONS);

  // --- Numbers -------------------------------------------------------------------------------
  const board = getLeaderboard(studentId, {
    window: 'month',
    category: 'overall',
    scope: 'college',
  });
  const allTime = momentumTotals(studentId);
  const month = momentumTotals(studentId, monthStart(now));
  const trackIds = track?.skills.map((entry) => entry.skillId) ?? [];
  const latestCheckin = [...checkins].sort((a, b) => b.week.localeCompare(a.week))[0];

  return {
    student: {
      name: student.name,
      firstName: student.name.split(/\s+/)[0] ?? student.name,
      handle: student.handle,
    },
    goal: track ? { id: track.id, name: track.name } : null,
    date: now,
    actions: shown.map(({ priority: _priority, ...action }) => action),
    heldBack: focus ? live.length - shown.length : 0,
    focus,
    stats: {
      momentum: {
        month: month.total,
        all: allTime.total,
        rank: board.you.rank,
        visible: board.you.visible,
        ranked: board.total,
      },
      projects: {
        building: projects.filter((project) => project.status === 'building').length,
        shipped: projects.filter((project) => project.status === 'shipped').length,
      },
      skills: {
        listed: proofs.size,
        proven: [...proofs.values()].filter((proof) => proof.stage === 'proven').length,
        trackProven: trackIds.filter((id) => proofs.get(id)?.stage === 'proven').length,
        trackTotal: trackIds.length,
      },
      tracking: {
        applications: db.applications.filter(
          (row) =>
            row.studentId === studentId &&
            (row.stage === 'applied' || row.stage === 'interviewing' || row.stage === 'offer'),
        ).length,
        events: db.eventParticipation.filter((row) => {
          if (row.studentId !== studentId || row.status !== 'registered') return false;
          const event = db.events.find((entry) => entry.id === row.eventId);
          return event !== undefined && event.startsOn >= now;
        }).length,
      },
    },
    upcoming: commitments.filter((item) => item.daysUntil >= 0).slice(0, 6),
    recentWins: recentMomentum(studentId, 4),
    wellbeing: {
      level: reading.level,
      checkedInThisWeek: checkins.some((row) => row.week === thisWeek),
      lastCheckin: latestCheckin?.week ?? null,
    },
    connections: connections.map((row) => ({
      id: row.id,
      name: row.name,
      connected: row.connection !== null,
    })),
    portfolio: { public: prefs.portfolioPublic, handle: student.handle },
  };
}

/** "Done" or "not now" on a Today card. `undo` brings it back. */
export async function dismissAction(studentId: string, key: string, undo = false): Promise<Today> {
  findStudent(studentId);
  setDismissal(studentId, `today:${key}`, 'dismissed', !undo);
  await persist();
  return getToday(studentId);
}
