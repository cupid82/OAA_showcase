/**
 * Projects — proof of work, not a line on a profile.
 *
 * A project carries its story (the problem, the student's role, the outcome), a
 * milestone checklist, a team, and a visibility the student chose. Nothing is
 * published by default: a new project is private until its owner says otherwise.
 *
 * **One access check.** Every route goes through `assertProjectAccess`, the way
 * the old teacher write path went through `assertOwnsClass`. A private project
 * someone else owns is a 404, not a 403 — its existence is private too.
 */
import { getDb, persist } from '../data/store.js';
import type { ProjectRow, ProjectStatus, StudentRow } from '../data/types.js';
import { daysBetween } from '../lib/dates.js';
import { HttpError } from '../lib/httpError.js';
import { isStoryComplete } from '../lib/skillProof.js';
import type {
  ProjectInput,
  ProjectUpdateInput,
  TaskInput,
  TaskUpdateInput,
} from '../models/project.model.js';
import { recomputeMomentum } from './momentum.service.js';
import { notify } from './notification.service.js';
import {
  assertSkillsExist,
  findStudent,
  newId,
  nowISO,
  skillIndex,
  skillRefs,
  today,
} from './shared.js';
import type { SkillRef } from './shared.js';

export type ProjectAccess = 'owner' | 'member' | 'viewer';
type Need = 'view' | 'team' | 'owner';

/** A building project untouched for this long gets a "next step or pause?" nudge. */
export const STALE_AFTER_DAYS = 14;

function membersOf(projectId: string) {
  return getDb().projectMembers.filter((row) => row.projectId === projectId);
}

/** Owner plus members — everyone whose points a change to this project can move. */
function teamOf(project: ProjectRow): string[] {
  return [project.ownerId, ...membersOf(project.id).map((row) => row.studentId)];
}

function accessOf(studentId: string, project: ProjectRow): ProjectAccess | null {
  if (project.ownerId === studentId) return 'owner';
  if (membersOf(project.id).some((row) => row.studentId === studentId)) return 'member';
  // `campus` and `public` are both visible to any signed-in student.
  if (project.visibility !== 'private') return 'viewer';
  return null;
}

export function assertProjectAccess(
  studentId: string,
  projectId: string,
  need: Need,
): { project: ProjectRow; access: ProjectAccess } {
  const project = getDb().projects.find((row) => row.id === projectId);
  const access = project ? accessOf(studentId, project) : null;
  if (!project || !access) throw HttpError.notFound('Project not found.');

  if (need === 'owner' && access !== 'owner') {
    throw HttpError.forbidden('Only the project’s owner can do that.');
  }
  if (need === 'team' && access === 'viewer') {
    throw HttpError.forbidden('Only people on this project can do that.');
  }

  return { project, access };
}

function person(student: StudentRow | undefined) {
  return {
    studentId: student?.id ?? '',
    name: student?.name ?? 'Former student',
    handle: student?.handle ?? '',
    department: student?.department ?? '',
    year: student?.year ?? 0,
  };
}

function progressOf(projectId: string) {
  const tasks = getDb().projectTasks.filter((row) => row.projectId === projectId);
  return { done: tasks.filter((task) => task.done).length, total: tasks.length };
}

