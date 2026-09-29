/**
 * The persistence layer — a single JSON document on disk.
 *
 * This project intentionally runs without a database server. The store keeps the
 * whole dataset in memory and writes it back atomically (temp file + rename) so a
 * crash mid-write cannot truncate the file.
 *
 * Everything above this file talks to services, and services talk to `getDb()`.
 * Nothing else reads or writes the JSON. That is the seam: replacing this file
 * with a real database leaves routes and pages untouched.
 */
import { existsSync, mkdirSync, readFileSync, renameSync } from 'node:fs';
import { rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { env } from '../config/env.js';
import { DEFAULT_POINTS } from '../lib/momentum.js';
import { buildSeed } from './seed.js';
import { SCHEMA_VERSION } from './types.js';
import type { Database } from './types.js';

const DATA_FILE = path.resolve(process.cwd(), env.DATA_FILE);

let db: Database | null = null;

/** Serialises concurrent `persist()` calls so two writers cannot interleave. */
let writeChain: Promise<void> = Promise.resolve();

/**
 * Fills in tables a file written by an earlier build of the same schema doesn't
 * have yet. Without this, adding a table would make every existing data file
 * crash on the first `.filter()`.
 */
function withMissingTables(loaded: Partial<Database>): Database {
  return {
    meta: loaded.meta ?? { schemaVersion: SCHEMA_VERSION, seededAt: new Date().toISOString() },
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
 * A file from an older schema — the ERP-shaped portal this app used to be — is
 * moved aside, never deleted and never half-read. The caller then seeds a fresh
 * file. The old one stays on disk next to it, untouched.
 */
function setAside(reason: string): void {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, '')
    .slice(0, 14);
  const backup = DATA_FILE.replace(/\.json$/, '') + `.backup-${stamp}.json`;
  renameSync(DATA_FILE, backup);
  console.warn(`[backend] ${reason} Moved it to ${backup} and seeding a fresh one.`);
}

function readFromDisk(): Database | null {
  if (!existsSync(DATA_FILE)) return null;

  let parsed: Partial<Database>;
  try {
    parsed = JSON.parse(readFileSync(DATA_FILE, 'utf8')) as Partial<Database>;
  } catch (error) {
    // A corrupt file must not be silently replaced — that would delete real data.
    throw new Error(
      `Data file at ${DATA_FILE} is not valid JSON. Fix or delete it to reseed. (${String(error)})`,
    );
  }

  const version = parsed.meta?.schemaVersion ?? 1;
  if (version !== SCHEMA_VERSION) {
    setAside(`Data file is schema ${version}; this build expects ${SCHEMA_VERSION}.`);
    return null;
  }

  return withMissingTables(parsed);
}

async function writeToDisk(snapshot: Database): Promise<void> {
  mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const temp = `${DATA_FILE}.tmp`;
  await writeFile(temp, JSON.stringify(snapshot, null, 2), 'utf8');
  await rename(temp, DATA_FILE);
}

/**
 * Loads the dataset, seeding it on first run. Called once from `server.ts` before
 * the HTTP listener starts, so no request can observe a half-loaded store.
 */
export async function initStore(): Promise<{ seeded: boolean; file: string }> {
  const existing = readFromDisk();

  if (existing) {
    db = existing;
    return { seeded: false, file: DATA_FILE };
  }

  db = await buildSeed();
  await writeToDisk(db);
  return { seeded: true, file: DATA_FILE };
}

export function getDb(): Database {
  if (!db) throw new Error('Store not initialised — call initStore() before handling requests.');
  return db;
}

/** Flushes the in-memory dataset to disk. Writes are queued, never concurrent. */
export function persist(): Promise<void> {
  const snapshot = getDb();
  writeChain = writeChain.then(() => writeToDisk(snapshot));
  return writeChain;
}
