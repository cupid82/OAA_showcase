# OAA Product Direction and Change Plan

## A clear position for OAA

**OAA should not be another college ERP.** It should be a student-centred academic growth and opportunity platform: the place that helps a student decide what to do next, discover relevant opportunities, build proof of their work, and move towards a goal.

The college ERP remains the official system of record. It owns formal, institution-led processes such as attendance, fees, marks, examination activity, course registration, leave, and official notices.

OAA adds value *on top of* that information. It turns it into guidance, planning, opportunities, evidence of growth, and useful connections.

> **Product promise:** “OAA helps me turn my college journey into a clear path towards my next opportunity.”

## Grounding and scope

This document is based on the product direction discussed: your existing college ERP, OAA, and the current use of Outlook for notifications. The source repository was not available to inspect in this environment, so this is deliberately a product and implementation-direction document—not a claim about the exact screens, database, or code that already exist.

Before implementation, validate each feature with a small group of students, faculty, and placement staff. Do not assume data access, integrations, or permissions without confirming them with the college.

## The boundary: ERP versus OAA

| Area | ERP should own it | OAA should own it |
|---|---|---|
| Official data | Canonical attendance, marks, fees, timetable, enrolment, exam records | A student-friendly snapshot only when data access is approved |
| Institutional processes | Fee payments, leave approval, registration, examination forms, official circulars | Goal setting, planning, personal progress, and follow-through |
| Career preparation | Usually not its core purpose | Skills profile, project evidence, opportunity discovery, application tracking |
| Student support | Administrative tickets and notices | Peer support, study groups, mentoring, relevant resources and reminders |
| Reporting | Official compliance reports | Aggregated, permission-aware insight into interest, readiness, and engagement |

### What OAA should avoid duplicating

- A separate fee-payment, leave, examination, or course-registration workflow.
- A full copy of the ERP marks, attendance, and timetable screens.
- An admin-heavy dashboard full of tables and forms.
- Notifications that simply repeat generic ERP notices.
- A duplicate student profile with conflicting information.

If an official ERP action is needed, OAA should use a clear **Open in ERP** link. This keeps the ownership obvious and reduces incorrect or out-of-date data.

## The main OAA experience

OAA should feel like a personal workspace, not an institution portal. A simple navigation model is:

```text
Today  |  My Path  |  Explore  |  Portfolio  |  Community
```

### 1. Today: the action centre

This is the home screen. Its job is not to display every statistic; its job is to help the student make the next useful move.

Show a short, prioritised list such as:

- An internship, scholarship, hackathon, club, or research opportunity that matches the student’s profile.
- An approaching application or event deadline.
- A suggested action towards the student’s chosen goal.
- A portfolio task, such as adding a completed project or certificate.
- A reminder from a mentor, study group, or course community.

Each item must answer three questions: **why am I seeing this, what do I do, and by when?** Students should be able to save, dismiss, mute, or act on an item.

### 2. My Path: academic and career planning

This section should make the student’s journey understandable without impersonating the ERP.

Possible components:

- A selected goal: for example, software developer, data analyst, higher studies, entrepreneurship, or an undecided/exploring path.
- A degree map that shows completed, current, and remaining courses only if the college approves access to that data.
- Prerequisite awareness and elective-planning guidance. Present it as guidance, never as an official registration decision.
- A skills map that connects coursework, projects, certificates, and self-declared skills to the chosen goal.
- A small, editable action plan: this week, this month, and this semester.

Avoid presenting a “career score” as an objective truth. Explain recommendations in plain language: *“Suggested because you selected Data Analytics and have completed Python basics.”*

### 3. Explore: a trusted opportunity hub

This is one of the clearest ways for OAA to be different from ERP.

Start with well-defined opportunity types:

- Internships and entry-level jobs.
- Hackathons, coding contests, and workshops.
- Scholarships and fellowships.
- Research, faculty projects, and campus roles.
- Clubs, volunteering, and leadership opportunities.

For every listing, show the organiser, deadline, eligibility, expected effort, source link, and verification status. Let a student save an opportunity, track their application stage, add a private note, and record an outcome.

Do not automatically claim that an opportunity is verified. Use explicit statuses such as **college-posted**, **partner-posted**, **student-shared**, or **unverified external link**.

### 4. Portfolio: proof, not just a profile

The portfolio gives students a reason to return to OAA even when there is no new ERP activity.

It can collect:

- Projects with a short problem statement, role, skills used, outcome, repository/demo link, and optional images.
- Certificates, achievements, event participation, and leadership activity.
- Resume versions and a readiness checklist.
- Links to GitHub, LinkedIn, or personal sites only when the student chooses to add them.

The product should never publish a portfolio item automatically. The student chooses what is private, shared with mentors, or public.

### 5. Community: useful connections with boundaries

OAA can create real value through connections, but it should begin with focused use cases rather than becoming an uncontrolled social network.

Start with:

- Course or topic study groups.
- Peer requests for help and resource recommendations.
- Mentor discovery for alumni, seniors, or faculty members who opt in.
- Structured mentor requests with a topic, goal, and preferred time.

Add moderation, reporting, block controls, and clear community rules before broadly opening student-to-student posting.

## Fixing the notification experience

### Why Outlook feels wrong as the main notification surface

Outlook is useful for formal communication, but it is a poor primary experience for OAA actions. It separates students from the product context, mixes OAA messages with all other email, makes prioritisation difficult, and gives limited control over save/dismiss/follow-up behaviour.

The answer is not necessarily to remove email. The answer is to make **OAA the source of action** and use email only as an optional delivery channel.

### Recommended notification model