/** The next unfinished milestone: soonest due first, undated ones after. */
function nextTaskOf(projectId: string) {
  const now = today();
  const next = getDb()
    .projectTasks.filter((row) => row.projectId === projectId && !row.done)
    .sort(
      (a, b) =>
        (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') ||
        a.createdAt.localeCompare(b.createdAt),
    )[0];

  return next
    ? {
        id: next.id,
        title: next.title,
        dueDate: next.dueDate,
        overdue: next.dueDate !== null && next.dueDate < now,
      }
    : null;
}

// --- Read models --------------------------------------------------------------------

export interface ProjectCard {
  id: string;
  title: string;
  tagline: string;
  status: ProjectStatus;
  visibility: ProjectRow['visibility'];
  skills: SkillRef[];
  progress: { done: number; total: number };
  nextTask: { id: string; title: string; dueDate: string | null; overdue: boolean } | null;
  access: 'owner' | 'member';
  team: number;
  openToCollaborators: boolean;
  pendingRequests: number;
  storyComplete: boolean;
  source: ProjectRow['source'];
  repoUrl: string | null;
  demoUrl: string | null;
  updatedAt: string;
  shippedAt: string | null;
  /** Days since the last change, for a building project that has gone quiet. */
  staleDays: number | null;
}

function cardOf(studentId: string, project: ProjectRow, index = skillIndex()): ProjectCard {
  const quiet = daysBetween(project.updatedAt.slice(0, 10), today());

  return {
    id: project.id,
    title: project.title,
    tagline: project.tagline,
    status: project.status,
    visibility: project.visibility,
    skills: skillRefs(project.skillIds, index),
    progress: progressOf(project.id),
    nextTask: nextTaskOf(project.id),
    access: project.ownerId === studentId ? 'owner' : 'member',
    team: teamOf(project).length,
    openToCollaborators: project.openToCollaborators,
    pendingRequests:
      project.ownerId === studentId
        ? getDb().joinRequests.filter(
            (row) => row.projectId === project.id && row.status === 'pending',
          ).length
        : 0,
    storyComplete: isStoryComplete(project),
    source: project.source,
    repoUrl: project.repoUrl,
    demoUrl: project.demoUrl,
    updatedAt: project.updatedAt,
    shippedAt: project.shippedAt,
    staleDays: project.status === 'building' && quiet >= STALE_AFTER_DAYS ? quiet : null,
  };
}

const STATUS_ORDER: Record<ProjectStatus, number> = { building: 0, idea: 1, paused: 2, shipped: 3 };

export interface MyProjects {
  projects: ProjectCard[];
  counts: Record<ProjectStatus, number>;
  pendingRequests: number;
  github: { connected: boolean; synced: boolean; importable: number };
}

export function listMine(studentId: string): MyProjects {
  const db = getDb();
  findStudent(studentId);
  const index = skillIndex();

  const memberOf = new Set(
    db.projectMembers.filter((row) => row.studentId === studentId).map((row) => row.projectId),
  );
  const projects = db.projects
    .filter((project) => project.ownerId === studentId || memberOf.has(project.id))
    .map((project) => cardOf(studentId, project, index))
    .sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.updatedAt.localeCompare(a.updatedAt),
    );

  const counts: Record<ProjectStatus, number> = { idea: 0, building: 0, shipped: 0, paused: 0 };
  for (const project of projects) counts[project.status] += 1;

  const github = db.connections.find(
    (row) => row.studentId === studentId && row.provider === 'github',
  );
  const imported = new Set(
    db.projects
      .filter((project) => project.ownerId === studentId && project.source === 'github')
      .map((project) => project.sourceRef),
  );

  return {
    projects,
    counts,
    pendingRequests: projects.reduce((sum, project) => sum + project.pendingRequests, 0),
    github: {
      connected: github !== undefined,
      synced: Boolean(github?.github),
      importable:
        github?.github?.repos.filter((repo) => !repo.fork && !imported.has(repo.fullName)).length ??
        0,
    },
  };
}

export interface DiscoverCard {
  id: string;
  title: string;
  tagline: string;
  status: ProjectStatus;
  skills: SkillRef[];
  owner: ReturnType<typeof person>;
  lookingFor: string;
  openToCollaborators: boolean;
  team: number;
  /** Skills the viewer lists that this project uses — why it might suit them. */
  sharedSkills: SkillRef[];
  myRequest: 'pending' | 'declined' | null;
  updatedAt: string;
}

