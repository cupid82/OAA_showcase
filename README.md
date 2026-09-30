# OAA

A student skills-and-opportunity platform. Students build projects, grow and prove
skills, find events and jobs, keep a private eye on burnout, and earn momentum on an
opt-in leaderboard. It sits **beside** the college ERP rather than copying it: marks,
attendance and fees stay in the ERP, and OAA links out to it.

| Layer    | Stack                                         | Dev URL               |
| -------- | --------------------------------------------- | --------------------- |
| Frontend | React 18 + TypeScript + Vite + Tailwind v4    | http://localhost:5173 |
| Backend  | Node + Express + TypeScript (ESM), JSON store | http://localhost:4000 |

## Getting started

```bash
npm install                 # installs both workspaces
cp .env.example .env         # then fill in values (JWT_SECRET is required)
npm run dev                  # runs backend + frontend together
```

Open http://localhost:5173 — home page, then **Sign in**. The login page lists the
seeded accounts; click one to fill it in.

| Login     | Password     | What it shows                                              |
| --------- | ------------ | ---------------------------------------------------------- |
| `22CS001` | `student123` | The main demo student. GitHub not linked — try your own.   |
| `22CS002` | `student123` | Overloaded: Burnout reads "running hot", Today goes quiet. |
| `22CS010` | `student123` | First sign-in: lands on onboarding.                        |
| `ADM01`   | `admin123`   | Moderator: publish and review events and jobs.             |

## What's in it

**Student** — a dashboard ("Today": the next few moves, each with why / what / by
when), and six modes down the left:

- **Projects** — tell each project's story, break it into milestones, ship it; find a
  team; start from curated ideas; import repositories from GitHub.
- **Skills** — a skill map for the chosen goal; proof (shipped work, certificates)
  kept separate from self-declared level; practice log; certificates.
- **Events** — hackathons, workshops, contests, talks; save, register, reflect after.
- **Jobs** — internships, jobs, fellowships, campus drives; matches that explain
  themselves, skill gaps included; a private application tracker.
- **Burnout** — a private weekly check-in read against the fortnight ahead; quiet mode.
- **Leaderboard** — opt-in momentum from building, learning and showing up. Never marks.

Plus **Connected apps** (GitHub sync; LinkedIn, X, LeetCode, Codeforces, Kaggle,
Behance and a website as portfolio links), **Settings**, and a public portfolio at
`/p/<handle>` that shows only what the student switched on.

