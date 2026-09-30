/**
 * Tests for the Durable Object store — the one piece of the Cloudflare build that
 * a local `wrangler dev` run doesn't reach: the seeded dataset fits in one chunk,
 * so splitting, shrinking and setting aside only happen here.
 *
 * The fake storage enforces the real limits (128 keys a call, 2 MB a value), so a
 * store that would break on Cloudflare breaks here first.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createDurableObjectStore } from './durableObjectStore.js';
import { withMissingTables } from './fileStore.js';
import { SCHEMA_VERSION } from './types.js';
import type { AuditLogRow, Database } from './types.js';

const MAX_KEYS = 128;
const MAX_VALUE_BYTES = 2 * 1024 * 1024;

/** A Map standing in for Durable Object storage, with its limits. */
function fakeStorage() {
  const data = new Map<string, unknown>();
  const keysOf = (keys: string | string[]) => {
    const list = Array.isArray(keys) ? keys : [keys];
    assert.ok(list.length <= MAX_KEYS, `a call takes at most ${MAX_KEYS} keys`);
    return list;
  };

  const storage = {
    async get(keys: string | string[]) {
      if (!Array.isArray(keys)) return data.get(keys);
      return new Map(keysOf(keys).flatMap((key) => (data.has(key) ? [[key, data.get(key)]] : [])));
    },
    async put(keyOrEntries: string | Record<string, unknown>, value?: unknown) {
      const entries = typeof keyOrEntries === 'string' ? { [keyOrEntries]: value } : keyOrEntries;
      keysOf(Object.keys(entries));
      for (const [key, entry] of Object.entries(entries)) {
        // Strings are stored at up to two bytes a character.
        const bytes = typeof entry === 'string' ? entry.length * 2 : 8;
        assert.ok(bytes <= MAX_VALUE_BYTES, `${key} is over the 2 MB value limit`);
        data.set(key, entry);
      }
    },
    async delete(keys: string | string[]) {
      const removed = keysOf(keys).filter((key) => data.delete(key)).length;
      return Array.isArray(keys) ? removed : removed > 0;
    },
  } as unknown as DurableObjectStorage;

  return { storage, data };
}

function emptyDatabase(schemaVersion = SCHEMA_VERSION): Database {
  return withMissingTables({
    meta: { id: 'singleton', schemaVersion, seededAt: '2026-09-29T10:00:00.000Z' },
  });
}

/** An audit entry carrying `size` characters, to push the dataset past one chunk. */
function bulky(id: string, size: number): AuditLogRow {
  return {
    id,
    actorId: 'usr-admin',
    actorRole: 'admin',
    action: 'event.update',
    entity: 'event',
    entityId: 'evt-1',
    before: null,
    after: { note: 'é'.repeat(size) },
    at: '2026-09-29T10:00:00.000Z',
  };
}

describe('Durable Object store', () => {
  it('loads nothing from empty storage', async () => {
    const { storage } = fakeStorage();
    assert.equal(await createDurableObjectStore(storage).load(), null);
  });

  it('reads back what it saved, in a new instance', async () => {
    const { storage } = fakeStorage();
    const db = emptyDatabase();
    await createDurableObjectStore(storage).save(db);

    assert.deepEqual(await createDurableObjectStore(storage).load(), db);
  });

  it('splits a large dataset into chunks and drops the extras when it shrinks', async () => {
    const { storage, data } = fakeStorage();
    const store = createDurableObjectStore(storage);
    const db = emptyDatabase();

    // Past two chunks, in characters that take two bytes each.
    db.auditLogs.push(bulky('aud-1', 1_200_000));
    await store.save(db);
    assert.equal(data.get('oaa-data:chunks'), 3);
    assert.deepEqual(await createDurableObjectStore(storage).load(), db);

    db.auditLogs = [];
    await store.save(db);
    assert.equal(data.get('oaa-data:chunks'), 1);
    assert.equal(data.has('oaa-data:1'), false);
    assert.equal(data.has('oaa-data:2'), false);
    assert.deepEqual(await createDurableObjectStore(storage).load(), db);
  });

  it('sets a dataset from another schema aside instead of reading or deleting it', async () => {
    const { storage, data } = fakeStorage();
    const old = emptyDatabase(1);
    await createDurableObjectStore(storage).save(old);

    assert.equal(await createDurableObjectStore(storage).load(), null);
    assert.equal(data.has('oaa-data:chunks'), false);

    const backups = [...data.keys()].filter((key) => /^oaa-data\.backup-\d{14}:chunks$/.test(key));
    assert.equal(backups.length, 1);
    const prefix = backups[0]!.replace(/:chunks$/, '');
    assert.deepEqual(JSON.parse(data.get(`${prefix}:0`) as string), old);
  });

  it('refuses to replace data it cannot parse', async () => {
    const { storage } = fakeStorage();
    await storage.put({ 'oaa-data:chunks': 1, 'oaa-data:0': '{ not json' });
    await assert.rejects(createDurableObjectStore(storage).load(), /not valid JSON/);
  });
});
