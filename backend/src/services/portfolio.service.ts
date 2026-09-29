/**
 * The public portfolio at `/p/<handle>` — the one page of OAA anyone can open.
 *
 * It shows only what the student chose to make public, and only what is backed
 * by evidence: public projects, skills their work proves or exercises (never a
 * bare claim), certificates they ticked for display, placed finishes at events,
 * and the account links they opted to show.
 *
 * Never here: check-ins, applications, momentum or rank, private or campus-only
 * projects, or anything at all while the portfolio switch is off.
 */
import { getDb } from '../data/store.js';
import { HttpError } from '../lib/httpError.js';
import { PROOF_ORDER } from '../lib/skillProof.js';
import { projectsOf, skillProofs } from './evidence.js';
import { preferencesOf, skillIndex, skillRefs, today } from './shared.js';
import type { SkillRef } from './shared.js';

export interface Portfolio {
  handle: string;
  name: string;
  headline: string;
  bio: string;
  department: string;
  year: number;
  track: string | null;
  projects: {
    id: string;
    title: string;
    tagline: string;
    problem: string;
    role: string;
    outcome: string;
    status: string;
    skills: SkillRef[];
    repoUrl: string | null;
    demoUrl: string | null;
    shippedAt: string | null;
    team: number;
  }[];
  skills: { id: string; name: string; stage: 'proven' | 'practising'; evidence: number }[];
  certificates: {
    title: string;
    issuer: string;
    issuedOn: string;
    url: string | null;
    skills: SkillRef[];
  }[];
  achievements: {
    title: string;
    organiser: string;
    date: string;
    outcome: 'finalist' | 'winner';
  }[];
  links: { provider: string; url: string; label: string }[];
}

const LINK_LABEL: Record<string, string> = {
  github: 'GitHub',
  linkedin: 'LinkedIn',
  x: 'X',
  leetcode: 'LeetCode',
  codeforces: 'Codeforces',
  kaggle: 'Kaggle',
  behance: 'Behance',
  website: 'Website',
};

export function getPortfolio(handle: string): Portfolio {
  const db = getDb();
  const student = db.students.find((row) => row.handle.toLowerCase() === handle.toLowerCase());
  // A private portfolio and a missing one look identical from outside.
  if (!student || student.onboardedAt === null || !preferencesOf(student.id).portfolioPublic) {
    throw HttpError.notFound('There’s no public portfolio at this address.');
  }

  const index = skillIndex();
  const now = today();
  const track = student.trackId ? db.tracks.find((row) => row.id === student.trackId) : undefined;
  const proofs = skillProofs(db, student.id, now);

  const skills = [...proofs.entries()]
    .filter(([, proof]) => proof.stage !== 'claimed')
    .flatMap(([skillId, proof]) => {
      const skill = index.get(skillId);
      if (!skill) return [];
      return [
        {
          id: skill.id,
          name: skill.name,
          stage: proof.stage as 'proven' | 'practising',
          evidence:
            proof.shippedProjects.length +
            proof.activeProjects.length +
            proof.certificates.length +
            proof.events.length,
        },
      ];
    })
    .sort((a, b) => PROOF_ORDER[b.stage] - PROOF_ORDER[a.stage] || b.evidence - a.evidence);

  const events = new Map(db.events.map((event) => [event.id, event]));

  return {
    handle: student.handle,
    name: student.name,
    headline: student.headline,
    bio: student.bio,
    department: student.department,
    year: student.year,
    track: track?.name ?? null,
    projects: projectsOf(db, student.id)
      .filter((project) => project.visibility === 'public' && project.status !== 'idea')
      .sort(
        (a, b) =>
          Number(b.status === 'shipped') - Number(a.status === 'shipped') ||
          (b.shippedAt ?? b.updatedAt).localeCompare(a.shippedAt ?? a.updatedAt),
      )
      .map((project) => ({
        id: project.id,
        title: project.title,
        tagline: project.tagline,
        problem: project.problem,
        role:
          project.ownerId === student.id
            ? project.role
            : (db.projectMembers.find(
                (row) => row.projectId === project.id && row.studentId === student.id,
              )?.role ?? ''),
        outcome: project.outcome,
        status: project.status,
        skills: skillRefs(project.skillIds, index),
        repoUrl: project.repoUrl,
        demoUrl: project.demoUrl,
        shippedAt: project.shippedAt,
        team: 1 + db.projectMembers.filter((row) => row.projectId === project.id).length,
      })),
    skills,
    certificates: db.certificates
      .filter((row) => row.studentId === student.id && row.showOnPortfolio)
      .sort((a, b) => b.issuedOn.localeCompare(a.issuedOn))
      .map((row) => ({
        title: row.title,
        issuer: row.issuer,
        issuedOn: row.issuedOn,
        url: row.url,
        skills: skillRefs(row.skillIds, index),
      })),
    achievements: db.eventParticipation
      .filter(
        (row) =>
          row.studentId === student.id &&
          row.status === 'attended' &&
          (row.outcome === 'finalist' || row.outcome === 'winner'),
      )
      .flatMap((row) => {
        const event = events.get(row.eventId);
        return event
          ? [
              {
                title: event.title,
                organiser: event.organiser,
                date: event.startsOn,
                outcome: row.outcome as 'finalist' | 'winner',
              },
            ]
          : [];
      })
      .sort((a, b) => b.date.localeCompare(a.date)),
    links: db.connections
      .filter((row) => row.studentId === student.id && row.showOnPortfolio)
      .map((row) => ({
        provider: row.provider,
        url: row.url,
        label: LINK_LABEL[row.provider] ?? row.provider,
      })),
  };
}
