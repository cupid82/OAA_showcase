/**
 * A small client for GitHub's public REST API.
 *
 * Read-only and unauthenticated by default: it reads the same public profile and
 * repository list anyone can see at github.com/<handle>. It is only ever called
 * when a student presses "Sync" on their own linked account — never in the
 * background, never for someone else.
 *
 * Unauthenticated calls are limited to 60 an hour per server IP. Setting
 * `GITHUB_TOKEN` (a token with no scopes) raises that; nothing else changes.
 */
import { env } from '../config/env.js';
import type { GithubRepo, GithubSnapshot } from '../data/types.js';
import { HttpError } from './httpError.js';

const API = 'https://api.github.com';
const TIMEOUT_MS = 8000;
const TOP_LANGUAGES = 6;

interface GhUser {
  login: string;
  name: string | null;
  bio: string | null;
  html_url: string;
  public_repos: number;
  followers: number;
  following: number;
}

interface GhRepo {
  full_name: string;
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  fork: boolean;
  archived: boolean;
  pushed_at: string | null;
  html_url: string;
  homepage: string | null;
  topics?: string[];
}

async function gh<T>(path: string, handle: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API}${path}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'oaa-student-portal',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}),
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw HttpError.badGateway(
      'Could not reach GitHub. Check the server’s connection and try again.',
    );
  }

  if (response.status === 404) {
    throw HttpError.notFound(`GitHub has no user called “${handle}”. Check the username.`);
  }

  if (response.status === 403 || response.status === 429) {
    const reset = Number(response.headers.get('x-ratelimit-reset'));
    const minutes =
      Number.isFinite(reset) && reset > 0
        ? Math.max(1, Math.ceil((reset * 1000 - Date.now()) / 60_000))
        : null;
    throw HttpError.tooManyRequests(
      `GitHub is rate-limiting this server${minutes ? ` — try again in about ${minutes} minute${minutes === 1 ? '' : 's'}` : ''}.`,
    );
  }

  if (!response.ok)
    throw HttpError.badGateway(`GitHub answered with an error (${response.status}).`);

  return (await response.json()) as T;
}

/** A homepage is only kept if it is a real http(s) link. */
function safeLink(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(trimmed)) return `https://${trimmed}`;
  return null;
}

export async function fetchGithubSnapshot(handle: string): Promise<GithubSnapshot> {
  const encoded = encodeURIComponent(handle);
  const user = await gh<GhUser>(`/users/${encoded}`, handle);
  const repos = await gh<GhRepo[]>(
    `/users/${encoded}/repos?per_page=100&sort=pushed&type=owner`,
    handle,
  );

  const mapped: GithubRepo[] = repos.map((repo) => ({
    fullName: repo.full_name,
    name: repo.name,
    description: repo.description,
    language: repo.language,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    fork: repo.fork,
    archived: repo.archived,
    pushedAt: repo.pushed_at,
    htmlUrl: repo.html_url,
    homepage: safeLink(repo.homepage),
    topics: repo.topics ?? [],
  }));

  // Languages are counted over the student's own work — forks are someone else's.
  const counts = new Map<string, number>();
  for (const repo of mapped) {
    if (repo.fork || !repo.language) continue;
    counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1);
  }

  return {
    name: user.name,
    bio: user.bio,
    profileUrl: user.html_url,
    publicRepos: user.public_repos,
    followers: user.followers,
    following: user.following,
    topLanguages: [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, TOP_LANGUAGES)
      .map(([language, count]) => ({ language, repos: count })),
    repos: mapped,
  };
}
