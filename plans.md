# 🏗️ OAA Portal — Step-by-Step Build Guide

> Smart Student Management Portal · Built in VS Code with Claude Code
> Location: `D:\OAA`

This is the **execution manual**. Every step below is a self-contained unit of work: what to do, the exact commands to run, the exact prompt to paste into Claude, how to verify it worked, and when to commit.

**Work top to bottom. Do not skip a step. Do not start Step N+1 until Step N's Verify block passes.**

---

## ⚡ Start Here — The First 10 Minutes

If you read nothing else, run these four commands right now, in order:

```bash
cd /d D:\OAA
git init
git add -A
git commit -m "chore: initial scaffold"
```

You currently have **no version control**. Every step below assumes you can roll back. Then continue to Step 0.

---

# 📍 Part A — Know What You're Standing On

Read this part once. It is the ground truth of your repo as it exists today.

## ✅ What is already set up

| Layer | What's there |
|---|---|
| **Structure** | npm workspaces monorepo — `frontend/` + `backend/` |
| **Backend** | Express 4 + TypeScript, **ESM** (`"type": "module"`) |
| **Backend libs** | `zod`, `helmet`, `cors`, `morgan`, `dotenv` |
| **Backend patterns** | `createApp()`, `asyncHandler`, `HttpError`, `errorHandler`, `notFound`, zod-validated env, graceful shutdown |
| **Frontend** | React 18 + Vite 6 + TypeScript |
| **Frontend setup** | `@` → `src` path alias, dev proxy `/api` → `:4000`, `api` fetch wrapper |
| **Database** | Postgres 16 in `docker-compose.yml` (user/pass/db all `oaa`) |
| **CI** | GitHub Actions — format check, typecheck, build, test |
| **Tooling** | Prettier, editorconfig, Dockerfiles, `.gitignore`, `.env.example` |

> [!success] This is a genuinely good scaffold
> The error handling, env validation, and `asyncHandler` patterns are the parts people usually get wrong. Build on them — don't let Claude reinvent them.

## ❌ What is missing — and you need all of it

| Gap | Impact | Fixed in |
|---|---|---|
| **No git repository** | `git status` → *"not a git repository"* | Step 0.1 |
| **No `docs/` folder** | Steps 1, 4, 5, 6, 7, 9, 11 all reference `@docs/*.md` — they will not work without it | Step 0.3 |
| **No `.env` file** | Only `.env.example` exists. Nothing loads real config yet | Step 0.4 |
| **No database library** | Postgres is in Docker, but nothing connects to it. `itemService.ts` is an in-memory `Map` | Step 1 |
| **No auth libraries** | No `bcrypt`, no `jsonwebtoken`, no `express-rate-limit` | Step 2 |
| **No React Router** | Can't build multi-page anything yet | Step 3 |
| **No Tailwind** | Plain `global.css` right now | Step 3 |
| **No charts** | No `recharts` — needed for the OAA radar chart | Step 3 |
| **No tests** | Test runner is configured, zero test files exist | Step 2 onward |

## 🗑️ Demo code that must be deleted

The scaffold ships a placeholder to-do feature. It goes in Step 0.5:

- `backend/src/models/item.ts`
- `backend/src/services/itemService.ts`
- `backend/src/routes/items.ts`
- `frontend/src/components/ItemList.tsx`
- The `Item` interface in `frontend/src/types.ts` (keep `ApiError`)
- The demo body of `frontend/src/App.tsx`
- The `itemsRouter` import + `app.use('/api/items', ...)` line in `backend/src/app.ts`
- The empty `OAA1/` folder

> [!bug] Also note
> `itemService.ts` has a comment pointing to `backend/src/db/README.md` — **that file doesn't exist**. Ignore it.

---

# 🧭 Part B — Six Habits That Decide How This Goes

These apply to every step below. They are not optional advice; they are the difference between a smooth build and a mess.

### Habit 1 — One session = one step

Start a fresh session (`/clear`) for each numbered step. A session that's built auth, then a landing page, then a chart carries a lot of irrelevant context and starts making sloppier choices.

### Habit 2 — Use plan mode for anything big

Press `Shift+Tab` twice to enter **plan mode**. Claude explores and proposes an approach without editing files. Read the plan, correct it, *then* approve.

**Use plan mode for Steps 1, 2, 5, 7, and 9 especially.** Each step below tells you when it's required.

