/**
 * The few Cloudflare runtime APIs `worker.ts` and `durableObjectStore.ts` use.
 *
 * Declared by hand on purpose: `@cloudflare/workers-types` declares the whole
 * Workers runtime as globals, and those collide with `@types/node` in a program
 * that is also a Node server. The implementations come from the runtime — these
 * are only their shapes, trimmed to what this code calls.
 */

declare module 'cloudflare:workers' {
  export abstract class DurableObject<Env = unknown> {
    protected ctx: DurableObjectState;
    protected env: Env;
    constructor(ctx: DurableObjectState, env: Env);
    fetch?(request: Request): Response | Promise<Response>;
  }
}

declare module 'cloudflare:node' {
  /** Hands `request` to the node:http server listening on `port` in this isolate. */
  export function handleAsNodeRequest(port: number, request: Request): Promise<Response>;
}

interface DurableObjectState {
  readonly storage: DurableObjectStorage;
  /** Holds every other event until `callback` settles. */
  blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>;
}

/** The key-value storage API. A call takes at most 128 keys. */
interface DurableObjectStorage {
  get<T = unknown>(key: string): Promise<T | undefined>;
  get<T = unknown>(keys: string[]): Promise<Map<string, T>>;
  put<T>(key: string, value: T): Promise<void>;
  put<T>(entries: Record<string, T>): Promise<void>;
  delete(key: string): Promise<boolean>;
  delete(keys: string[]): Promise<number>;
}

interface DurableObjectId {
  toString(): string;
}

interface DurableObjectStub {
  fetch(request: Request): Promise<Response>;
}

interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}

/** A binding that answers requests — here, the static assets. */
interface Fetcher {
  fetch(request: Request): Promise<Response>;
}
