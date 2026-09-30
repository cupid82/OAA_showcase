/**
 * The Cloudflare Workers entry point — `server.ts` is the Node one.
 *
 * One Worker serves the whole app (see wrangler.jsonc):
 *
 * - `/api/*` goes to a single Durable Object running the same Express app that
 *   `server.ts` runs. One instance owns the in-memory dataset, exactly as one
 *   Node process does, and it has a Durable Object's CPU budget — bcrypt needs
 *   far more than a plain Worker's 10 ms on the free plan.
 * - Everything else is the built frontend (`frontend/dist`), with index.html for
 *   client-side routes. Cloudflare serves those without running this code.
 *
 * The data lives in the Durable Object's storage (`durableObjectStore.ts`), or in
 * Supabase Postgres when `SUPABASE_DB_URL` is set.
 */
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import type { Server } from 'node:http';

import { handleAsNodeRequest } from 'cloudflare:node';
import { DurableObject } from 'cloudflare:workers';

interface Env {
  OAA_API: DurableObjectNamespace;
  ASSETS: Fetcher;
}

/** Routes a request to Express inside this isolate — a label, not a network port. */
const EXPRESS_PORT = 4000;

/**
 * The one Durable Object that holds the data. Renaming it starts an empty
 * dataset: the old one stays in storage under the old name.
 */
const INSTANCE = 'oaa';

/** Where a generated JWT secret is kept, in the Durable Object's own storage. */
const JWT_SECRET_KEY = 'jwt-secret';

/**
 * Built once per isolate. The app reads through the store, so a Durable Object
 * recreated in the same isolate reloads the data and keeps the same server.
 */
let server: Server | null = null;

/**
 * `config/env.ts` reads `process.env` once, as it loads, and requires
 * JWT_SECRET. A secret set in the dashboard is used as is. Without one, a random
 * secret is made on first start and kept in storage — unique to this deployment
 * and never in the repo, so tokens stay valid across restarts and deploys.
 */
async function prepareEnvironment(env: Env, storage: DurableObjectStorage): Promise<void> {
  // Dashboard variables and secrets, for runtimes that don't copy them already.
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === 'string') process.env[key] ??= value;
  }

  if (process.env.JWT_SECRET?.trim()) return;
  let secret = await storage.get<string>(JWT_SECRET_KEY);
  if (!secret) {
    secret = randomBytes(48).toString('hex');
    await storage.put(JWT_SECRET_KEY, secret);
  }
  process.env.JWT_SECRET = secret;
}

export class OaaApi extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Nothing reaches fetch() until the data is loaded — the guarantee server.ts
    // gets by loading the store before it listens.
    void ctx.blockConcurrencyWhile(() => this.start());
  }

  private async start(): Promise<void> {
    await prepareEnvironment(this.env, this.ctx.storage);

    // Imported here rather than at the top: the backend's modules read their
    // configuration as they load, and a Worker's top level also runs at deploy
    // time, before any request — or secret — exists.
    const { env } = await import('./config/env.js');
    const { initStore } = await import('./data/store.js');
    const { createDurableObjectStore } = await import('./data/durableObjectStore.js');
    const { createApp } = await import('./app.js');

    const { backend, origin } = await initStore(
      env.SUPABASE_DB_URL ? undefined : createDurableObjectStore(this.ctx.storage),
    );
    console.log(`[backend] data ${origin} — ${backend}`);

    server ??= createServer(createApp({ requestLog: false })).listen(EXPRESS_PORT);
  }

  override async fetch(request: Request): Promise<Response> {
    return handleAsNodeRequest(EXPRESS_PORT, request);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname !== '/api' && !pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    try {
      return await env.OAA_API.get(env.OAA_API.idFromName(INSTANCE)).fetch(request);
    } catch (error) {
      // The API's own errors are already `{ error }` responses; this is the
      // Durable Object failing to start or answer at all.
      console.error('[worker] the API did not answer:', error);
      return Response.json(
        { error: { message: 'The server is starting up or unavailable. Try again in a moment.' } },
        { status: 503 },
      );
    }
  },
};