### Habit 3 — Reference files explicitly with `@`

`@backend/src/app.ts` beats "the app file". It removes guessing.

### Habit 4 — Verify after every step — don't trust, check

Every step ends with a **Verify** block. Actually run it. Finding a broken thing three steps later costs far more than checking now.

### Habit 5 — Commit after every green verify

```bash
git add -A && git commit -m "step N: what you built"
```

This is your undo button. If a step goes wrong, `git reset --hard` costs you one step instead of a week.

### Habit 6 — Give Claude the spec notes

Your Obsidian notes are the requirements. Claude builds much better with the real spec than a paraphrase.

> [!tip] Best move: copy your specs into the repo
> That's exactly what Step 0.3 does. Then you can just say *"follow @docs/02-student-module.md"* and Claude reads it directly.

---

# 🚧 Part C — The Build Steps

---

## STEP 0 — Foundation

**Est. 30 min · No plan mode needed · Do this today**

> [!danger] Nothing else works until this is done
> `D:\OAA` is not a git repository, has no specs in it, and has no `.env`. Steps 1–15 all assume all three exist.

### 0.1 — Initialize git (run this yourself, not through Claude)

```bash
cd /d D:\OAA
git init
git add -A
git commit -m "chore: initial scaffold"
```

Then create a **private** repo on GitHub and push:

```bash
git remote add origin https://github.com/<your-username>/oaa.git
git branch -M main
git push -u origin main
```

Do not skip the push. Local-only history dies with the drive.

> [!check] Verify 0.1
> `git log --oneline` shows one commit. `git status` says "working tree clean". The repo is visible on GitHub and is **private**.

---

### 0.2 — Create `D:\OAA\CLAUDE.md`

This file is auto-loaded into every Claude session in this repo. It's the single highest-leverage file you can write — it stops Claude re-deciding architecture every session.

**Save this exactly as `D:\OAA\CLAUDE.md`:**

````markdown
# CLAUDE.md — Smart Student Management Portal (OAA)

## What this is
College portal with three roles: Student, Teacher, Admin.
The signature feature is the **OAA score** (Overall Ability Assessment).
Full specs in `docs/`.

