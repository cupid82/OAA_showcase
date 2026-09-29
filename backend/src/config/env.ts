import 'dotenv/config';
import { z } from 'zod';

/** "a, b ,c" → ['a', 'b', 'c'], lowercased; empty or missing → []. */
const csvList = z
  .string()
  .optional()
  .transform((value) =>
    (value ?? '')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );

const onOff = (fallback: 'on' | 'off') => z.enum(['on', 'off']).default(fallback);

/** An empty string in `.env` means "not set", not "set to nothing". */
const optional = z
  .string()
  .optional()
  .transform((value) => (value && value.trim() !== '' ? value.trim() : undefined));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  /** Unused — left over from the original scaffold. The database is SUPABASE_DB_URL. */
  DATABASE_URL: z.string().optional(),
  /**
   * Required — there is deliberately no fallback. A default secret would sign
   * tokens that any copy of this repo could forge. Used for roll-number sign-in;
   * Google sign-in uses Supabase's own tokens.
   */
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('12h'),
  /** JSON data file, used only when SUPABASE_DB_URL is not set. `data/` is gitignored. */
  DATA_FILE: z.string().default('data/oaa-data.json'),
  /**
   * Optional. GitHub's public API allows 60 unauthenticated requests an hour per
   * IP; a personal access token with no scopes raises that to 5,000. Syncing works
   * without it.
   */
  GITHUB_TOKEN: optional,

  // --- Supabase ------------------------------------------------------------------
  /** `https://<project-ref>.supabase.co` — enables Google sign-in. */
  SUPABASE_URL: optional.pipe(z.string().url().optional()),
  /**
   * The project's publishable (or legacy anon) key. Public by design. Only used to
   * ask Supabase Auth to validate a token when the project still signs tokens with
   * a shared secret instead of asymmetric keys.
   */
  SUPABASE_PUBLISHABLE_KEY: optional,
  /**
   * Postgres connection string. When set, Supabase Postgres is the database and
   * the JSON file is not used. Use the **session pooler** string from the
   * dashboard's Connect panel (IPv4-friendly, suits a long-running server).
   */
  SUPABASE_DB_URL: optional,
  /**
   * Optional path to the Supabase root certificate (dashboard → Database →
   * SSL configuration). With it, the server verifies the database's certificate;
   * without it the connection is still encrypted but the certificate is not
   * checked.
   */
  SUPABASE_DB_CA_CERT: optional,

  // --- Who may sign in, and how ---------------------------------------------------
  /** Google accounts that become moderators on their first sign-in. */
  ADMIN_EMAILS: csvList,
  /**
   * If set, only Google accounts on these domains may create a student account
   * (e.g. `college.edu`). Empty means any Google account may.
   */
  ALLOWED_EMAIL_DOMAINS: csvList,
  /** Roll-number + password sign-in, used by the seeded demo accounts. */
  PASSWORD_LOGIN: onOff('on'),
  /** Seed demo students, projects, events and jobs into an empty database. */
  SEED_DEMO: onOff('on'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';

/** Google sign-in works when the backend knows which Supabase project to trust. */
export const googleSignInEnabled = env.SUPABASE_URL !== undefined;
