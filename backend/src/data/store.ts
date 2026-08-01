/**
 * The persistence layer — a single JSON document on disk.
 *
 * This project intentionally runs without a database server. The store keeps the
 * whole dataset in memory and writes it back atomically (temp file + rename) so a
 * crash mid-write cannot truncate the file.
 *
 * Everything above this file talks to services, and services talk to `getDb()`.
 * Nothing else reads or writes the JSON. That is the seam: replacing this file
 * with Prisma leaves routes and pages untouched.
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { env } from '../config/env.js';
import { buildSeed } from './seed.js';
import type { Database } from './types.js';

const DATA_FILE = path.resolve(process.cwd(), env.DATA_FILE);

let db: Database | null = null;

/** Serialises concurrent `persist()` calls so two writers cannot interleave. */
let writeChain: Promise<void> = Promise.resolve();

function readFromDisk(): Database | null {
  if (!existsSync(DATA_FILE)) return null;

  try {
    return JSON.parse(readFileSync(DATA_FILE, 'utf8')) as Database;
  } catch (error) {
    // A corrupt file must not be silently replaced — that would delete real data.
    throw new Error(
      `Data file at ${DATA_FILE} is not valid JSON. Fix or delete it to reseed. (${String(error)})`,
    );
  }
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
