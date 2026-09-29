# docs/ — the specs

> **Superseded.** These specs describe the retired ERP-style portal (teacher and
> admin modules, marks, attendance, the four-dimension OAA score). OAA is now a
> student skills-and-opportunity platform — see `CLAUDE.md` at the repo root for
> the current product, rules and architecture. The files below are kept as history.

`plans.md` references these eight files by exact path. Steps 1, 4, 5, 6, 7, 9 and 11
read them as the source of truth.

| File                          | Used by     | Status                    |
| ----------------------------- | ----------- | ------------------------- |
| `01-landing-page.md`          | Step 4      | Drafted from `plans.md`   |
| `02-student-module.md`        | Steps 5, 11 | ✅ Written — Step 5 built |
| `03-teacher-module.md`        | Step 6      | ⚠️ Outline only           |
| `04-admin-module.md`          | Steps 9, 11 | ⚠️ Outline only           |
| `05-database-design.md`       | Step 1      | ⚠️ Outline only           |
| `06-security-technologies.md` | Step 15     | ⚠️ Outline only           |
| `07-oaa-spec.md`              | Step 7      | ⚠️ Outline only — BLOCKER |
| `08-build-roadmap.md`         | Steps 1, 9  | ⚠️ Outline only           |

## ⚠️ These are outlines, not your specs

The real requirements live in your Obsidian notes 01–08. **Paste them over these
files.** Each file below is a skeleton with the headings the build steps expect —
enough to keep paths valid, not enough to build from.

The one that matters most before you resume:

- **`07-oaa-spec.md`** — the grade conversion table and the seven adaptability
  sub-criteria cannot be guessed. Step 7 is blocked without them.

`05-database-design.md` is no longer a blocker: this project persists to a JSON
file rather than a database, and the entity shapes now live in
`backend/src/data/types.ts`. Read that file as the schema of record.

Anything left as `TODO:` in these files is a question that must be answered by you,
not invented during a build step.
