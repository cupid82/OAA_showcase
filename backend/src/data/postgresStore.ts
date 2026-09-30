/**
 * The Supabase Postgres backend.
 *
 * The store still serves every read from memory — the services were written that
 * way, and it keeps a page render free of network round-trips. What changes is
 * where the data lives: in real tables (see `schema.ts`), loaded once at start-up
 * and written back after every mutation.
 *
 * **Writes are diffs, not dumps.** The backend remembers what it last saved, row
 * by row. A save compares, and sends only the rows that were added, changed or
 * removed — all in one transaction, so the database never holds half a write.
 * If a save fails, nothing is marked as saved and the next one retries it.
 *
 * One consequence to know about: this assumes **one backend instance** owns the
 * data. Two servers against the same database would each keep their own copy in
 * memory and overwrite each other.
 */
import { readFileSync } from 'node:fs';

import pg from 'pg';

import { IDEA_SEEDS, SKILL_SEEDS, TRACK_SEEDS } from './catalog.js';
import type { Persistence } from './persistence.js';
import { TABLES, fromRecord, qualified, quote, schemaSql, toParams } from './schema.js';
import type { TableSpec } from './schema.js';
import { SCHEMA_VERSION } from './types.js';
import type { Database } from './types.js';

const OID = { date: 1082, timestamptz: 1184 } as const;

/**
 * Dates come back as the same `YYYY-MM-DD` strings the app stores, and instants
 * as ISO strings — never as JS `Date` objects, which the services would compare
 * as objects rather than as text.
 */
const types = {
  getTypeParser(oid: number, format?: 'text' | 'binary') {
    if (oid === OID.date) return (value: string) => value;
    if (oid === OID.timestamptz) {
      const parse = pg.types.getTypeParser(OID.timestamptz) as (value: string) => Date;
      return (value: string) => parse(value).toISOString();
    }
    return pg.types.getTypeParser(oid, format);
  },
} as pg.CustomTypesConfig;

/** Rows per insert. Well under Postgres's 65,535-parameter limit for the widest table. */
const BATCH = 250;

function connectionConfig(url: string, caCertPath: string | undefined): pg.PoolConfig {
  let connectionString = url;
  let ssl: pg.PoolConfig['ssl'] = { rejectUnauthorized: false };

  try {
    const parsed = new URL(url);
    const mode = parsed.searchParams.get('sslmode');
    // Our `ssl` object below is the single source of SSL settings; an `sslmode`
    // in the string would silently override it.
    parsed.searchParams.delete('sslmode');
    connectionString = parsed.toString();
    if (mode === 'disable') ssl = false;
  } catch {
    // Not parseable as a URL (e.g. an unencoded character in the password) —
    // hand it to the driver unchanged.
  }

  if (ssl !== false && caCertPath) {
    ssl = { ca: readFileSync(caCertPath, 'utf8'), rejectUnauthorized: true };
  }

  return {
    connectionString,
    ssl,
    types,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    application_name: 'oaa-backend',
  };
}

/** The host, for logs — never the credentials. */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'the configured database';
  }
}

/** Postgres returns rows in no particular order; the catalogue has a meaningful one. */
function orderCatalogue(db: Database): void {
  const byOrder = <T extends { id: string }>(rows: T[], seeds: { id: string }[]) => {
    const rank = new Map(seeds.map((seed, index) => [seed.id, index]));
    rows.sort(
      (a, b) =>
        (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER) ||
        a.id.localeCompare(b.id),
    );
  };
  byOrder(db.skills, SKILL_SEEDS);
  byOrder(db.tracks, TRACK_SEEDS);
  byOrder(db.projectIdeas, IDEA_SEEDS);
}

type Row = Record<string, unknown> & { id: string };

function rowsOf(db: Database, spec: TableSpec): Row[] {
  const value = db[spec.key] as unknown;
  return (spec.singleton ? [value] : value) as Row[];
}