**Moderator** — an overview of counts (never an individual's data), and the events
and jobs lists with a review queue for student-shared listings.

## Layout

```
.
├── frontend/src/
│   ├── App.tsx                 # every route
│   ├── components/             # layout (Navbar, Sidebar, NotificationBell) and ui/
│   ├── lib/                    # api, useApi, useAction, labels, format, chartTokens
│   ├── pages/landing/          # public home page
│   ├── pages/student/          # dashboard, onboarding, projects/, skills/,
│   │                           # opportunities/ (events + jobs), burnout/, …
│   ├── pages/admin/            # moderator console
│   └── pages/portfolio/        # public /p/:handle
└── backend/src/
    ├── server.ts               # Node entry point
    ├── worker.ts               # Cloudflare Workers entry point (see wrangler.jsonc)
    ├── cloudflare/             # Worker-only type declarations and a dependency stand-in
    ├── lib/                    # pure engines (skillProof, momentum, matching,
    │                           # burnout, dates) + github client + helpers
    ├── data/                   # types, catalogue, seed, and the stores:
    │                           # JSON file, Postgres, Durable Object
    ├── services/               # the rules — one module per area
    ├── models/                 # zod request schemas
    ├── routes/                 # thin HTTP layer
    └── middleware/             # auth guards, errors
```

## Scripts

| Command              | What it does                                                          |
| -------------------- | --------------------------------------------------------------------- |
| `npm run dev`        | Backend and frontend in watch mode                                    |
| `npm run dev:worker` | The whole app as Cloudflare runs it, at http://localhost:8787         |
| `npm run build`      | Type-checks and builds the frontend (`build:all` builds both)         |
| `npm start`          | Runs the built backend                                                |
| `npm run deploy`     | Deploys to Cloudflare Workers from your machine (`wrangler deploy`)   |
| `npm run typecheck`  | Type-checks without emitting                                          |
| `npm test`           | Engine tests (skill proof, momentum, matching, burnout) and the store |
| `npm run format`     | Prettier over the repo                                                |

## API

Responses are `{ "data": ... }` on success and `{ "error": { "message": ... } }` on
failure. Student routes never take a student id — the caller's own record comes from
their token.

| Method                  | Path                                            | Who             | Description                                               |
| ----------------------- | ----------------------------------------------- | --------------- | --------------------------------------------------------- |
| `POST`                  | `/api/auth/login`                               | anyone          | `{ loginId, password }` → JWT; role from the account      |
| `GET`                   | `/api/auth/me`                                  | signed in       | The current user                                          |
| `GET`                   | `/api/meta`                                     | anyone          | ERP link and academic year                                |
| `GET`                   | `/api/portfolio/:handle`                        | anyone          | A public portfolio, if switched on                        |
| `GET`                   | `/api/catalog`                                  | signed in       | Skills and goals                                          |
| `GET` `PATCH`           | `/api/me`, `/api/me/{profile,goal,preferences}` | student         | Account, goal, privacy and notifications                  |
| `POST`                  | `/api/me/onboarding`                            | student         | Goal, skills, interests, privacy, links — atomically      |
| `GET`                   | `/api/dashboard`                                | student         | Today: next moves, stats, upcoming                        |
| `POST`                  | `/api/dashboard/{dismiss,restore}`              | student         | "Not now" on a Today card, and undo                       |
| `GET` `POST`            | `/api/skills`                                   | student         | Skill map, list a skill                                   |
| `GET` `PATCH` `DELETE`  | `/api/skills/:skillId`                          | student         | One skill: evidence, openings, level                      |
| `POST`                  | `/api/skills/:skillId/practice`                 | student         | Log practice                                              |
| `POST` `DELETE`         | `/api/skills/certificates[/:id]`                | student         | Certificates                                              |
| `GET` `POST`            | `/api/projects`                                 | student         | Your projects, create one                                 |
| `GET`                   | `/api/projects/{discover,ideas}`                | student         | Projects looking for help; curated ideas                  |
| `POST`                  | `/api/projects/ideas/:ideaId/start`             | student         | Start a project from an idea                              |
| `GET` `PATCH` `DELETE`  | `/api/projects/:projectId`                      | per project     | View (campus/public or team), edit (owner)                |
| `POST` `PATCH` `DELETE` | `/api/projects/:projectId/tasks[/:taskId]`      | team            | Milestones                                                |
| `POST` `PATCH`          | `/api/projects/:projectId/join-requests[/:id]`  | student / owner | Ask to join; accept or decline                            |
| `DELETE`                | `/api/projects/:projectId/members/:studentId`   | owner / self    | Remove a member, or leave                                 |
| `GET` `POST`            | `/api/events`                                   | student         | Events overview; share one for review                     |
| `GET`                   | `/api/events/:eventId`                          | student         | One event, with why it fits                               |
| `PUT`                   | `/api/events/:eventId/{participation,interest}` | student         | Save / registered / attended + reflection; not interested |
| `GET` `POST`            | `/api/jobs`                                     | student         | Pipeline, suggestions, open listings; share one           |
| `GET`                   | `/api/jobs/:jobId`                              | student         | One listing, with fit and gap                             |
| `PUT`                   | `/api/jobs/:jobId/{application,interest}`       | student         | Private tracker; not interested                           |
| `GET`                   | `/api/wellbeing`                                | student         | Burnout reading, check-ins, commitments                   |
| `POST` `DELETE`         | `/api/wellbeing/checkins`                       | student         | This week's check-in; delete all                          |
| `PUT`                   | `/api/wellbeing/snooze`                         | student         | Quiet mode                                                |
| `GET`                   | `/api/leaderboard?window=&category=&scope=`     | student         | Opt-in momentum rankings                                  |
| `GET`                   | `/api/connections`                              | student         | Connected apps                                            |
| `PUT` `PATCH` `DELETE`  | `/api/connections/:provider`                    | student         | Link (with consent), show on portfolio, unlink            |
| `POST`                  | `/api/connections/github/sync`                  | student         | Read the public GitHub profile and repos                  |
| `GET` `POST`            | `/api/connections/github/{repos,import}`        | student         | Import repositories as projects                           |
| `GET` `POST` `PATCH`    | `/api/notifications[/read-all\|/:id]`           | signed in       | The in-app inbox                                          |
| `GET`                   | `/api/admin/overview`                           | admin           | Counts only                                               |
| `GET` `POST` `PUT`      | `/api/admin/{events,jobs}[/:id]`                | admin           | Publish and edit listings                                 |
| `POST`                  | `/api/admin/{events,jobs}/:id/review`           | admin           | Approve, reject (with a note), archive, restore           |

## Data

There is no database server. The backend persists to `backend/data/oaa-data.json` —
gitignored, seeded on first run with dates relative to that day. **Delete the file to
reseed.** A data file written by a different schema version is moved aside to
`oaa-data.backup-<timestamp>.json` (never deleted) and a fresh one is seeded.

`store.ts` is the seam: routes call services, services call the store, so replacing
it with a real database touches that file and the service queries and nothing above.
The same document can instead live in Supabase Postgres (`SUPABASE_DB_URL`) or, on
Cloudflare, in a Durable Object — see below.

## Deploying to Cloudflare Workers

One Worker serves everything, configured in `wrangler.jsonc`:

- **The pages** — `frontend/dist`, built before every deploy, served as static assets.
  Any app route (`/student/…`, `/p/…`) gets `index.html`.
- **The API** — `/api/*` goes through `backend/src/worker.ts` to one Durable Object
  that runs the same Express app as `npm start`. It holds the data in memory and
  saves it to its own storage (`data/durableObjectStore.ts`), so nothing else needs
  setting up — no database, no disk. SQLite-backed Durable Objects are on the free plan.

Nothing is required in the dashboard. On first start the API seeds the demo data and
generates its own JWT secret, and both are kept in the Durable Object across deploys.

**Connect the repository** (Workers & Pages → your Worker → Settings → Build):

| Setting                   | Value                                                |
| ------------------------- | ---------------------------------------------------- |
| Worker name               | `oaa-showcase` — must match `name` in wrangler.jsonc |
| Production branch         | `main`                                               |
| Root directory            | empty (the repository root)                          |
| Build command             | empty — `wrangler.jsonc` builds the frontend         |
| Deploy command            | `npx wrangler deploy` (the default)                  |
| Non-production deploy cmd | `npx wrangler versions upload` (the default)         |

**Optional secrets** (Settings → Variables and Secrets → add as _Secret_):

| Secret         | Why                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `GITHUB_TOKEN` | Recommended. Workers share outgoing IPs, so GitHub's 60/hour anonymous limit runs out fast. A token with no scopes lifts it. |
| `JWT_SECRET`   | Only to choose your own (32+ characters). Changing it signs everyone out.                                                    |

Things to know:

- `npm run dev:worker` runs the Worker locally, the same runtime Cloudflare uses. It
  reads `.dev.vars` (or, without one, the root `.env`) for local variables; local
  data lives in `.wrangler/state`. Both are gitignored.
- The data belongs to one Durable Object, named in `worker.ts`. Renaming it — or the
  class, or the Worker — starts from an empty seed.
- `wrangler.jsonc` swaps two of Express 4's dependencies in the Worker bundle only:
  Workers forbid `new Function`, which `depd` uses, and the version of iconv-lite
  body-parser ships crashes under `nodejs_compat`. Morgan is off there for the same
  reason; Cloudflare logs every request itself (Observability tab).
- Durable Object classes use `migrations`, not `exports`: with `exports`, the
  `versions upload` that preview branches run always fails, and there's no way back.
  Add a new migration tag for a new class; never edit an applied one.

## Environment variables

Copy `.env.example` to `.env` in each workspace. Only `VITE_`-prefixed variables reach
the browser — never put secrets in `frontend/.env`.

| Variable       | Where   | Notes                                                    |
| -------------- | ------- | -------------------------------------------------------- |
| `JWT_SECRET`   | backend | Required on Node, 32+ characters. Optional on Cloudflare |
| `GITHUB_TOKEN` | backend | Optional. A no-scope token lifts GitHub's 60/hour limit  |
| `DATA_FILE`    | backend | JSON store path, default `data/oaa-data.json`            |