export function discover(
  studentId: string,
  filter: { q?: string; skill?: string },
): DiscoverCard[] {
  const db = getDb();
  const index = skillIndex();
  const mine = new Set(
    db.studentSkills.filter((row) => row.studentId === studentId).map((row) => row.skillId),
  );
  const needle = filter.q?.toLowerCase();

  return db.projects
    .filter((project) => {
      if (accessOf(studentId, project) !== 'viewer') return false;
      // An idea is only worth listing when its owner wants company.
      if (project.status === 'idea' && !project.openToCollaborators) return false;
      if (filter.skill && !project.skillIds.includes(filter.skill)) return false;
      if (!needle) return true;
      return [project.title, project.tagline, project.lookingFor]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    })
    .map((project): DiscoverCard => {
      const latest = db.joinRequests
        .filter((row) => row.projectId === project.id && row.studentId === studentId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

      return {
        id: project.id,
        title: project.title,
        tagline: project.tagline,
        status: project.status,
        skills: skillRefs(project.skillIds, index),
        owner: person(db.students.find((row) => row.id === project.ownerId)),
        lookingFor: project.lookingFor,
        openToCollaborators: project.openToCollaborators,
        team: teamOf(project).length,
        sharedSkills: skillRefs(
          project.skillIds.filter((id) => mine.has(id)),
          index,
        ),
        myRequest:
          latest?.status === 'pending'
            ? 'pending'
            : latest?.status === 'declined'
              ? 'declined'
              : null,
        updatedAt: project.updatedAt,
      };
    })
    .sort(
      (a, b) =>
        Number(b.openToCollaborators) - Number(a.openToCollaborators) ||
        b.sharedSkills.length - a.sharedSkills.length ||
        b.updatedAt.localeCompare(a.updatedAt),
    );
}

const DIFFICULTY_ORDER = { starter: 0, intermediate: 1, advanced: 2 } as const;

export interface IdeaCard {
  id: string;
  title: string;
  summary: string;
  difficulty: keyof typeof DIFFICULTY_ORDER;
  hours: number;
  milestones: string[];
  skills: SkillRef[];
  tracks: { id: string; name: string }[];
  forYourGoal: boolean;
  /** The project this student already started from it. */
  startedAs: string | null;
}

export function listIdeas(studentId: string): IdeaCard[] {
  const db = getDb();
  const student = findStudent(studentId);
  const index = skillIndex();
  const trackNames = new Map(db.tracks.map((track) => [track.id, track.name]));

  return db.projectIdeas
    .map((idea) => ({
      id: idea.id,
      title: idea.title,
      summary: idea.summary,
      difficulty: idea.difficulty,
      hours: idea.hours,
      milestones: idea.milestones,
      skills: skillRefs(idea.skillIds, index),
      tracks: idea.trackIds.flatMap((id) => {
        const name = trackNames.get(id);
        return name ? [{ id, name }] : [];
      }),
      forYourGoal: student.trackId !== null && idea.trackIds.includes(student.trackId),
      startedAs:
        db.projects.find(
          (project) =>
            project.ownerId === studentId &&
            project.source === 'idea' &&
            project.sourceRef === idea.id,
        )?.id ?? null,
    }))
    .sort(
      (a, b) =>
        Number(b.forYourGoal) - Number(a.forYourGoal) ||
        DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty] ||
        a.title.localeCompare(b.title),
    );
}

export interface ProjectDetail {
  id: string;
  title: string;
  tagline: string;
  problem: string;
  role: string;
  outcome: string;
  status: ProjectStatus;
  visibility: ProjectRow['visibility'];
  openToCollaborators: boolean;
  lookingFor: string;
  repoUrl: string | null;
  demoUrl: string | null;
  source: ProjectRow['source'];
  sourceRef: string | null;
  createdAt: string;
  updatedAt: string;
  shippedAt: string | null;
  skills: SkillRef[];
  access: ProjectAccess;
  owner: ReturnType<typeof person>;
  /** `isYou` marks the caller's own row, so "leave" needs no guessing. */
  members: (ReturnType<typeof person> & { role: string; joinedAt: string; isYou: boolean })[];
  tasks: {
    id: string;
    title: string;
    done: boolean;
    dueDate: string | null;
    doneAt: string | null;
    doneBy: string | null;
    overdue: boolean;
  }[];
  progress: { done: number; total: number };
  storyComplete: boolean;
  /** Which parts of the story are written — shown to the team as a checklist. */
  story: { problem: boolean; skills: boolean; role: boolean; link: boolean; outcome: boolean };
  joinRequests: {
    id: string;
    student: ReturnType<typeof person>;
    message: string;
    createdAt: string;
  }[];
  myRequest: { status: 'pending' | 'declined'; createdAt: string } | null;
  idea: { id: string; title: string } | null;
}

