import { useEffect, useMemo, useState } from 'react';

import { api } from '@/lib/api';
import type { Catalog, Meta } from '@/types';

/**
 * Reference data that every page may need and that never changes within a
 * session: the skill catalogue and the site metadata. Fetched once, cached at
 * module level, shared by every component that asks.
 */
function cached<T>(path: string) {
  let promise: Promise<T> | null = null;
  let value: T | null = null;

  return {
    get: () => value,
    load: () => {
      promise ??= api
        .get<{ data: T }>(path)
        .then((payload) => {
          value = payload.data;
          return payload.data;
        })
        .catch((error: unknown) => {
          // Let the next caller try again rather than caching a failure.
          promise = null;
          throw error;
        });
      return promise;
    },
  };
}

const catalogCache = cached<Catalog>('/api/catalog');
const metaCache = cached<Meta>('/api/meta');

function useCached<T>(cache: ReturnType<typeof cached<T>>): T | null {
  const [value, setValue] = useState<T | null>(cache.get());

  useEffect(() => {
    if (value) return;
    let cancelled = false;
    cache
      .load()
      .then((loaded) => {
        if (!cancelled) setValue(loaded);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [cache, value]);

  return value;
}

export function useCatalog() {
  const catalog = useCached(catalogCache);

  return useMemo(() => {
    const skills = new Map(catalog?.skills.map((skill) => [skill.id, skill]) ?? []);
    const tracks = new Map(catalog?.tracks.map((track) => [track.id, track]) ?? []);
    return {
      catalog,
      skillName: (id: string) => skills.get(id)?.name ?? id,
      trackName: (id: string) => tracks.get(id)?.name ?? id,
    };
  }, [catalog]);
}

export function useMeta(): Meta | null {
  return useCached(metaCache);
}
