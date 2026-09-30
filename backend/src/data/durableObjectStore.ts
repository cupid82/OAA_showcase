/**
 * The Cloudflare backend: the same JSON document the file store writes, kept in a
 * Durable Object's storage, because Workers have no disk. `worker.ts` uses it
 * unless a Supabase database is configured.
 *
 * One Durable Object instance owns the data — the Worker sends it every API
 * call — so the store's model of one process holding the working copy in memory
 * holds exactly as it does on a server.
 *
 * A stored value is capped at 2 MB, so the document is kept in chunks. A save
 * writes every chunk and the chunk count as one atomic batch: a load never sees
 * half of one save and half of another.
 */
import { fromStoredDocument } from './fileStore.js';
import type { Persistence } from './persistence.js';
import { SCHEMA_VERSION } from './types.js';
import type { Database } from './types.js';

const PREFIX = 'oaa-data';

/**
 * Characters per chunk. A string is stored at up to two bytes a character, so a
 * chunk stays well under the 2 MB value limit.
 */
const CHUNK = 500_000;

/** A call takes at most 128 keys: the count plus 127 chunks, about 60 MB of JSON. */
const MAX_CHUNKS = 127;

const countKey = (prefix: string) => `${prefix}:chunks`;
const chunkKeys = (prefix: string, from: number, to: number) =>
  Array.from({ length: Math.max(0, to - from) }, (_, index) => `${prefix}:${from + index}`);

/** The count and the chunks of `json`, ready for one `put()`. */
function entriesFor(prefix: string, json: string): Record<string, string | number> {
  const count = Math.max(1, Math.ceil(json.length / CHUNK));
  if (count > MAX_CHUNKS) {
    throw new Error(`The dataset (${json.length} characters) is too large to store.`);
  }

  const entries: Record<string, string | number> = { [countKey(prefix)]: count };
  chunkKeys(prefix, 0, count).forEach((key, index) => {
    entries[key] = json.slice(index * CHUNK, (index + 1) * CHUNK);
  });
  return entries;
}

export function createDurableObjectStore(storage: DurableObjectStorage): Persistence {
  /** Chunks the stored copy has, so a smaller save can drop its leftovers. */
  let stored = 0;

  /**
   * A dataset from an older, incompatible schema is moved aside under a backup
   * prefix — never deleted and never half-read — as the file store does.
   */
  async function setAside(json: string, count: number, version: number): Promise<void> {
    const stamp = new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, '')
      .slice(0, 14);
    const backup = `${PREFIX}.backup-${stamp}`;

    // No await between the two, so they commit together.
    const writes = [
      storage.put(entriesFor(backup, json)),
      storage.delete([countKey(PREFIX), ...chunkKeys(PREFIX, 0, count)]),
    ];
    await Promise.all(writes);
    stored = 0;
    console.warn(
      `[backend] Stored data is schema ${version}; this build expects ${SCHEMA_VERSION}. ` +
        `Moved it to ${backup} and seeding a fresh copy.`,
    );
  }

  return {
    describe: 'Durable Object storage',

    async load() {
      const count = await storage.get<number>(countKey(PREFIX));
      if (count === undefined) return null;

      const keys = chunkKeys(PREFIX, 0, count);
      const chunks = await storage.get<string>(keys);
      const json = keys
        .map((key) => {
          const chunk = chunks.get(key);
          if (chunk === undefined) throw new Error(`Stored data is missing ${key}.`);
          return chunk;
        })
        .join('');

      let parsed: Partial<Database>;
      try {
        parsed = JSON.parse(json) as Partial<Database>;
      } catch (error) {
        // Corrupt data must not be silently replaced — that would delete real data.
        throw new Error(`Stored data is not valid JSON. (${String(error)})`);
      }
      stored = count;

      const db = fromStoredDocument(parsed);
      if (!db) await setAside(json, count, parsed.meta?.schemaVersion ?? 1);
      return db;
    },

    async save(db: Database) {
      const entries = entriesFor(PREFIX, JSON.stringify(db));
      const count = entries[countKey(PREFIX)] as number;
      const leftovers = chunkKeys(PREFIX, count, stored);

      // No await between the two, so they commit together.
      const writes: Promise<unknown>[] = [storage.put(entries)];
      if (leftovers.length > 0) writes.push(storage.delete(leftovers));
      await Promise.all(writes);
      stored = count;
    },
  };
}
