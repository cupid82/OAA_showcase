/**
 * The JSON-file backend: the whole dataset as one document on disk, written
 * atomically (temp file + rename) so a crash mid-write cannot truncate it.
 *
 * Used when no Supabase database is configured — for tests, for CI, and for
 * working offline. Supabase Postgres is the backend in every real deployment.
 */
import { existsSync, mkdirSync, readFileSync, renameSync } from 'node:fs';
import { rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_POINTS } from '../lib/momentum.js';
import type { Persistence } from './persistence.js';
import { SCHEMA_VERSION } from './types.js';
import type { Database, UserRow } from './types.js';

/**
 * Fills in tables a file written by an earlier build of the same schema doesn't
 * have yet. Without this, adding a table would make every existing data file
 * crash on the first `.filter()`.
 */
export function withMissingTables(loaded: Partial<Database>): Database {
  return {
    meta: loaded.meta ?? {
      id: 'singleton',
      schemaVersion: SCHEMA_VERSION,
      seededAt: new Date().toISOString(),
    },
    users: loaded.users ?? [],
    students: loaded.students ?? [],
    preferences: loaded.preferences ?? [],
    skills: loaded.skills ?? [],
    tracks: loaded.tracks ?? [],
    studentSkills: loaded.studentSkills ?? [],
    practiceLogs: loaded.practiceLogs ?? [],
    certificates: loaded.certificates ?? [],
    projects: loaded.projects ?? [],
    projectTasks: loaded.projectTasks ?? [],
    projectMembers: loaded.projectMembers ?? [],
    joinRequests: loaded.joinRequests ?? [],
    projectIdeas: loaded.projectIdeas ?? [],
    events: loaded.events ?? [],
    eventParticipation: loaded.eventParticipation ?? [],
    jobs: loaded.jobs ?? [],
    applications: loaded.applications ?? [],
    dismissals: loaded.dismissals ?? [],
    checkins: loaded.checkins ?? [],
    connections: loaded.connections ?? [],
    notifications: loaded.notifications ?? [],
    momentum: loaded.momentum ?? [],
    settings: loaded.settings ?? {
      id: 'singleton',
      academicYear: '2026–27',
      erpName: 'College ERP',
      erpUrl: 'https://erp.college.example',
      momentumPoints: { ...DEFAULT_POINTS },
      wellbeingSupport: [],
    },
    auditLogs: loaded.auditLogs ?? [],
  };
}

/**
 * Schema 2 → 3 only *added* things (a user's email and Supabase link, nullable
 * student details), so a v2 file is upgraded in place rather than set aside.
 */
function upgradeFromV2(parsed: Partial<Database>): Partial<Database> {
  const students = parsed.students ?? [];
  return {
    ...parsed,
    meta: { id: 'singleton', schemaVersion: SCHEMA_VERSION, seededAt: parsed.meta?.seededAt ?? new Date().toISOString() },
    users: (parsed.users ?? []).map((user): UserRow => {
      const legacy = user as Partial<UserRow> & Omit<UserRow, 'email' | 'authId'>;
      return {
        ...legacy,
        email:
          legacy.email ??
          students.find((student) => student.userId === legacy.id)?.email.toLowerCase() ??
          null,
        authId: legacy.authId ?? null,
      };
    }),
  };
}

export function createFileStore(file: string): Persistence & { exists(): boolean } {
  /**
   * A file from an older, incompatible schema — the ERP-shaped portal this app
   * used to be — is moved aside, never deleted and never half-read.
   */
  function setAside(reason: string): void {
    const stamp = new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, '')
      .slice(0, 14);
    const backup = file.replace(/\.json$/, '') + `.backup-${stamp}.json`;
    renameSync(file, backup);
    console.warn(`[backend] ${reason} Moved it to ${backup} and seeding a fresh one.`);
  }

  return {
    describe: `JSON file ${file}`,

    exists: () => existsSync(file),

    async load() {
      if (!existsSync(file)) return null;

      let parsed: Partial<Database>;
      try {
        parsed = JSON.parse(readFileSync(file, 'utf8')) as Partial<Database>;
      } catch (error) {
        // A corrupt file must not be silently replaced — that would delete real data.
        throw new Error(
          `Data file at ${file} is not valid JSON. Fix or delete it to reseed. (${String(error)})`,
        );
      }

      const version = parsed.meta?.schemaVersion ?? 1;
      if (version === 2) parsed = upgradeFromV2(parsed);
      else if (version !== SCHEMA_VERSION) {
        setAside(`Data file is schema ${version}; this build expects ${SCHEMA_VERSION}.`);
        return null;
      }

      return withMissingTables(parsed);
    },

    async save(db: Database) {
      mkdirSync(path.dirname(file), { recursive: true });
      const temp = `${file}.tmp`;
      await writeFile(temp, JSON.stringify(db, null, 2), 'utf8');
      await rename(temp, file);
    },
  };
}
