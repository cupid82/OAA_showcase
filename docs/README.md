# docs/ — the specs

`plans.md` references these eight files by exact path. Steps 1, 4, 5, 6, 7, 9 and 11
read them as the source of truth.

| File                          | Used by     | Status                    |
| ----------------------------- | ----------- | ------------------------- |
| `01-landing-page.md`          | Step 4      | Drafted from `plans.md`   |
| `02-student-module.md`        | Steps 5, 11 | ⚠️ Outline only           |
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

The two that matter most before you resume:

- **`07-oaa-spec.md`** — the grade conversion table and the seven adaptability
  sub-criteria cannot be guessed. Step 7 is blocked without them.
- **`05-database-design.md`** — Step 1 shapes every table in the project from this.

Anything left as `TODO:` in these files is a question that must be answered by you,
not invented during a build step.
