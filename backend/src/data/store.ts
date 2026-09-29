/**
 * The persistence seam.
 *
 * The store keeps the whole dataset in memory; services read and change it through
 * `getDb()` and call `persist()` after a write. Where the data lives between
 * restarts is decided once, here:
 *
 * - **Supabase Postgres** when `SUPABASE_DB_URL` is set — the real deployment.
 * - **A JSON file** otherwise — for tests, CI and working offline.
 *
 * Nothing above this file knows which one is in use. That is the seam: routes and
 * pages were untouched when Postgres was added.
 */
import path from 'node:path';

import { env } from '../config/env.js';
import { createFileStore } from './fileStore.js';
import type { Persistence } from './persistence.js';
import { createPostgresStore } from './postgresStore.js';
import { buildSeed } from './seed.js';
import type { Database } from './types.js';

const DATA_FILE = path.resolve(process.cwd(), env.DATA_FILE);

let db: Database | null = null;
let persistence: Persistence | null = null;

/** Serialises `persist()` calls so two writers can never interleave. */
let writeChain: Promise<void> = Promise.resolve();

export interface StoreStatus {
  backend: string;
  /** How the data got there on this start. */
  origin: 'loaded' | 'seeded' | 'imported';
}

/**
 * Loads the dataset. On an empty Supabase database, an existing local JSON file
 * is imported rather than a fresh seed — work done before the switch carries
 * over. With neither, the seed runs. Called once from `server.ts` before the HTTP
 * listener starts, so no request can observe a half-loaded store.
 */
export async function initStore(): Promise<StoreStatus> {
  const file = createFileStore(DATA_FILE);
  persistence = env.SUPABASE_DB_URL
    ? createPostgresStore(env.SUPABASE_DB_URL, env.SUPABASE_DB_CA_CERT)
    : file;

  const existing = await persistence.load();
  if (existing) {
    db = existing;
    return { backend: persistence.describe, origin: 'loaded' };
  }

  if (persistence !== file && file.exists()) {
    const local = await file.load();
    if (local) {
      db = local;
      await persistence.save(db);
      return { backend: persistence.describe, origin: 'imported' };
    }
  }

  db = await buildSeed({ demo: env.SEED_DEMO === 'on' });
  await persistence.save(db);
  return { backend: persistence.describe, origin: 'seeded' };
}

export function getDb(): Database {
  if (!db) throw new Error('Store not initialised — call initStore() before handling requests.');
  return db;
}

/**
 * Saves the in-memory dataset. Writes are queued, never concurrent — and a failed
 * write does not poison the queue: the next save still runs, and (for Postgres)
 * retries whatever the failed one could not store.
 */
export function persist(): Promise<void> {
  const current = getDb();
  const target = persistence;
  if (!target) throw new Error('Store not initialised — call initStore() before handling requests.');

  const next = writeChain.catch(() => undefined).then(() => target.save(current));
  writeChain = next;
  return next;
}

/** Waits for queued writes, then releases the database connection. */
export async function closeStore(): Promise<void> {
  await writeChain.catch(() => undefined);
  await persistence?.close?.();
}
