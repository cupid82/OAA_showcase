import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().optional(),
  /**
   * Required — there is deliberately no fallback. A default secret would sign
   * tokens that any copy of this repo could forge.
   */
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('12h'),
  /** JSON data file, relative to the backend workspace root. `data/` is gitignored. */
  DATA_FILE: z.string().default('data/oaa-data.json'),
  /**
   * Optional. GitHub's public API allows 60 unauthenticated requests an hour per
   * IP; a personal access token with no scopes raises that to 5,000. Syncing works
   * without it.
   */
  GITHUB_TOKEN: z.string().optional(),
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
