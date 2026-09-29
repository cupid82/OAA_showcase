/**
 * Gathers a student's rows into the shapes the pure engines expect.
 *
 * Every function takes the database explicitly rather than calling `getDb()`, so
 * the seed can run the same code over the dataset it is still building. That is
 * deliberate: seeded points and proof come from the same engine the API uses, not
 * from numbers written by hand that would drift the moment either changed.
 */
import type { Database, ProjectRow } from '../data/types.js';
import { deriveLedger } from '../lib/momentum.js';
import type { LedgerEntry, MomentumInputs } from '../lib/momentum.js';
import { isStoryComplete, proofFor } from '../lib/skillProof.js';
import type { ProofStage, SkillEvidence, SkillProof } from '../lib/skillProof.js';

/** Projects a student owns or collaborates on. */
export function projectsOf(db: Database, studentId: string): ProjectRow[] {
  const memberOf = new Set(
    db.projectMembers.filter((row) => row.studentId === studentId).map((row) => row.projectId),
  );
  return db.projects.filter((project) => project.ownerId === studentId || memberOf.has(project.id));
}

export function evidenceOf(db: Database, studentId: string): SkillEvidence {
  const events = new Map(db.events.map((event) => [event.id, event]));

  return {
    projects: projectsOf(db, studentId).map((project) => ({
      id: project.id,
      title: project.title,
      status: project.status,
      problem: project.problem,
      skillIds: project.skillIds,
      shippedAt: project.shippedAt,
    })),
    certificates: db.certificates
      .filter((row) => row.studentId === studentId)
      .map((row) => ({
        id: row.id,
        title: row.title,
        issuedOn: row.issuedOn,
        skillIds: row.skillIds,
      })),
    events: db.eventParticipation
      .filter((row) => row.studentId === studentId && row.status === 'attended')
      .flatMap((row) => {
        const event = events.get(row.eventId);
        return event
          ? [{ id: event.id, title: event.title, date: event.startsOn, skillIds: row.skillIds }]
          : [];
      }),
    practice: db.practiceLogs
      .filter((row) => row.studentId === studentId)
      .map((row) => ({ skillId: row.skillId, date: row.date, minutes: row.minutes })),
  };
}

/** Proof for every skill the student lists. Skills they don't list are not judged. */
export function skillProofs(
  db: Database,
  studentId: string,
  today: string,
): Map<string, SkillProof> {
  const evidence = evidenceOf(db, studentId);

  return new Map(
    db.studentSkills
      .filter((row) => row.studentId === studentId)
      .map((row) => [row.skillId, proofFor(row.skillId, evidence, today)]),
  );
}

export function skillStages(
  db: Database,
  studentId: string,
  today: string,
): Map<string, ProofStage> {
  return new Map(
    [...skillProofs(db, studentId, today).entries()].map(([skillId, proof]) => [
      skillId,
      proof.stage,
    ]),
  );
}

export function momentumInputs(db: Database, studentId: string, today: string): MomentumInputs {
  const projects = projectsOf(db, studentId);
  const projectIds = new Set(projects.map((project) => project.id));
  const skillNames = new Map(db.skills.map((skill) => [skill.id, skill.name]));
  const events = new Map(db.events.map((event) => [event.id, event]));

  return {
    shippedProjects: projects
      .filter((project) => project.status === 'shipped' && isStoryComplete(project))
      .map((project) => ({
        id: project.id,
        title: project.title,
        shippedAt: project.shippedAt ?? project.updatedAt,
      })),
    completedTasks: db.projectTasks
      .filter(
        (task) =>
          projectIds.has(task.projectId) && task.done && task.doneBy === studentId && task.doneAt,
      )
      .map((task) => ({
        id: task.id,
        projectId: task.projectId,
        title: task.title,
        doneAt: task.doneAt ?? today,
      })),
    provenSkills: [...skillProofs(db, studentId, today).entries()]
      .filter(([, proof]) => proof.stage === 'proven')
      .map(([skillId, proof]) => ({
        skillId,
        name: skillNames.get(skillId) ?? skillId,
        provenAt: proof.provenAt ?? today,
      })),
    certificates: db.certificates
      .filter((row) => row.studentId === studentId)
      .map((row) => ({ id: row.id, title: row.title, issuedOn: row.issuedOn })),
    attendedEvents: db.eventParticipation
      .filter((row) => row.studentId === studentId && row.status === 'attended')
      .flatMap((row) => {
        const event = events.get(row.eventId);
        return event
          ? [
              {
                id: event.id,
                title: event.title,
                type: event.type,
                date: event.startsOn,
                outcome: row.outcome,
              },
            ]
          : [];
      }),
    practice: db.practiceLogs
      .filter((row) => row.studentId === studentId)
      .map((row) => ({ date: row.date, minutes: row.minutes })),
  };
}

/**
 * Replaces one student's ledger rows with a fresh derivation. Does not persist —
 * the caller flushes once, so a mutation and the points it implies land together.
 */
export function rebuildLedger(db: Database, studentId: string, today: string): LedgerEntry[] {
  const ledger = deriveLedger(momentumInputs(db, studentId, today), db.settings.momentumPoints);

  db.momentum = db.momentum.filter((row) => row.studentId !== studentId);
  for (const entry of ledger) {
    db.momentum.push({
      id: `mom-${studentId}-${entry.source}-${entry.refId}`,
      studentId,
      ...entry,
    });
  }

  return ledger;
}
