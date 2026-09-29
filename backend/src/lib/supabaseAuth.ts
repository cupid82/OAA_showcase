/**
 * Verifies Supabase Auth access tokens — the ones the browser gets after "Continue
 * with Google" — so the API can trust who is calling.
 *
 * Two cases, following Supabase's own guidance:
 *
 * - **Asymmetric signing keys** (the default for projects since May 2025): the
 *   token is checked locally against the project's public keys, fetched from its
 *   JWKS endpoint and cached briefly. No network call per request.
 * - **Legacy shared-secret (HS256) tokens**: there is no public key, so the token
 *   is sent to Supabase Auth's `/user` endpoint, which validates it. Results are
 *   cached for a minute so a page's burst of requests costs one check.
 *
 * Either way the issuer must be this project and the audience `authenticated`.
 * Claims used for authorisation come from `app_metadata`, which the user cannot
 * edit — never from `user_metadata`, which they can.
 */
import { createRemoteJWKSet, decodeJwt, decodeProtectedHeader, jwtVerify } from 'jose';
import type { JWTPayload } from 'jose';

import { env } from '../config/env.js';
import { HttpError } from './httpError.js';

export interface SupabaseIdentity {
  /** The Supabase Auth user id. */
  id: string;
  /** Lowercased. */
  email: string | null;
  /** Sign-in providers on the account, from app_metadata — e.g. `['google']`. */
  providers: string[];
  /** Display name — only ever used as a default, never for a decision. */
  name: string | null;
  isAnonymous: boolean;
}

const issuer = env.SUPABASE_URL ? `${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1` : null;

/** Supabase's edge caches the JWKS for ten minutes; don't hold it longer. */
const jwks = issuer
  ? createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`), { cacheMaxAge: 10 * 60_000 })
  : null;

/** True for a token issued by this app's Supabase project (not yet verified). */
export function isSupabaseToken(token: string): boolean {
  if (!issuer) return false;
  try {
    return decodeJwt(token).iss === issuer;
  } catch {
    return false;
  }
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

function toIdentity(source: {
  sub?: unknown;
  id?: unknown;
  email?: unknown;
  app_metadata?: unknown;
  user_metadata?: unknown;
  is_anonymous?: unknown;
}): SupabaseIdentity {
  const id = typeof source.sub === 'string' ? source.sub : typeof source.id === 'string' ? source.id : '';
  const app = asRecord(source.app_metadata);
  const meta = asRecord(source.user_metadata);
  const providers = Array.isArray(app.providers)
    ? app.providers.filter((entry): entry is string => typeof entry === 'string')
    : typeof app.provider === 'string'
      ? [app.provider]
      : [];
  const name =
    typeof meta.full_name === 'string' ? meta.full_name : typeof meta.name === 'string' ? meta.name : null;

  if (!id) throw HttpError.unauthorized('That sign-in token has no user.');

  return {
    id,
    email: typeof source.email === 'string' && source.email ? source.email.toLowerCase() : null,
    providers,
    name,
    isAnonymous: source.is_anonymous === true,
  };
}

// --- Legacy HS256: ask Supabase Auth -----------------------------------------------

const verifiedCache = new Map<string, { identity: SupabaseIdentity; until: number }>();
const CACHE_MS = 60_000;
const CACHE_LIMIT = 500;

async function verifyWithAuthServer(token: string): Promise<SupabaseIdentity> {
  const cached = verifiedCache.get(token);
  if (cached && cached.until > Date.now()) return cached.identity;

  if (!env.SUPABASE_PUBLISHABLE_KEY) {
    throw HttpError.unauthorized(
      'This Supabase project signs tokens with a shared secret. Set SUPABASE_PUBLISHABLE_KEY on the server so they can be checked.',
    );
  }

  let response: Response;
  try {
    response = await fetch(`${issuer}/user`, {
      headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw HttpError.badGateway('Could not reach Supabase to check your sign-in. Try again.');
  }
  if (!response.ok) throw HttpError.unauthorized('Your session has expired. Please sign in again.');

  const identity = toIdentity((await response.json()) as Record<string, unknown>);

  if (verifiedCache.size >= CACHE_LIMIT) verifiedCache.clear();
  // Never cache past the token's own expiry.
  const exp = decodeJwt(token).exp;
  const until = Math.min(Date.now() + CACHE_MS, exp ? exp * 1000 : Date.now() + CACHE_MS);
  verifiedCache.set(token, { identity, until });
  return identity;
}

// --- Public ------------------------------------------------------------------------------

export async function verifySupabaseToken(token: string): Promise<SupabaseIdentity> {
  if (!issuer || !jwks) throw HttpError.unauthorized('Google sign-in is not configured on this server.');

  let alg: string | undefined;
  try {
    alg = decodeProtectedHeader(token).alg;
  } catch {
    throw HttpError.unauthorized('Malformed session token.');
  }

  let identity: SupabaseIdentity;
  if (alg === 'HS256') {
    identity = await verifyWithAuthServer(token);
  } else {
    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(token, jwks, { issuer, audience: 'authenticated' }));
    } catch {
      throw HttpError.unauthorized('Your session has expired. Please sign in again.');
    }
    identity = toIdentity(payload);
  }

  if (identity.isAnonymous) throw HttpError.unauthorized('Sign in with Google to use OAA.');
  return identity;
}