| Layer | Purpose | Examples |
|---|---|---|
| In-app inbox | Primary record of OAA activity | Saved opportunity deadline, mentor reply, study-group update |
| Today cards | The few actions that matter now | “Submit before Friday”, “Complete portfolio project details” |
| Optional Outlook email | Digest or high-value fallback | Weekly opportunity digest, a deadline reminder the student opted into |
| User preferences | Control noise and delivery | Turn categories on/off, choose immediate vs digest, quiet hours |

### Rules for OAA notifications

1. Every notification must have a purpose and a direct action.
2. Group similar updates; do not send one alert for every small change.
3. Let students set preferences by category: opportunities, goals, mentors, community, and academic reminders.
4. Use an Outlook digest by default if email is retained. Immediate email should be reserved for deadlines, direct replies, or items the student explicitly subscribes to.
5. Show the reason for a recommendation and let the student say “not interested.” Use that feedback to reduce irrelevant alerts.
6. Keep sensitive academic details out of email subject lines and previews.
7. Store notification state in OAA—read, saved, dismissed, acted on—rather than using Outlook read status as the product state.

### A practical first notification release

Build an in-app bell/inbox and a **Today** action list first. Support only these notification types initially:

- Opportunity deadline approaching.
- A new opportunity matching a saved interest.
- Mentor or study-group reply.
- A self-created goal reminder.

Then add an opt-in weekly Outlook digest. This is enough to validate usefulness without building a complex messaging system prematurely.

## Changes to make in OAA

### Product and information architecture

- Reframe the homepage as **Today**, with prioritised actions rather than ERP-like statistics.
- Use the five primary areas: Today, My Path, Explore, Portfolio, and Community.
- Move official college tasks out of OAA or label them clearly as links back to ERP.
- Introduce a short onboarding flow that asks for interests, goals, skills, preferred opportunity types, and notification preferences. Every answer must be editable later.
- Use human language: “Next action”, “Saved opportunities”, and “Evidence of work” instead of internal or administrative labels.

### Data and integration boundaries

- Treat ERP information as read-only in OAA unless the college explicitly authorises write-back.
- Display a source and last-synced time wherever ERP-derived data is shown.
- Ask for consent before importing or displaying optional profile links, projects, certificates, or external accounts.
- Keep OAA-created data separate: goals, interests, portfolio items, saved opportunities, application progress, preferences, and community activity.
- Define retention, visibility, and deletion behaviour before collecting portfolio or community content.

### Roles and permissions

Start with the smallest useful set:

- **Student:** controls their own profile, goals, portfolio, preferences, and opportunity tracker.
- **Mentor:** sees only the information a student chooses to share and can respond to requests.
- **Opportunity publisher/moderator:** creates and reviews listings; does not gain access to unrelated student data.
- **OAA administrator:** manages moderation, approved sources, and platform configuration.

Avoid automatically granting broad access to faculty, alumni, or administrators just because they belong to the college.

### UX and visual direction

- Use a calm, modern, student-focused visual language: progress, discovery, and momentum—not office-administration imagery.
- Prefer cards, timelines, checklists, and simple maps over dense tables.
- Give each goal a visible path with milestones, but do not gamify serious academic outcomes into misleading scores or rankings.
- Make empty states useful: suggest adding the first project, selecting interests, or exploring verified opportunities.
- Design mobile-first for quick check-ins, while keeping portfolio editing comfortable on desktop.

## Recommended delivery order

### Phase 0: decide the product boundary

- Confirm what OAA stands for and write its one-sentence promise.
- List which ERP data may be read, who approves it, and how often it can be refreshed.
- Define the first student group and one primary goal, such as internship readiness.
- Remove or de-emphasise duplicate ERP workflows.

### Phase 1: a useful student MVP

- Goal and interest onboarding.
- Today action centre and in-app notification inbox.
- Opportunity hub with manual, moderated listings and save/apply tracking.
- Basic portfolio with projects, achievements, and private/public visibility.
- Opt-in weekly Outlook digest.

### Phase 2: planning and support

- My Path action plan and skills map.
- Mentor requests and focused study groups.
- Recommendation explanations and “not interested” feedback.
- Approved ERP read-only academic snapshot, if access is available.

### Phase 3: validate before expanding

- Measure whether students return because the platform helps them act.
- Improve matching based on student feedback and verified outcomes.
- Add more opportunity sources only when publisher review and data quality can be maintained.
- Consider faculty or placement insights only after privacy rules and aggregation thresholds are agreed.

## MVP success checks

The first version is succeeding when a student can do all of the following without needing the ERP:

1. Choose or update a goal and interests.
2. Find a relevant opportunity, understand why it is relevant, and save it.
3. See one clear next action on the Today screen.
4. Add a project or achievement as evidence of progress.
5. Control whether they receive an in-app alert, an Outlook digest, or neither.

Useful measures to track after launch include completed actions, saved opportunities, applications tracked, portfolios with at least one item, notification dismiss/mute rates, and short student feedback. These should guide improvements; they are not student performance rankings.

## Decisions to settle before development

- What exactly does OAA expand to, and who is its first target user?
- Which opportunity sources will be trusted and who reviews new listings?
- Can OAA access attendance, course, or marks data? If yes, what is the approval and refresh process?
- Will mentors be alumni, seniors, faculty, or all three—and who moderates access?
- Which portfolio details are private by default?
- Is Outlook only an optional digest channel, or does the college require certain formal emails?
- What is the first outcome to optimise for: internships, project building, academic planning, or mentoring?

## Final recommendation

Build OAA as the **action, opportunity, and evidence layer** around the college journey. Let ERP remain the official transaction system. Start small with Today, an in-app notification centre, opportunities, and portfolios; validate that students take useful actions; then add planning, mentoring, and approved ERP context.

That separation will make OAA feel intentional and memorable instead of like a redesigned ERP portal.