function detailOf(studentId: string, project: ProjectRow, access: ProjectAccess): ProjectDetail {
  const db = getDb();
  const now = today();
  const students = new Map(db.students.map((row) => [row.id, row]));
  const latestRequest = db.joinRequests
    .filter((row) => row.projectId === project.id && row.studentId === studentId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const idea =
    project.source === 'idea'
      ? db.projectIdeas.find((row) => row.id === project.sourceRef)
      : undefined;

  return {
    id: project.id,
    title: project.title,
    tagline: project.tagline,
    problem: project.problem,
    role: project.role,
    outcome: project.outcome,
    status: project.status,
    visibility: project.visibility,
    openToCollaborators: project.openToCollaborators,
    lookingFor: project.lookingFor,
    repoUrl: project.repoUrl,
    demoUrl: project.demoUrl,
    source: project.source,
    sourceRef: project.sourceRef,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    shippedAt: project.shippedAt,
    skills: skillRefs(project.skillIds),
    access,
    owner: person(students.get(project.ownerId)),
    members: membersOf(project.id).map((row) => ({
      ...person(students.get(row.studentId)),
      role: row.role,
      joinedAt: row.joinedAt,
      isYou: row.studentId === studentId,
    })),
    tasks: db.projectTasks
      .filter((row) => row.projectId === project.id)
      .sort(
        (a, b) =>
          Number(a.done) - Number(b.done) ||
          (a.done
            ? (a.doneAt ?? '').localeCompare(b.doneAt ?? '')
            : (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')) ||
          a.createdAt.localeCompare(b.createdAt),
      )
      .map((task) => ({
        id: task.id,
        title: task.title,
        done: task.done,
        dueDate: task.dueDate,
        doneAt: task.doneAt,
        doneBy: task.doneBy ? (students.get(task.doneBy)?.name ?? null) : null,
        overdue: !task.done && task.dueDate !== null && task.dueDate < now,
      })),
    progress: progressOf(project.id),
    storyComplete: isStoryComplete(project),
    story: {
      problem: isStoryComplete({ problem: project.problem, skillIds: ['x'] }),
      skills: project.skillIds.length > 0,
      role: project.role.trim().length > 0,
      link: Boolean(project.repoUrl || project.demoUrl),
      outcome: project.outcome.trim().length > 0,
    },
    // Requests are the owner's business alone.
    joinRequests:
      access === 'owner'
        ? db.joinRequests
            .filter((row) => row.projectId === project.id && row.status === 'pending')
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
            .map((row) => ({
              id: row.id,
              student: person(students.get(row.studentId)),
              message: row.message,
              createdAt: row.createdAt,
            }))
        : [],
    myRequest:
      access === 'viewer' && latestRequest && latestRequest.status !== 'accepted'
        ? { status: latestRequest.status, createdAt: latestRequest.createdAt }
        : null,
    idea: idea ? { id: idea.id, title: idea.title } : null,
  };
}

export function getProject(studentId: string, projectId: string): ProjectDetail {
  const { project, access } = assertProjectAccess(studentId, projectId, 'view');
  return detailOf(studentId, project, access);
}

// --- Writes ------------------------------------------------------------------------

/**
 * Nobody can find a private project, so it cannot be open to collaborators. The
 * form disables the box; this keeps the stored row honest either way.
 */
function normaliseOpenness(project: ProjectRow): void {
  if (project.visibility === 'private') project.openToCollaborators = false;
  if (!project.openToCollaborators) project.lookingFor = project.lookingFor.trim();
}

export async function createProject(
  studentId: string,
  input: ProjectInput,
): Promise<ProjectDetail> {
  findStudent(studentId);
  assertSkillsExist(input.skillIds);

  const now = nowISO();
  const project: ProjectRow = {
    id: newId('prj'),
    ownerId: studentId,
    title: input.title,
    tagline: input.tagline,
    problem: input.problem,
    role: input.role,
    outcome: input.outcome,
    status: input.status,
    skillIds: input.skillIds,
    repoUrl: input.repoUrl,
    demoUrl: input.demoUrl,
    visibility: input.visibility,
    openToCollaborators: input.openToCollaborators,
    lookingFor: input.lookingFor,
    source: 'manual',
    sourceRef: null,
    createdAt: now,
    updatedAt: now,
    shippedAt: input.status === 'shipped' ? now : null,
  };
  normaliseOpenness(project);

  getDb().projects.push(project);
  recomputeMomentum(studentId);
  await persist();
  return detailOf(studentId, project, 'owner');
}

/** Copies a curated idea into a real project, milestones and all. */
export async function startIdea(studentId: string, ideaId: string): Promise<ProjectDetail> {
  const db = getDb();
  findStudent(studentId);
  const idea = db.projectIdeas.find((row) => row.id === ideaId);
  if (!idea) throw HttpError.notFound('No such project idea.');

  const existing = db.projects.find(
    (project) =>
      project.ownerId === studentId && project.source === 'idea' && project.sourceRef === ideaId,
  );
  if (existing)
    throw HttpError.conflict('You have already started this idea — it is in your projects.');

  const now = nowISO();
  const project: ProjectRow = {
    id: newId('prj'),
    ownerId: studentId,
    title: idea.title,
    tagline: idea.summary.length > 140 ? `${idea.summary.slice(0, 137)}…` : idea.summary,
    // The problem statement is the student's to write — it is what makes the
    // project theirs rather than a copied brief.
    problem: '',
    role: '',
    outcome: '',
    status: 'building',
    skillIds: [...idea.skillIds],
    repoUrl: null,
    demoUrl: null,
    visibility: 'private',
    openToCollaborators: false,
    lookingFor: '',
    source: 'idea',
    sourceRef: idea.id,
    createdAt: now,
    updatedAt: now,
    shippedAt: null,
  };

  db.projects.push(project);
  for (const title of idea.milestones) {
    db.projectTasks.push({
      id: newId('tsk'),
      projectId: project.id,
      title,
      done: false,
      dueDate: null,
      doneAt: null,
      doneBy: null,
      createdBy: studentId,
      createdAt: now,
    });
  }

  await persist();
  return detailOf(studentId, project, 'owner');
}

export async function updateProject(
  studentId: string,
  projectId: string,
  input: ProjectUpdateInput,
): Promise<ProjectDetail> {
  const { project, access } = assertProjectAccess(studentId, projectId, 'owner');
  if (input.skillIds) assertSkillsExist(input.skillIds);

  const wasShipped = project.status === 'shipped';
  const defined = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<ProjectRow>;
  Object.assign(project, defined);

  // Shipping stamps the date once; un-shipping clears it, so re-shipping later
  // is dated to when it actually happened.
  if (project.status === 'shipped' && !wasShipped) project.shippedAt = nowISO();
  if (project.status !== 'shipped') project.shippedAt = null;

  normaliseOpenness(project);
  project.updatedAt = nowISO();

  recomputeMomentum(...teamOf(project));
  await persist();
  return detailOf(studentId, project, access);
}

export async function deleteProject(studentId: string, projectId: string): Promise<void> {
  const { project } = assertProjectAccess(studentId, projectId, 'owner');
  const db = getDb();
  const team = teamOf(project);

  db.projects = db.projects.filter((row) => row.id !== projectId);
  db.projectTasks = db.projectTasks.filter((row) => row.projectId !== projectId);
  db.projectMembers = db.projectMembers.filter((row) => row.projectId !== projectId);
  db.joinRequests = db.joinRequests.filter((row) => row.projectId !== projectId);

  recomputeMomentum(...team);
  await persist();
}

// --- Milestones ----------------------------------------------------------------------

function taskOf(projectId: string, taskId: string) {
  const task = getDb().projectTasks.find((row) => row.id === taskId && row.projectId === projectId);
  if (!task) throw HttpError.notFound('No such milestone on this project.');
  return task;
}

export async function addTask(
  studentId: string,
  projectId: string,
  input: TaskInput,
): Promise<ProjectDetail> {
  const { project, access } = assertProjectAccess(studentId, projectId, 'team');
  const now = nowISO();

  getDb().projectTasks.push({
    id: newId('tsk'),
    projectId,
    title: input.title,
    done: false,
    dueDate: input.dueDate,
    doneAt: null,
    doneBy: null,
    createdBy: studentId,
    createdAt: now,
  });
  project.updatedAt = now;

  await persist();
  return detailOf(studentId, project, access);
}

export async function updateTask(
  studentId: string,
  projectId: string,
  taskId: string,
  input: TaskUpdateInput,
): Promise<ProjectDetail> {
  const { project, access } = assertProjectAccess(studentId, projectId, 'team');
  const task = taskOf(projectId, taskId);
  const affected = new Set<string>();
  if (task.doneBy) affected.add(task.doneBy);

  if (input.title !== undefined) task.title = input.title;
  if (input.dueDate !== undefined) task.dueDate = input.dueDate;
  if (input.done !== undefined && input.done !== task.done) {
    task.done = input.done;
    // Whoever ticks it earns it. Unticking takes it back.
    task.doneAt = input.done ? nowISO() : null;
    task.doneBy = input.done ? studentId : null;
    affected.add(studentId);
  }
  project.updatedAt = nowISO();

  recomputeMomentum(...affected);
  await persist();
  return detailOf(studentId, project, access);
}

export async function deleteTask(
  studentId: string,
  projectId: string,
  taskId: string,
): Promise<ProjectDetail> {
  const { project, access } = assertProjectAccess(studentId, projectId, 'team');
  const task = taskOf(projectId, taskId);
  const db = getDb();

  db.projectTasks = db.projectTasks.filter((row) => row.id !== taskId);
  project.updatedAt = nowISO();

  if (task.doneBy) recomputeMomentum(task.doneBy);
  await persist();
  return detailOf(studentId, project, access);
}

// --- Collaboration --------------------------------------------------------------------

const quote = (text: string, max = 110) =>
  `“${text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text}”`;

export async function requestToJoin(
  studentId: string,
  projectId: string,
  message: string,
): Promise<ProjectDetail> {
  const { project, access } = assertProjectAccess(studentId, projectId, 'view');
  if (access !== 'viewer') throw HttpError.badRequest('You are already on this project.');
  if (!project.openToCollaborators) {
    throw HttpError.badRequest('This project isn’t looking for collaborators right now.');
  }

  const db = getDb();
  if (
    db.joinRequests.some(
      (row) =>
        row.projectId === projectId && row.studentId === studentId && row.status === 'pending',
    )
  ) {
    throw HttpError.conflict('You have already asked to join — the owner hasn’t answered yet.');
  }

  const me = findStudent(studentId);
  const request = {
    id: newId('jrq'),
    projectId,
    studentId,
    message,
    status: 'pending' as const,
    createdAt: nowISO(),
    decidedAt: null,
  };
  db.joinRequests.push(request);

  notify({
    userId: findStudent(project.ownerId).userId,
    kind: 'projects',
    title: `${me.name} wants to join ${project.title}`,
    body: quote(message),
    link: `/student/projects/${project.id}`,
    dedupeKey: `join:${request.id}`,
  });

  await persist();
  return detailOf(studentId, project, access);
}

export async function decideJoinRequest(
  studentId: string,
  projectId: string,
  requestId: string,
  decision: 'accepted' | 'declined',
  role: string,
): Promise<ProjectDetail> {
  const { project, access } = assertProjectAccess(studentId, projectId, 'owner');
  const db = getDb();
  const request = db.joinRequests.find(
    (row) => row.id === requestId && row.projectId === projectId,
  );
  if (!request) throw HttpError.notFound('No such request on this project.');
  if (request.status !== 'pending')
    throw HttpError.conflict('That request has already been answered.');

  request.status = decision;
  request.decidedAt = nowISO();
  const requester = findStudent(request.studentId);

  if (decision === 'accepted') {
    if (
      !db.projectMembers.some(
        (row) => row.projectId === projectId && row.studentId === requester.id,
      )
    ) {
      db.projectMembers.push({
        id: newId('mem'),
        projectId,
        studentId: requester.id,
        role: role || 'Collaborator',
        joinedAt: nowISO(),
      });
    }
    notify({
      userId: requester.userId,
      kind: 'projects',
      title: `You’re on ${project.title}`,
      body: 'Your request was accepted. The milestones are shared — tick one off when it’s done.',
      link: `/student/projects/${project.id}`,
      dedupeKey: `join-decision:${request.id}`,
    });
    // A shipped project's points and proof now belong to them too.
    recomputeMomentum(requester.id);
  } else {
    notify({
      userId: requester.userId,
      kind: 'projects',
      title: `No space on ${project.title} for now`,
      body: 'The owner isn’t adding anyone at the moment. Other projects are looking for help in Discover.',
      link: '/student/projects?tab=discover',
      dedupeKey: `join-decision:${request.id}`,
    });
  }

  project.updatedAt = nowISO();
  await persist();
  return detailOf(studentId, project, access);
}

/**
 * The owner can remove anyone; a member can remove themselves. Returns null when
 * the caller has just left — they can no longer see a private project.
 */
export async function removeMember(
  studentId: string,
  projectId: string,
  memberId: string,
): Promise<ProjectDetail | null> {
  const { project, access } = assertProjectAccess(studentId, projectId, 'team');
  if (access !== 'owner' && memberId !== studentId) {
    throw HttpError.forbidden('Only the owner can remove someone else.');
  }

  const db = getDb();
  const before = db.projectMembers.length;
  db.projectMembers = db.projectMembers.filter(
    (row) => !(row.projectId === projectId && row.studentId === memberId),
  );
  if (db.projectMembers.length === before) throw HttpError.notFound('They aren’t on this project.');

  project.updatedAt = nowISO();
  recomputeMomentum(memberId);
  await persist();

  if (memberId === studentId) return null;
  return detailOf(studentId, project, access);
}
