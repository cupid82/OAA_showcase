/**
 * Connected apps — GitHub, LinkedIn, X and the rest.
 *
 * Two kinds of connection, and the UI is honest about which is which:
 *
 * - **Synced** (GitHub): with the student's consent, OAA reads their *public*
 *   profile and repositories through GitHub's API when they press sync, and can
 *   import repositories as projects.
 * - **Linked** (everything else): OAA stores the profile link and shows it on
 *   the portfolio if the student wants. It never calls those services — their
 *   APIs need per-user OAuth or paid access, and a link is what a portfolio needs.
 */
import { getDb, persist } from '../data/store.js';
import type { ConnectionRow, GithubRepo, Provider, ProjectRow } from '../data/types.js';
import { PROVIDERS } from '../data/types.js';
import { fetchGithubSnapshot } from '../lib/github.js';
import { HttpError } from '../lib/httpError.js';
import type { ImportReposInput } from '../models/project.model.js';
import { recomputeMomentum } from './momentum.service.js';
import { newId, nowISO, skillIndex, skillRefs } from './shared.js';
import type { SkillRef } from './shared.js';

interface ProviderSpec {
  name: string;
  kind: 'sync' | 'link';
  blurb: string;
  placeholder: string;
  /** Hostnames a pasted profile link may come from. */
  hosts: string[];
  /** Path prefix before the handle in a profile URL, e.g. `/in/` on LinkedIn. */
  prefix: string;
  pattern: RegExp;
  urlFor: (handle: string) => string;
}

const PROVIDER_SPECS: Record<Exclude<Provider, 'website'>, ProviderSpec> = {
  github: {
    name: 'GitHub',
    kind: 'sync',
    blurb: 'Import your public repositories as projects and see which languages you actually use.',
    placeholder: 'your-username',
    hosts: ['github.com', 'www.github.com'],
    prefix: '/',
    pattern: /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i,
    urlFor: (handle) => `https://github.com/${handle}`,
  },
  linkedin: {
    name: 'LinkedIn',
    kind: 'link',
    blurb: 'Put your LinkedIn on your portfolio, next to the work that backs it up.',
    placeholder: 'your-profile-name',
    hosts: ['linkedin.com', 'www.linkedin.com', 'in.linkedin.com'],
    prefix: '/in/',
    pattern: /^[a-z0-9-]{3,100}$/i,
    urlFor: (handle) => `https://www.linkedin.com/in/${handle}`,
  },
  x: {
    name: 'X',
    kind: 'link',
    blurb: 'Link the account where you post about what you are building.',
    placeholder: 'handle',
    hosts: ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'],
    prefix: '/',
    pattern: /^[A-Za-z0-9_]{1,15}$/,
    urlFor: (handle) => `https://x.com/${handle}`,
  },
  leetcode: {
    name: 'LeetCode',
    kind: 'link',
    blurb: 'Show your problem-solving profile alongside your projects.',
    placeholder: 'username',
    hosts: ['leetcode.com', 'www.leetcode.com'],
    prefix: '/u/',
    pattern: /^[A-Za-z0-9_-]{2,40}$/,
    urlFor: (handle) => `https://leetcode.com/u/${handle}/`,
  },
  codeforces: {
    name: 'Codeforces',
    kind: 'link',
    blurb: 'Link your contest profile.',
    placeholder: 'handle',
    hosts: ['codeforces.com', 'www.codeforces.com'],
    prefix: '/profile/',
    pattern: /^[A-Za-z0-9_.-]{3,24}$/,
    urlFor: (handle) => `https://codeforces.com/profile/${handle}`,
  },
  kaggle: {
    name: 'Kaggle',
    kind: 'link',
    blurb: 'Link your notebooks and competition history.',
    placeholder: 'username',
    hosts: ['kaggle.com', 'www.kaggle.com'],
    prefix: '/',
    pattern: /^[A-Za-z0-9_-]{2,40}$/,
    urlFor: (handle) => `https://www.kaggle.com/${handle}`,
  },
  behance: {
    name: 'Behance',
    kind: 'link',
    blurb: 'Link your design case studies.',
    placeholder: 'username',
    hosts: ['behance.net', 'www.behance.net'],
    prefix: '/',
    pattern: /^[A-Za-z0-9_-]{2,40}$/,
    urlFor: (handle) => `https://www.behance.net/${handle}`,
  },
};

