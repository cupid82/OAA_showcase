# CLAUDE.md — OAA

## What this is

OAA is a **student skills-and-opportunity platform**, not a college ERP. Students
build projects, grow and prove skills, find events and jobs, keep a private eye on
burnout, and earn momentum on an opt-in leaderboard. The college ERP stays the
system of record for marks, attendance, fees and timetables — OAA never copies
those; it links out ("Open College ERP").

Product direction: `idea md/OAA_Product_Direction_and_Change_Plan.md` (the owner's
notes, not committed). The owner's own words for the shape: _home page → sign in →
dashboard; modes on the left: Projects, Skills, Events, Jobs, Burnout, Leaderboard;
connect apps like GitHub, X, LinkedIn._

`plans.md`, `PLAYBOOK.md` and `docs/01–08` describe the **retired** ERP-style portal
(teachers, marks, attendance, the four-dimension OAA score). Read them as history,
not as specs.

## Stack — decided, do not change without asking

- Monorepo: npm workspaces (`frontend/`, `backend/`)
- Backend: Express 4 + TypeScript, **ESM** — relative imports MUST end in `.js`
- Frontend: React 18 + Vite 6 + TypeScript + Tailwind v4 + React Router
- Persistence: **a JSON file, not a database.** Owner's decision — do not add
  Postgres, Prisma, SQLite or any other DB without asking.