## Stack — decided, do not change without asking
- Monorepo: npm workspaces (`frontend/`, `backend/`)
- Backend: Express 4 + TypeScript, **ESM** — relative imports MUST end in `.js`
- Frontend: React 18 + Vite 6 + TypeScript + Tailwind + React Router
- Database: PostgreSQL via Prisma
- Auth: JWT + bcrypt + role-based access control
- Charts: Recharts
- Validation: zod (already a dependency — use it, don't add another)

## Existing patterns — REUSE, never reinvent
- `backend/src/lib/asyncHandler.ts` — wrap every async route handler
- `backend/src/lib/httpError.ts` — throw `HttpError.notFound()`, `.forbidden()`, etc.
- `backend/src/middleware/errorHandler.ts` — already converts ZodError → 400. Do not
  add try/catch in routes for validation.
- `backend/src/config/env.ts` — all env vars go through this zod schema. Never read
  `process.env` directly anywhere else.
- `frontend/src/lib/api.ts` — the only place `fetch` is called
- Route file → service file → database. Routes never query the DB directly.

## Non-negotiable rules
1. **ESM imports need `.js`**: `import { x } from './foo.js'` even though the file is `foo.ts`.
2. **Never store a plaintext password.** bcrypt, cost 10+.
3. **Never build SQL by string concatenation.** Prisma or parameterized queries only.
4. **Every protected route checks role AND ownership.** A student requesting
   `/api/students/42/marks` must be verified as student 42, not just "a student".
5. **Validate every request body with a zod schema** in the model file.
6. **Never commit `.env`.** Secrets go in `.env`, placeholders in `.env.example`.
7. **API responses are always** `{ data: ... }` **or** `{ error: { message } }`.

## Domain rules
- OAA = (Academic + Adaptability + Physical + 0.5 × Social) / 3.5 → range 0–100
- Round to nearest integer BEFORE grade lookup (95.4 → 95 → A; 95.6 → 96 → A+)
- Attendance is one row per student, per subject, per DATE. Never a running counter.
- OAA, CGPA, and attendance % are DERIVED. Never hand-edit them as stored columns.
- Teacher-assigned scores (Adaptability, Social) must write an `audit_logs` row.

## Commands
- `npm run dev` — both servers
- `npm run typecheck` — must pass before any commit
- `npm test` — backend tests
- `npm run format` — prettier

## Before you finish any task
Run `npm run typecheck`. If it fails, fix it — don't hand back broken code.
````

> [!check] Verify 0.2
> Open a new Claude session in `D:\OAA` and ask *"what stack are we using?"* — it should answer from CLAUDE.md without exploring the repo.

---

### 0.3 — Copy your specs into `D:\OAA\docs\` ⚠️ BLOCKING

Create the folder and copy notes 01–08 out of Obsidian into it.

```bash
mkdir D:\OAA\docs
```

Later steps reference these exact paths. Name your files to match, or edit the prompts to match your names:

| File | Used by |
|---|---|
| `docs/01-landing-page.md` | Step 4 |
| `docs/02-student-module.md` | Steps 5, 11 |
| `docs/03-teacher-module.md` | Step 6 |
| `docs/04-admin-module.md` | Steps 9, 11 |
| `docs/05-database-design.md` | Step 1 |
| `docs/06-security-technologies.md` | Step 15 |
| `docs/07-oaa-spec.md` | Step 7 |
| `docs/08-build-roadmap.md` | Steps 1, 9 |

> [!danger] This step is a hard gate
> If `docs/` is empty, Claude will invent requirements in Steps 1, 4, 5, 6, 7, 9 and 11 — and you will be rebuilding them later. Copy the notes before you continue.

> [!check] Verify 0.3
> `dir D:\OAA\docs` lists eight `.md` files and each one opens with real content, not a stub.

---

### 0.4 — Create your `.env` files

Only `.env.example` exists today. Copy it and fill in real values:

```bash
copy D:\OAA\.env.example D:\OAA\.env
copy D:\OAA\backend\.env.example D:\OAA\backend\.env
copy D:\OAA\frontend\.env.example D:\OAA\frontend\.env
```

Then edit `D:\OAA\backend\.env` and uncomment/set:

```env
DATABASE_URL=postgresql://oaa:oaa@localhost:5432/oaa
JWT_SECRET=<paste a long random string here>
```

Generate a real secret — don't type `secret123`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> [!warning] `.env` is already in `.gitignore` — keep it that way
> Never commit it. If you ever do, rotate the secret immediately.

> [!check] Verify 0.4
> `git status` does **not** list any `.env` file as untracked or staged.

---

### 0.5 — Clean out the demo code

**Prompt to paste into Claude:**

```text
This project is a college student portal (see @CLAUDE.md), but the scaffold still
has placeholder to-do "items" demo code. Remove it cleanly:

- Delete backend/src/models/item.ts, backend/src/services/itemService.ts,
  backend/src/routes/items.ts
- Remove the itemsRouter import and app.use('/api/items', ...) from @backend/src/app.ts
- Delete frontend/src/components/ItemList.tsx
- Remove the Item interface from frontend/src/types.ts (keep ApiError)
- Replace the body of @frontend/src/App.tsx with a minimal placeholder that
  renders "OAA Portal" inside the existing Layout
- Delete the empty OAA1/ folder

Do NOT touch: asyncHandler, httpError, errorHandler, notFound, config/env.ts,
lib/api.ts, or the health route. Those are the patterns we're keeping.

Then run npm run typecheck and fix anything that breaks.
```

> [!check] Verify Step 0
> ```bash
> npm run typecheck && npm run dev
> ```
> Both servers start. `http://localhost:5173` shows the placeholder. No console errors.
> `http://localhost:4000/api/health` returns OK. `http://localhost:4000/api/items` now 404s.

```bash
git add -A && git commit -m "step 0: foundation — git, CLAUDE.md, docs, env, cleanup"
```

---

## STEP 1 — Database Layer & Schema

**Est. 2–3 h · 🧠 PLAN MODE REQUIRED**

The most important step in the project. Everything downstream is shaped by these tables.

> [!important] Why Prisma
> Your scaffold has Postgres in Docker but nothing to talk to it. Prisma is the best fit here: one declarative schema file, real migrations, a fully typed client, and **Prisma Studio** gives you a visual database browser — which matters a lot when you're seeding test data and debugging. Drizzle is the alternative if you prefer writing SQL by hand.

### 1.1 — Start the database

```bash
docker compose up -d db
```

### 1.2 — Build the schema

**Prompt:**

```text
Plan mode first. Set up the database layer for this project.

Context:
- Postgres 16 is already in @docker-compose.yml (user/pass/db all "oaa")
- DATABASE_URL is already declared in @backend/src/config/env.ts (currently optional —
  make it required)
- Nothing connects to the DB yet; backend has no DB library

Use Prisma. I need:
1. Prisma installed and initialized in backend/
2. schema.prisma implementing the design in @docs/05-database-design.md, BUT with
   these corrections (they're in @docs/08-build-roadmap.md, section Phase 1):
   - attendance MUST have a date column: one row per (student, subject, date),
     with a unique constraint on that triple
   - do NOT store oaa/cgpa/attendance% as columns on students — they're derived
   - add proper departments, subjects, semesters tables (not text strings)
   - add tables for OAA inputs: oaa_scores, adaptability_assessments,
     physical_records, social_records
   - add audit_logs
   - one users table holding auth for all three roles, with students/teachers/admins
     tables referencing it
3. A db client singleton at backend/src/lib/prisma.ts
4. First migration generated
5. A seed script: 2 departments, 5 subjects, 3 teachers, 30 students, plus marks
   and attendance for all of them. Realistic-looking Indian college data.

Show me the schema for review BEFORE running the migration.
```

> [!warning] Seed 30 students, not 3
> Leaderboards, ranking, and pagination all look fine with 3 rows and fall apart at 30. Find the bugs now.

> [!check] Verify Step 1
> ```bash
> docker compose up -d db
> npx prisma migrate dev
> npx prisma studio
> ```
> Prisma Studio opens in the browser and you can see 30 students with marks and attendance rows. Attendance rows have real dates. The students table has **no** `oaa`, `cgpa`, or `attendance_percent` column.

```bash
git add -A && git commit -m "step 1: prisma schema, migration, seed"
```

---

## STEP 2 — Auth & Role-Based Access Control

**Est. 2–3 h · 🧠 PLAN MODE REQUIRED**

The security spine. Build it once, correctly, then never touch it.

**Prompt:**

```text
Plan mode. Build authentication and role-based access control.

Requirements:
- POST /api/auth/login — accepts { userId, password, role }, returns JWT + user info
- POST /api/auth/logout
- GET /api/auth/me — returns the current user
- bcrypt for password hashing, cost 12
- JWT contains user_id and role, 24h expiry, secret from config/env.ts
  (make JWT_SECRET required, not optional)

Middleware in backend/src/middleware/:
- requireAuth — verifies JWT, attaches req.user, else 401
- requireRole('student' | 'teacher' | 'admin') — 403 on mismatch
- requireSelfOrStaff — CRITICAL: when a student hits /api/students/:id/*, verify that
  :id belongs to the calling student. Teachers/admins bypass. This prevents a student
  reading another student's marks by changing the URL.

Also:
- Rate limit the login route (express-rate-limit)
- Extend the Express Request type with the user field
- Use the existing HttpError + asyncHandler patterns from @CLAUDE.md
- Update the seed script so every seeded user has a hashed password

Write tests (node --test) for:
- correct login returns a token
- wrong password returns 401
- student token is rejected by a teacher-only route
- student A cannot fetch student B's data
```

> [!danger] The bug that hits every project like this
> Getting the *role* check right but forgetting the *ownership* check. Test it by hand: log in as one student, request another student's marks, confirm you get **403**. If you get data, stop and fix it before continuing.

> [!check] Verify Step 2
> ```bash
> npm test
> ```
> All tests pass — **including** the student-A-can't-read-student-B test. Then manually: log in as a seeded student via curl/Postman, take the token, and request another student's ID. You must get 403.

```bash
git add -A && git commit -m "step 2: auth, JWT, RBAC, ownership checks + tests"
```

---

## STEP 3 — Frontend Shell

**Est. 2 h**

No feature pages yet — just the skeleton every page will hang off.

**Prompt:**

```text
Set up the frontend foundation. No feature pages yet — just the shell.

Install and configure:
- Tailwind CSS (migrate the existing frontend/src/styles/global.css)
- react-router-dom
- recharts (we'll use it later for OAA)

Build:
1. Router with route groups: public (/, /login), /student/*, /teacher/*, /admin/*
2. AuthContext — stores JWT in localStorage, exposes user/login/logout,
   restores session on refresh
3. ProtectedRoute component that redirects by role
4. Update @frontend/src/lib/api.ts to attach the JWT Authorization header
   automatically, and to redirect to /login on a 401
5. Shared layout: navbar with user name + logout, role-aware sidebar, page container
6. Reusable Loading, ErrorMessage, and EmptyState components
7. Login page with Student / Teacher / Admin tabs, wired to POST /api/auth/login

Keep the existing api.ts structure and { data } / { error } response convention.
```

> [!check] Verify Step 3
> Log in as a seeded student → you land on `/student`. Manually type `/admin` in the URL → you get redirected away. Refresh the page → still logged in. Click logout → back to `/login` and `/student` is no longer reachable.

```bash
git add -A && git commit -m "step 3: tailwind, router, auth context, layout, login page"
```

---

## STEP 4 — Landing Page

**Est. 2–3 h**

Pure static UI. Good momentum, low risk.

**Prompt:**

```text
Build the public landing page at "/" following @docs/01-landing-page.md.

All sections from the spec: hero, about, principal's message, statistics,
departments, courses, gallery, latest news, upcoming events, placement stats,
testimonials, contact, footer.

- Fully responsive (mobile first)
- Student / Teacher / Admin login buttons routing to /login with the tab preselected
- Use placeholder images and realistic dummy content for now
- Smooth scroll navigation
- Tailwind only, no new UI library
```

> [!tip] Timebox this to one session
> The landing page is the easiest thing in the project to over-polish for three days. It's also the least important to the actual functionality. Ship it and move on.

> [!check] Verify Step 4
> Open `/` on desktop and on a phone-width viewport — nothing overflows horizontally. Every section from the spec is present. The three login buttons land on `/login` with the right tab already selected.

```bash
git add -A && git commit -m "step 4: landing page"
```

---

## STEP 5 — Student Read-Only Slice ⭐

**Est. 3–4 h · 🧠 PLAN MODE REQUIRED**

**The most important milestone in the project.** Real login → real database → real screen.

**Prompt:**

```text
Plan mode. Build the student's read-only views — the first real end-to-end feature.

Backend (all behind requireAuth + requireSelfOrStaff):
- GET /api/students/me — profile
- GET /api/students/me/marks — subject-wise, grouped by semester
- GET /api/students/me/attendance — overall %, subject-wise breakdown, monthly trend
  (remember: attendance is computed from daily rows, not a stored counter)

Follow the route → service → prisma layering. Services hold the logic; routes stay thin.

Frontend:
- /student — dashboard with cards for the v1 scope only:
  Profile, Marks, Attendance, OAA, Leaderboard, Timetable, Announcements,
  Events, Assignments. (Skip Fee/Library/Placement/Club — not specced.)
- /student/profile — per @docs/02-student-module.md
- /student/marks — subject-wise table with internal/external/total
- /student/attendance — percentage, subject breakdown, Recharts bar chart,
  and a red warning banner if attendance < 75%

Real data from the database only. No hardcoded mock data anywhere.
```

> [!success] The proof point
> You log in as a seeded student and see **that student's actual marks**, from Postgres, in the browser. Everything after this is a variation on what you just built. If this works, the project works.

> [!check] Verify Step 5
> Log in as seeded student #1 → their real marks appear. Log out, log in as student #2 → **different** marks appear. Search the frontend for hardcoded arrays of student data — there should be none. Find a student under 75% attendance and confirm the red banner shows.

```bash
git add -A && git commit -m "step 5: student read-only slice — profile, marks, attendance"
```

---

## STEP 6 — Teacher Write Path

**Est. 3–4 h**

First real writes. Data integrity starts mattering here.

**Prompt:**

```text
Build the teacher module per @docs/03-teacher-module.md.

Backend (requireAuth + requireRole('teacher')):
- GET /api/teachers/me/classes — subjects assigned to this teacher
- GET /api/teachers/students — search by ID / name / department / semester
- POST /api/attendance/bulk — mark a whole class for one subject + date
- PATCH /api/attendance/:id — edit, and write an audit_logs row
- POST /api/marks + PATCH /api/marks/:id

Validation that must not be skipped:
- marks cannot exceed the subject max
- attendance for the same (student, subject, date) cannot be inserted twice —
  enforce at the DB level with the unique constraint, and return a clear 409
- a teacher can only touch students in classes actually assigned to them

Frontend:
- /teacher dashboard
- /teacher/attendance — pick subject + date, class roster, present/absent toggles,
  mark-all-present shortcut, bulk submit
- /teacher/marks — spreadsheet-style entry grid
- /teacher/students — search + student detail view
```

> [!warning] Test the double-submit
> Mark attendance for a class, then submit the exact same form again. You should get a clean 409 error, not duplicated rows. Without that unique constraint, every attendance percentage in the system silently goes wrong.

> [!check] Verify Step 6
> 1. Mark a class present, submit twice → second submit returns **409**, no duplicate rows in Prisma Studio.
> 2. Enter a mark above the subject max → rejected with a clear message.
> 3. As teacher A, try to write marks for a subject assigned to teacher B → **403**.
> 4. Edit an attendance row → a new `audit_logs` row appears.

```bash
git add -A && git commit -m "step 6: teacher module — attendance and marks entry"
```

---

## STEP 7 — The OAA Engine (backend + tests)

**Est. 4–5 h · 🧠 PLAN MODE REQUIRED**

The heart of the project. Everything so far has been building its inputs.

> [!important] Tests before UI, no exceptions
> A broken chart is obvious. A subtly wrong score is invisible — it just quietly ranks the wrong student first. This is the one place where you write the tests first.

**Prompt:**

```text
Plan mode. Build the OAA calculation engine. Spec: @docs/07-oaa-spec.md.

FORMULA:
OAA = (Academic + Adaptability + Physical + 0.5 × Social) / 3.5
Each input is 0–100. Result is 0–100.
Round to NEAREST INTEGER before grade lookup.

Step 1 — write backend/src/services/oaaService.ts with unit tests FIRST:
- all inputs 100 → OAA 100, grade A+
- all inputs 0 → OAA 0, grade F
- 95.4 rounds to 95 → grade A
- 95.6 rounds to 96 → grade A+
- a student with no physical records doesn't crash and isn't unfairly zeroed —
  decide and document the rule
- the full grade conversion table from the spec

Step 2 — the four component calculations:
- Academic: derived from marks, normalized to 0–100
- Adaptability: average of the 7 teacher-rated sub-criteria
- Physical: points from physical_records, mapped to 0–100
- Social: points from social_records + event participation, mapped to 0–100

Step 3 — recompute strategy: recalculate on marks/attendance/assessment writes,
store the result in oaa_scores with computed_at. Never recompute on page load.

Step 4 — read the 0.5 social weight from a settings table, NOT a hardcoded constant.
The admin spec promises configurable OAA weights.

Step 5 — endpoints:
- GET /api/students/me/oaa — score, grade, 4-dimension breakdown, trend
- POST /api/teachers/assessments/adaptability
- POST /api/teachers/records/social

Do not build the UI in this session.
```

> [!check] Verify Step 7
> `npm test` — every OAA unit test passes, including both rounding edge cases (95.4 → A, 95.6 → A+). Hit `GET /api/students/me/oaa` with a student token and get a real score back. Change the social weight in the settings table and confirm the recomputed score moves.

```bash
git add -A && git commit -m "step 7: OAA calculation engine + unit tests"
```

---

## STEP 8 — The OAA Dashboard (UI)

**Est. 2–3 h**

Separate session from Step 7. The engine must be green before you visualise it.

**Prompt:**

```text
Build the student OAA dashboard at /student/oaa using Recharts:
- Big gauge / circular progress for the overall score + letter grade
- RADAR CHART across Academic, Adaptability, Physical, Social — this is the
  signature visual of the whole project, make it look good
- Semester trend line chart
- "Strongest ability" and "Weakest ability" callout cards
- Suggested improvement areas based on the lowest dimension
```

> [!check] Verify Step 8
> The radar chart renders with four real axes from the API. The gauge number matches what `GET /api/students/me/oaa` returns. Strongest/weakest cards name the actually-highest and actually-lowest dimensions. Check it on mobile width — the chart must not overflow.

```bash
git add -A && git commit -m "step 8: OAA dashboard with radar chart"
```

---

## STEP 9 — Admin Console

**Est. 4–5 h · 🧠 PLAN MODE RECOMMENDED**

Mostly CRUD over tables that already exist — which is why it's here and not first.

**Prompt:**

```text
Build the admin module per @docs/04-admin-module.md.
All routes behind requireAuth + requireRole('admin').

- Admin dashboard with summary counts
- Student CRUD + filters (department/year/semester) + CSV export
- BULK STUDENT IMPORT FROM CSV — this is the real account-creation path
  (see the decision in @docs/08-build-roadmap.md 0.2; students should not be able
  to self-register into the system unapproved)
- Teacher CRUD, department assignment, password reset
- Department and subject management
- Marks approval + lock semester results
- Settings page: academic year, current semester, OAA weights, attendance threshold

Every admin mutation writes an audit_logs row.
Confirmation dialogs on every delete.
```

> [!check] Verify Step 9
> Import a CSV of 5 students → 5 new rows, each with a hashed password and a working login. Delete something → confirmation dialog appears first. Every create/update/delete you just did has a matching `audit_logs` row. Change the OAA weights in Settings → Step 7's engine picks up the new value.

```bash
git add -A && git commit -m "step 9: admin console — CRUD, CSV import, settings, audit"
```

---

## STEP 10 — Leaderboards & Analytics

**Est. 3–4 h**

**Prompt:**

```text
Build leaderboards and the analytics dashboard.

Backend — use SQL window functions for ranking, not JavaScript sorting:
RANK() OVER (PARTITION BY department_id ORDER BY oaa_score DESC)

Endpoints:
- GET /api/leaderboard?scope=college|department|semester|section
- GET /api/leaderboard/category?type=oaa|attendance|academic|social|physical
- GET /api/analytics/* for the admin charts

Frontend:
- /student/leaderboard — rankings with search + filters, current student highlighted
- /admin/analytics — department performance, attendance stats, pass %,
  grade distribution, event participation (Recharts)
- Report export to PDF and Excel

Two constraints:
1. Performance — do not rank every student on every request. Compute ranks on the
   same schedule as OAA and cache them.
2. Privacy — leaderboards show roll numbers and names, but make it a settings toggle.
   Publicly ranking students on a partly subjective score deserves an off switch.
```

> [!check] Verify Step 10
> With 30 seeded students the leaderboard loads fast and ranks are correct (ties handled sensibly). The logged-in student's own row is highlighted. Flip the privacy toggle in admin settings → the leaderboard hides names. Export to PDF and Excel and open both files.

```bash
git add -A && git commit -m "step 10: leaderboards, analytics, exports"
```

---

## STEPS 11–14 — Content Modules

**Est. 6–8 h total · One module per session · Order doesn't matter**

These four are independent of each other. Do them one at a time, fresh session each.

> [!note] File uploads — decide this before Step 11
> Event posters and assignment submissions need real storage. **Cloudinary's free tier is the path of least resistance** — or store locally in dev and swap later. Pick one now so Steps 11 and 13 don't disagree.

### STEP 11 — Events

```text
Build the events module per @docs/02-student-module.md and @docs/04-admin-module.md:
- Student: browse by type, event detail, register, view registrations
- Admin: create/edit/delete, poster upload, publish notifications
- Participation points feed the Social Contribution score
```

> [!check] Verify Step 11
> Register for an event as a student → it appears in "my registrations", and the student's **Social** dimension in the OAA breakdown goes up after recompute. Upload a poster and see it render.

### STEP 12 — Announcements

```text
Build the announcements module:
- Full CRUD (admin/teacher create, students read)
- Categories
- Scheduled publishing — an announcement with a future publish date must not be
  visible to students until that time
```

> [!check] Verify Step 12
> Create an announcement dated tomorrow → it does not appear on the student side. Backdate it → it appears.

### STEP 13 — Assignments

```text
Build the assignments module:
- Teacher creates an assignment (title, description, due date, subject, max marks)
- Student uploads a submission file before the due date
- Teacher grades submissions
- Late submissions are flagged, not silently accepted
```

> [!check] Verify Step 13
> Upload a file as a student, download it as the teacher, grade it, and see the grade on the student side. Submit after the due date → flagged as late.

### STEP 14 — Timetable

```text
Build the timetable module:
- Weekly grid by department / semester / section
- Admin creates and edits the grid
- Students and teachers see their own relevant timetable
```

> [!check] Verify Step 14
> A student sees only their own section's grid. A teacher sees only the periods they teach. The grid is readable on mobile.

```bash
git add -A && git commit -m "step N: <module> module"
```

*(commit after each of 11, 12, 13, 14 separately)*

---

## STEP 15 — Hardening & Deploy

**Est. 3–4 h**

**Prompt:**

```text
Security and deployment hardening pass.

Audit the whole codebase against @docs/06-security-technologies.md:
- Every route has correct auth + role + ownership checks — re-verify, don't assume
- Every request body is zod-validated
- No raw SQL string concatenation anywhere
- CORS locked to the real frontend domain (not *)
- helmet configured properly
- No secret is ever sent to the frontend
- Rate limiting on auth routes
- No console.log leaking user data

Then prepare deployment:
- Frontend → Vercel
- Backend → Render
- Database → Neon or Supabase
- Production env var checklist
- Run migrations against the production DB
- Seed realistic demo data + one demo account per role
- README with setup steps and screenshots

Report anything you find but do NOT fix silently — list it first.
```

> [!check] Final verification
> Open the live URL. Log in as all three demo accounts. Confirm each role sees only what it should. Confirm a student still **cannot** read another student's data on production — test it by editing the URL, not by trusting the UI.

```bash
git add -A && git commit -m "step 15: security hardening and production deploy"
```

---

# 🧯 Part D — When Things Go Wrong

| Symptom | Cause | Fix |
|---|---|---|
| `Cannot find module './foo'` | ESM needs file extensions | Import as `'./foo.js'` even for `.ts` files |
| Env var is `undefined` | Read directly from `process.env` | Add it to the zod schema in `config/env.ts` |
| CORS error in browser | Backend origin mismatch | Check `CORS_ORIGIN` matches the Vite port `5173` |
| Prisma client out of date | Schema changed, client didn't | `npx prisma generate` |
| Migration won't apply | Docker Postgres not running | `docker compose up -d db` |
| Claude rewrites your patterns | Missing context | Point at `@CLAUDE.md`, be explicit about reusing existing helpers |
| Claude's change broke something | It happens | `git reset --hard HEAD` — this is why you commit every step |

> [!tip] When a session goes sideways, restart it
> Arguing with a confused session for 20 minutes is slower than `/clear` and one better-scoped prompt. Fresh context beats accumulated confusion.

---

# ✅ Part E — Progress Tracker

| # | Step | Plan mode | Est. | Status |
|---|---|---|---|---|
| 0 | Foundation — git, CLAUDE.md, docs, env, cleanup | — | 30 min | ✅ |
| 1 | Database layer & schema | 🧠 required | 2–3 h | ⏸ deferred |
| 2 | Auth & RBAC | 🧠 required | 2–3 h | ⏸ deferred |
| 3 | Frontend shell | — | 2 h | ✅ (mock auth) |
| 4 | Landing page | — | 2–3 h | ✅ |
| 5 | **Student read-only slice** ⭐ | 🧠 required | 3–4 h | ⬜ |
| 6 | Teacher write path | — | 3–4 h | ⬜ |
| 7 | **OAA engine** ⭐ | 🧠 required | 4–5 h | ⬜ |
| 8 | OAA dashboard (radar chart) | — | 2–3 h | ⬜ |
| 9 | Admin console | 🧠 recommended | 4–5 h | ⬜ |
| 10 | Leaderboards & analytics | — | 3–4 h | ⬜ |
| 11 | Events module | — | 2 h | ⬜ |
| 12 | Announcements module | — | 1–2 h | ⬜ |
| 13 | Assignments module | — | 2–3 h | ⬜ |
| 14 | Timetable module | — | 1–2 h | ⬜ |
| 15 | Harden & deploy | — | 3–4 h | ⬜ |

Rough estimates for solo part-time work — treat them as *relative* sizing, not deadlines.

---

# 📌 Part F — The Five Things That Matter Most

1. **Do Step 0 today.** No git repo means no undo. No `docs/` means Claude invents your requirements. Everything else assumes both exist.
2. **`CLAUDE.md` is the highest-leverage file in the repo.** It's the difference between Claude following your architecture and reinventing it every session.
3. **Step 5 is the real milestone.** Real student, real marks, real database, on screen. That single slice de-risks the entire project.
4. **Step 7 gets tests before UI.** A wrong score is invisible. A wrong chart is obvious. Only one of those quietly ruins the product.
5. **Verify and commit after every step.** Ten minutes of checking saves a week of archaeology.

---

**Related:** [[08 - Build Roadmap]] · [[00 - Overview & Index]] · [[05 - Database Design]] · [[06 - Security & Technologies]]