const WEBSITE = {
  name: 'Personal website',
  kind: 'link' as const,
  blurb: 'Your own site, blog or portfolio.',
  placeholder: 'https://your-site.dev',
};

/**
 * Accepts a bare handle, `@handle`, or a pasted profile link, and returns the
 * handle and the canonical URL — or a 400 saying what was wrong.
 */
export function normaliseAccount(
  provider: Provider,
  input: string,
): { handle: string; url: string } {
  const raw = input.trim();

  if (provider === 'website') {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    let url: URL;
    try {
      url = new URL(withScheme);
    } catch {
      throw HttpError.badRequest('That doesn’t look like a web address.');
    }
    if (!url.hostname.includes('.'))
      throw HttpError.badRequest('That doesn’t look like a web address.');
    const href = url.toString().replace(/\/$/, '');
    return { handle: href.replace(/^https?:\/\//i, ''), url: href };
  }

  const spec = PROVIDER_SPECS[provider];
  let handle = raw.replace(/^@/, '');

  if (/^(https?:\/\/)?[\w.-]+\.[a-z]{2,}\//i.test(raw)) {
    let url: URL;
    try {
      url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    } catch {
      throw HttpError.badRequest(`That isn’t a ${spec.name} link.`);
    }
    if (!spec.hosts.includes(url.hostname.toLowerCase())) {
      throw HttpError.badRequest(`That link isn’t on ${spec.name}.`);
    }
    const path = url.pathname;
    const rest = path.toLowerCase().startsWith(spec.prefix)
      ? path.slice(spec.prefix.length)
      : path.slice(1);
    handle = rest.split('/')[0] ?? '';
  }

  if (!spec.pattern.test(handle)) {
    throw HttpError.badRequest(`“${handle || raw}” isn’t a valid ${spec.name} username.`);
  }

  return { handle, url: spec.urlFor(handle) };
}

// --- Language → skill hints ----------------------------------------------------------

const LANGUAGE_SKILL: Record<string, string> = {
  Python: 'python',
  'Jupyter Notebook': 'python',
  JavaScript: 'javascript',
  TypeScript: 'typescript',
  Java: 'java',
  'C++': 'cpp',
  HTML: 'html-css',
  CSS: 'html-css',
  SCSS: 'html-css',
  Dockerfile: 'docker',
  Shell: 'linux',
  PLpgSQL: 'sql',
  TSQL: 'sql',
};

const TOPIC_SKILL: Record<string, string> = {
  react: 'react',
  reactjs: 'react',
  nextjs: 'react',
  nodejs: 'nodejs',
  node: 'nodejs',
  express: 'nodejs',
  expressjs: 'nodejs',
  docker: 'docker',
  'machine-learning': 'machine-learning',
  'deep-learning': 'deep-learning',
  pytorch: 'deep-learning',
  tensorflow: 'deep-learning',
  pandas: 'pandas',
  'data-visualization': 'data-viz',
  tailwindcss: 'tailwind',
  tailwind: 'tailwind',
  figma: 'figma',
  postgresql: 'sql',
  mysql: 'sql',
  sql: 'sql',
  'rest-api': 'rest-apis',
  api: 'rest-apis',
  aws: 'cloud',
  gcp: 'cloud',
  azure: 'cloud',
  algorithms: 'dsa',
  'data-structures': 'dsa',
};

/** The catalogue skills a repository evidences, from its language and topics. */
function skillsOfRepo(repo: GithubRepo): string[] {
  const ids = new Set<string>();
  const fromLanguage = repo.language ? LANGUAGE_SKILL[repo.language] : undefined;
  if (fromLanguage) ids.add(fromLanguage);
  for (const topic of repo.topics) {
    const skill = TOPIC_SKILL[topic.toLowerCase()];
    if (skill) ids.add(skill);
  }
  return [...ids];
}

// --- Read ---------------------------------------------------------------------------

export interface GithubSummary {
  name: string | null;
  profileUrl: string;
  publicRepos: number;
  followers: number;
  following: number;
  topLanguages: { language: string; repos: number }[];
  /** Your own, not-yet-imported repositories. */
  importable: number;
  /** Languages that map to a catalogue skill you haven't listed. */
  skillHints: { skill: SkillRef; repos: number }[];
}

export interface ConnectionView {
  handle: string;
  url: string;
  showOnPortfolio: boolean;
  consentAt: string;
  lastSyncedAt: string | null;
  syncError: string | null;
  github: GithubSummary | null;
}

export interface ProviderView {
  id: Provider;
  name: string;
  kind: 'sync' | 'link';
  blurb: string;
  placeholder: string;
  connection: ConnectionView | null;
}

function importedRepos(studentId: string): Map<string, string> {
  return new Map(
    getDb()
      .projects.filter(
        (project) =>
          project.ownerId === studentId && project.source === 'github' && project.sourceRef,
      )
      .map((project) => [project.sourceRef ?? '', project.id]),
  );
}

function githubSummary(studentId: string, row: ConnectionRow): GithubSummary | null {
  const snapshot = row.github;
  if (!snapshot) return null;

  const imported = importedRepos(studentId);
  const listed = new Set(
    getDb()
      .studentSkills.filter((entry) => entry.studentId === studentId)
      .map((entry) => entry.skillId),
  );
  const index = skillIndex();

  const hintCounts = new Map<string, number>();
  for (const { language, repos } of snapshot.topLanguages) {
    const skillId = LANGUAGE_SKILL[language];
    if (!skillId || listed.has(skillId)) continue;
    hintCounts.set(skillId, (hintCounts.get(skillId) ?? 0) + repos);
  }

  return {
    name: snapshot.name,
    profileUrl: snapshot.profileUrl,
    publicRepos: snapshot.publicRepos,
    followers: snapshot.followers,
    following: snapshot.following,
    topLanguages: snapshot.topLanguages,
    importable: snapshot.repos.filter((repo) => !repo.fork && !imported.has(repo.fullName)).length,
    skillHints: [...hintCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .flatMap(([skillId, repos]) => {
        const [skill] = skillRefs([skillId], index);
        return skill ? [{ skill, repos }] : [];
      }),
  };
}

function toView(studentId: string, row: ConnectionRow): ConnectionView {
  return {
    handle: row.handle,
    url: row.url,
    showOnPortfolio: row.showOnPortfolio,
    consentAt: row.consentAt,
    lastSyncedAt: row.lastSyncedAt,
    syncError: row.syncError,
    github: row.provider === 'github' ? githubSummary(studentId, row) : null,
  };
}

function connectionOf(studentId: string, provider: Provider): ConnectionRow | undefined {
  return getDb().connections.find(
    (row) => row.studentId === studentId && row.provider === provider,
  );
}

export function listConnections(studentId: string): ProviderView[] {
  return PROVIDERS.map((provider) => {
    const spec = provider === 'website' ? WEBSITE : PROVIDER_SPECS[provider];
    const row = connectionOf(studentId, provider);
    return {
      id: provider,
      name: spec.name,
      kind: spec.kind,
      blurb: spec.blurb,
      placeholder: spec.placeholder,
      connection: row ? toView(studentId, row) : null,
    };
  });
}

// --- Write --------------------------------------------------------------------------

/** Links (or re-links) an account. Does not persist — see `connect`. */
export function linkAccount(
  studentId: string,
  provider: Provider,
  input: { handle: string; showOnPortfolio: boolean },
): ConnectionRow {
  const { handle, url } = normaliseAccount(provider, input.handle);
  const db = getDb();
  const existing = connectionOf(studentId, provider);

  if (existing) {
    const changed = existing.handle.toLowerCase() !== handle.toLowerCase();
    existing.handle = handle;
    existing.url = url;
    existing.showOnPortfolio = input.showOnPortfolio;
    existing.consentAt = nowISO();
    // A different account's snapshot must not survive under the new name.
    if (changed) {
      existing.github = null;
      existing.lastSyncedAt = null;
      existing.syncError = null;
    }
    return existing;
  }

  const row: ConnectionRow = {
    id: newId('con'),
    studentId,
    provider,
    handle,
    url,
    showOnPortfolio: input.showOnPortfolio,
    consentAt: nowISO(),
    lastSyncedAt: null,
    syncError: null,
    github: null,
  };
  db.connections.push(row);
  return row;
}

export async function connect(
  studentId: string,
  provider: Provider,
  input: { handle: string; showOnPortfolio: boolean },
): Promise<ProviderView[]> {
  linkAccount(studentId, provider, input);
  await persist();
  return listConnections(studentId);
}

export async function updateConnection(
  studentId: string,
  provider: Provider,
  showOnPortfolio: boolean,
): Promise<ProviderView[]> {
  const row = connectionOf(studentId, provider);
  if (!row) throw HttpError.notFound('That account isn’t connected.');
  row.showOnPortfolio = showOnPortfolio;
  await persist();
  return listConnections(studentId);
}

/**
 * Removes the link and every snapshot taken through it. Projects already
 * imported stay — they are the student's now, not GitHub's.
 */
export async function disconnect(studentId: string, provider: Provider): Promise<ProviderView[]> {
  const db = getDb();
  const before = db.connections.length;
  db.connections = db.connections.filter(
    (row) => !(row.studentId === studentId && row.provider === provider),
  );
  if (db.connections.length === before) throw HttpError.notFound('That account isn’t connected.');
  await persist();
  return listConnections(studentId);
}

export async function syncGithub(studentId: string): Promise<ProviderView[]> {
  const row = connectionOf(studentId, 'github');
  if (!row) throw HttpError.badRequest('Connect your GitHub account first.');

  try {
    row.github = await fetchGithubSnapshot(row.handle);
    row.lastSyncedAt = nowISO();
    row.syncError = null;
  } catch (error) {
    // Remember the failure so the page can say what went wrong last time.
    row.syncError = error instanceof Error ? error.message : 'Sync failed.';
    await persist();
    throw error;
  }

  await persist();
  return listConnections(studentId);
}

export interface ImportableRepo {
  fullName: string;
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  fork: boolean;
  archived: boolean;
  pushedAt: string | null;
  htmlUrl: string;
  homepage: string | null;
  skills: SkillRef[];
  /** The project it was imported as, if it already was. */
  importedAs: string | null;
}

export function listGithubRepos(studentId: string): {
  syncedAt: string | null;
  repos: ImportableRepo[];
} {
  const row = connectionOf(studentId, 'github');
  if (!row) throw HttpError.badRequest('Connect your GitHub account first.');
  if (!row.github) return { syncedAt: null, repos: [] };

  const imported = importedRepos(studentId);
  const index = skillIndex();

  return {
    syncedAt: row.lastSyncedAt,
    repos: row.github.repos.map((repo) => ({
      fullName: repo.fullName,
      name: repo.name,
      description: repo.description,
      language: repo.language,
      stars: repo.stars,
      fork: repo.fork,
      archived: repo.archived,
      pushedAt: repo.pushedAt,
      htmlUrl: repo.htmlUrl,
      homepage: repo.homepage,
      skills: skillRefs(skillsOfRepo(repo), index),
      importedAs: imported.get(repo.fullName) ?? null,
    })),
  };
}

/** "campus-eats_v2" → "Campus eats v2" — a readable default title. */
function titleFromRepo(name: string): string {
  const spaced = name.replace(/[-_]+/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Turns chosen repositories into projects. Only from the last sync's snapshot —
 * the client names repos, it can never inject one. Imported projects start
 * without a problem statement, so they earn nothing until the student tells
 * their story.
 */
export async function importGithubRepos(
  studentId: string,
  input: ImportReposInput,
): Promise<{ imported: string[] }> {
  const row = connectionOf(studentId, 'github');
  if (!row?.github) throw HttpError.badRequest('Sync your GitHub account before importing.');

  const snapshot = new Map(row.github.repos.map((repo) => [repo.fullName, repo]));
  const already = importedRepos(studentId);
  const unknown = input.repos.filter((name) => !snapshot.has(name));
  if (unknown.length > 0) {
    throw HttpError.badRequest(`Not in your last GitHub sync: ${unknown.join(', ')}`);
  }

  const db = getDb();
  const now = nowISO();
  const imported: string[] = [];

  for (const fullName of new Set(input.repos)) {
    const repo = snapshot.get(fullName);
    if (!repo || already.has(fullName)) continue;

    const project: ProjectRow = {
      id: newId('prj'),
      ownerId: studentId,
      title: titleFromRepo(repo.name),
      tagline: (repo.description ?? '').slice(0, 140),
      problem: '',
      role: '',
      outcome: '',
      status: input.status,
      skillIds: skillsOfRepo(repo),
      repoUrl: repo.htmlUrl,
      demoUrl: repo.homepage,
      visibility: input.visibility,
      openToCollaborators: false,
      lookingFor: '',
      source: 'github',
      sourceRef: fullName,
      createdAt: now,
      updatedAt: now,
      shippedAt: input.status === 'shipped' ? (repo.pushedAt ?? now) : null,
    };

    db.projects.push(project);
    imported.push(project.id);
  }

  recomputeMomentum(studentId);
  await persist();
  return { imported };
}