export function createPostgresStore(url: string, caCertPath?: string): Persistence {
  const pool = new pg.Pool(connectionConfig(url, caCertPath));
  // An idle client can be dropped by the pooler; log it rather than crash.
  pool.on('error', (error) => console.error('[backend] database connection error:', error.message));

  /** table → (id → JSON of the row as last saved). */
  const saved = new Map<string, Map<string, string>>();

  async function upsert(client: pg.PoolClient, spec: TableSpec, rows: Row[]): Promise<void> {
    const columns = spec.columns.map((column) => quote(column.column)).join(', ');
    const updates = spec.columns
      .filter((column) => column.field !== 'id')
      .map((column) => `${quote(column.column)} = excluded.${quote(column.column)}`)
      .join(', ');

    for (let start = 0; start < rows.length; start += BATCH) {
      const batch = rows.slice(start, start + BATCH);
      const params: unknown[] = [];
      const tuples = batch.map((row) => {
        const values = toParams(spec, row);
        const placeholders = values.map((value) => {
          params.push(value);
          return `$${params.length}`;
        });
        return `(${placeholders.join(', ')})`;
      });

      await client.query(
        `insert into ${qualified(spec.table)} (${columns}) values ${tuples.join(', ')} ` +
          `on conflict ("id") do update set ${updates}`,
        params,
      );
    }
  }

  return {
    describe: `Supabase Postgres (${hostOf(url)})`,

    async load() {
      // Idempotent: creates whatever is missing, and re-applies the lockdown.
      await pool.query(schemaSql());

      const meta = await pool.query<{ schema_version: number }>(
        `select "schema_version" from ${qualified('app_meta')} where "id" = 'singleton'`,
      );
      const version = meta.rows[0]?.schema_version;
      if (version === undefined) return null;
      if (version !== SCHEMA_VERSION) {
        // Unlike the JSON file, a database is never set aside automatically.
        throw new Error(
          `The database is at schema ${version}; this build expects ${SCHEMA_VERSION}. ` +
            'Migrate it before starting this version.',
        );
      }

      const db: Record<string, unknown> = {};
      for (const spec of TABLES) {
        const result = await pool.query<Record<string, unknown>>(
          `select * from ${qualified(spec.table)} order by "id"`,
        );
        const rows = result.rows.map((record) => fromRecord(spec, record) as Row);
        db[spec.key] = spec.singleton ? rows[0] : rows;
        saved.set(spec.table, new Map(rows.map((row) => [row.id, JSON.stringify(row)])));
      }

      const loaded = db as unknown as Database;
      if (!loaded.settings)
        throw new Error('The database has no settings row. Reseed or restore it.');
      orderCatalogue(loaded);
      return loaded;
    },

    async save(db) {
      const changes: {
        spec: TableSpec;
        upserts: Row[];
        deletes: string[];
        now: Map<string, string>;
      }[] = [];

      // Snapshot synchronously: requests that change the data while this save
      // is in flight are picked up by the next one.
      for (const spec of TABLES) {
        const before = saved.get(spec.table) ?? new Map<string, string>();
        const now = new Map<string, string>();
        const upserts: Row[] = [];

        for (const row of rowsOf(db, spec)) {
          const json = JSON.stringify(row);
          now.set(row.id, json);
          if (before.get(row.id) !== json) upserts.push(JSON.parse(json) as Row);
        }

        const deletes = [...before.keys()].filter((id) => !now.has(id));
        if (upserts.length > 0 || deletes.length > 0) changes.push({ spec, upserts, deletes, now });
      }

      if (changes.length === 0) return;

      const client = await pool.connect();
      try {
        await client.query('begin');
        // Children before parents when removing; parents before children when
        // adding. The foreign keys are deferred as well, so this is belt and braces.
        for (const change of [...changes].reverse()) {
          if (change.deletes.length === 0) continue;
          await client.query(
            `delete from ${qualified(change.spec.table)} where "id" = any($1::text[])`,
            [change.deletes],
          );
        }
        for (const change of changes) {
          if (change.upserts.length > 0) await upsert(client, change.spec, change.upserts);
        }
        await client.query('commit');
      } catch (error) {
        await client.query('rollback').catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }

      for (const change of changes) saved.set(change.spec.table, change.now);
    },

    async close() {
      await pool.end();
    },
  };
}