- Auth: JWT + bcrypt + role-based access control
- Charts: Recharts
- Validation: zod (already a dependency — use it, don't add another)

## Current state

Everything in the sidebar is built — there are no placeholder pages.

- **Roles:** `student` and `admin` (labelled "Moderator"). The teacher role and
  every ERP screen (marks, attendance, timetable, assignments, announcements) were
  removed on purpose. One login form; the account decides the role.
- **Student app** (`/student/*`): Dashboard ("Today"), Projects, Skills, Events,
  Jobs, Burnout, Leaderboard, Connected apps, Settings, plus onboarding at
  `/student/welcome` (an `OnboardingGate` sends un-onboarded students there).
- **Public:** `/` home page, `/login`, and `/p/:handle` public portfolios.
- **Moderator** (`/admin/*`): overview (counts only), events and jobs — publish,
  edit, and review student-shared listings.
- **Persistence is `backend/data/oaa-data.json`** — gitignored, seeded on first
  run by `data/seed.ts` with dates **relative to the day it seeds**. Delete it to
  reseed. `meta.schemaVersion` (`SCHEMA_VERSION` in `data/types.ts`) guards the
  shape: a file from another schema is renamed to `*.backup-<stamp>.json`, never
  deleted, and a fresh one is seeded. Bump the version when you reshape a table.
- **GitHub sync is real**: `lib/github.ts` calls GitHub's public REST API, only
  when a student presses Sync. `GITHUB_TOKEN` (optional, no scopes) raises the
  60-requests-an-hour limit. Every other provider is a stored link, never called.

### Seeded demo states — deliberate, don't "fix" them

Passwords: every student `student123`, moderator `ADM01` / `admin123`.

- `22CS001` Ananya — the main demo account; GitHub deliberately **not** linked.
- `22CS002` Rohan — overloaded; Burnout reads "running hot" and Today goes quiet.
- `22CS006` Karthik — chose to stay off the leaderboard.
- `22CS007` Sneha — has **never** checked in: Burnout says "not enough data",
  never "steady". Not-measured is not the same as fine.
- `22CS010` Arjun — not onboarded; lands on the welcome flow.

## Architecture — REUSE, never reinvent

- Route file → service file → store. Routes never touch `getDb()` directly.
- `lib/asyncHandler.ts` — wrap every async route handler.
- `lib/httpError.ts` — throw `HttpError.notFound()`, `.forbidden()`, etc.
- `lib/params.ts` — `param(req, 'id')`, a route param narrowed to a string.
- `middleware/errorHandler.ts` — converts ZodError → 400. No try/catch in routes.
- `config/env.ts` — every env var goes through this zod schema.
- `middleware/requireAuth.ts` — `requireAuth` (role read from the account, not
  trusted from the token), `requireRole`, and `requireStudent`, which resolves
  the caller's **own** student id from the token. Student routes never take a
  student id from the URL.
- Each router is mounted at its own prefix in `app.ts`. A router with a
  router-level guard mounted at bare `/api` also runs for every route after it.
- `services/shared.ts` — ids, lookups, catalogue checks, dismissals, labels.
- `services/evidence.ts` — gathers a student's rows for the pure engines. Takes
  the db explicitly so the seed runs the same code the API does.
- `services/audit.service.ts` — `recordAudit` for every moderation write;
  append-only.
- `frontend/src/lib/api.ts` — the only place `fetch` is called.
- `frontend/src/lib/useApi.ts` — loading / error / data. **Stale-while-revalidate:**
  a reload of the same path keeps data on screen; `setData` takes a mutation's
  response. (The old hook blanked data on refetch, which unmounted "saved" notices.)
- `frontend/src/lib/useAction.ts` — pending/error for writes; `run()` resolves to
  the result or `undefined` on failure.
- `frontend/src/lib/useShared.ts` — cached catalogue (`useCatalog`) and site meta.
- `frontend/src/lib/labels.ts` — every enum in UI words. `lib/format.ts` — dates.

### Access, in one function per module

- Projects: `assertProjectAccess(studentId, projectId, 'view' | 'team' | 'owner')`
  in `project.service.ts`. A private project someone else owns is a **404**, not
  a 403 — its existence is private too.
- Events/jobs: published for everyone; pending/rejected only for the sharer.
- Admins get **counts, never rows about a person**. The wellbeing split on the
  overview is withheld below `AGGREGATION_THRESHOLD` (5) students.

## The pure engines — tests before UI

`lib/skillProof.ts`, `lib/momentum.ts`, `lib/matching.ts`, `lib/burnout.ts` and
`lib/dates.ts` are **pure**: numbers in, numbers out, no store access. 39 tests in
`lib/engines.test.ts` — run `npm test` after touching any of them.

- **Skill proof** is separate from the student's self-declared level. Proven =
  a shipped project that tells its story (problem ≥ 20 chars + ≥ 1 skill) or a
  certificate. Practising = a building project, an attended event's reflection
  skills, or ≥ 60 min practice in 30 days. Claimed = listed, nothing behind it.
- **Momentum** (the leaderboard): stored ledger, **recomputed on write, never on
  read** — every write to an input calls `recomputeMomentum(...)`. Point values
  live in `settings.momentumPoints`; `DEFAULT_POINTS` is only the seed/test value.
  Never counted: marks, attendance, job applications. Practice caps per week;
  milestones cap per project.
- **Leaderboard is opt-in.** Hidden students are left out entirely, not
  anonymised; a hidden viewer sees where they would rank.
- **Matching** explains itself (`describeMatch` → reasons, have, gap). The score
  orders lists; the UI shows a word ("Strong fit"), never a grade.
- **Burnout**: fewer than two check-ins in four weeks → `level: null`, shown as
  "not enough data". Computed on read (deadlines move daily; nobody ranks on it).
  Private to the student; `at-risk` or a snooze puts Today into focus mode.

## Non-negotiable rules

1. **ESM imports need `.js`**: `import { x } from './foo.js'` even though the file is `foo.ts`.
2. **Never store a plaintext password.** bcrypt, cost 10+.
3. **Never build SQL by string concatenation.** If a real database is ever added,
   it is Prisma or parameterized queries only.
4. **Every protected route checks role AND ownership** — via the guards above and
   the one access function per module. Never hand-roll it in a handler.
5. **Validate every request body with a zod schema** in `models/`.
6. **Never commit `.env`.** Secrets go in `.env`, placeholders in `.env.example`.
7. **API responses are always** `{ data: ... }` **or** `{ error: { message } }`.

## Product rules

- Not an ERP. No marks, attendance, fees or timetables — link to the ERP instead,
  and label ERP-derived fields with their source and sync time.
- Nothing public by default: projects start private; leaderboard and portfolio
  are off until switched on; nothing is published automatically.
- Every Today item answers **why, what, by when**, and can be dismissed.
- A listing never says "verified" — it says who posted it: college-posted,
  partner-posted, student-shared (moderator-checked), unverified external link.
- Consent before linking an account; nothing fetched until the student syncs.
- `null` means "not measured" and is never rendered as 0.
- Values marked ⚠️ in the code (support contacts, the ERP URL) are placeholders.

## Frontend conventions

- Keep the design language: square corners, hairline `ink` borders, the mono
  `kicker` label, **Newsreader** (`font-serif`) for headings and every figure,
  **Inter** for body, **IBM Plex Mono** for kickers and codes. Brand tokens
  `brand-*` / `ink-*` / `accent-*` in `styles/global.css`; accent (clay) is for
  warnings only. The dark "plate" (`drafting bg-ink-950`) is for one hero per page.
- Shared UI in `components/ui/`: `Button`/`ButtonLink`, `Badge`, `Field` (+
  `TextInput`, `TextArea`, `Select`, `Checkbox`), `Tabs`/`Chip`, `Notice`,
  `Bits` (`SectionHeading`, `ProgressBar`, `DatePlate`, `Stat`, `SkillChips`,
  `ExternalLink`), `SkillPicker`, `ProviderMark`, `ConfirmButton`, `EmptyState`,
  `ErrorMessage`, `Loading`, `PageHeader`. Use them rather than writing another.
- Chart colours come from `lib/chartTokens.ts`, each contrast-checked (ratios in
  the comments). Marks ≥ 3:1 on their surface; axis text ≥ 4.5:1.
- Path alias `@` → `frontend/src`.
- A page that saves shows the outcome, held **above** anything that re-renders.
- `useEffect` bodies are always blocks. Newer browsers return a Promise from
  `scrollTo`/`scrollIntoView`; an arrow that returns it crashes React's cleanup.
- Scrolls on arrival use `behavior: 'instant'` — the site's smooth scrolling is
  for in-page anchors only.

## Commands

- `npm run dev` — both servers (backend :4000, frontend :5173)
- `npm run typecheck` — must pass before any commit
- `npm test` — backend engine tests
- `npm run format` — prettier (CI runs `format:check`)

## Before you finish any task

Run `npm run typecheck`. If it fails, fix it — don't hand back broken code.
