# PATHS — Master Completion Plan

> Read this file first, then `10_CONVENTIONS_FOR_CLAUDE_CODE.md` before touching code.
> Every other file in this folder is a self-contained work order for one phase.

---

## 0. What this plan is

PATHS — Personalized AI Talent Hiring System — is partially built. A long architecture
document (`PATHS_Complete_UI_Architecture.docx`) and a gap analysis
(`PATHS_Completion_Blueprint.docx`) describe the full target state. This plan
collapses both documents into an executable sequence Claude Code can work through.

Each phase is a Markdown file. A phase has:

- a single clear goal
- preconditions that must be true before it starts
- backend tasks (models, migrations, routers, agents) with file paths + endpoints
- frontend tasks (routes, components, hooks) with file paths + API contracts
- acceptance criteria (a smoke test that proves the phase is done)
- the canonical task IDs that appear in `11_TASK_INDEX.md`

Claude Code should pick a phase, work it end-to-end, run the smoke test, then move on.

---

## 1. Target state (what "done" means)

PATHS is shipped as a commercial SaaS with five portals, all served from one Next.js
14 App Router monorepo + one FastAPI backend:

| Portal | Route prefix | Role | Screens |
|---|---|---|---|
| Public / Marketing | `/` | Anyone | 11 |
| Candidate | `/candidate/*` | `CANDIDATE` | 10 |
| Organization | `/dashboard`, `/jobs`, … | `ORGANIZATION_MEMBER` | 17 |
| Platform Admin | `/admin/*` | `PLATFORM_ADMIN` | 9 |
| Platform Owner | `/owner/*` | `OWNER` | 7 |

Total: **54 screens**. The plan completes every missing/partial screen and the six
core AI agents from the spec (CV Ingestion, Screening, Interview Intelligence,
Sourcing, Outreach, Bias Guardrail) plus a new Decision Support standalone path.

---

## 2. Phase map

| Phase | File | Goal | Est. days |
|---|---|---|---|
| 0 | `01_PHASE_0_FOUNDATIONS.md` | Unblock everything: env, secrets, dead code, migrations | 1–2 |
| 1 | `02_PHASE_1_JOB_HUB_AND_PIPELINE.md` | Job Detail Hub (6 tabs), Pipeline Board, Candidate Profile, Wizard Step 3 | 4–5 |
| 2 | `03_PHASE_2_INTERVIEWS_AND_DECISIONS.md` | Interview Schedule + Session + Decision Matrix + Screening bias panel | 4–5 |
| 3 | `04_PHASE_3_AGENT_COMPLETION.md` | Bias Guardrail service, Outreach agent, Sourcing agent, RAG nodes, BackgroundTasks | 4–5 |
| 4 | `05_PHASE_4_CANDIDATE_PORTAL.md` | Discover, Applications, Notifications, Growth Plan, Settings, Skills | 4 |
| 5 | `06_PHASE_5_REPORTS_ANALYTICS_OUTREACH.md` | Reports page, analytics_events, Outreach Center, Knowledge Base | 3 |
| 6 | `07_PHASE_6_COMMERCIAL_LAUNCH.md` | Pricing, Billing (Stripe), Public Job Board, Forgot Password, marketing pages | 5–6 |
| 7 | `08_PHASE_7_ADMIN_AND_OWNER.md` | Admin Org Detail, Agent Monitor, System Health; full Owner portal | 4 |
| 8 | `09_PHASE_8_LAUNCH_HARDENING.md` | Security, GDPR, observability, CI/CD, perf, docs | 3 |

Total: **32–37 working days** for a single engineer, or 3–4 weeks with Claude Code
working in parallel on independent tracks.

---

## 3. Execution rules

1. **Read `10_CONVENTIONS_FOR_CLAUDE_CODE.md` once per session.** It restates the
   non-negotiable rules from `CLAUDE.md` and adds plan-specific ones.
2. **Do not skip Phase 0.** Several "missing data" bugs in later phases trace back
   to the `HAS_BACKEND` flag and the missing `.env.local`. Fix the foundations
   first or every later page will look broken for unrelated reasons.
3. **One phase at a time, end-to-end.** Backend + frontend + tests + smoke test
   for that phase before moving on. Half-finished phases create merge pain.
4. **Every task has an ID (`PATHS-###`)** listed in `11_TASK_INDEX.md`. Mention
   the ID in commit messages: `git commit -m "PATHS-014: add fairness_rubric table"`.
5. **Smoke tests are mandatory.** Each phase file ends with a `## Acceptance` block.
   The phase isn't done until that block passes manually in a browser against
   a fresh database.
6. **No new dependencies without checking.** The stack is fixed: Next.js 14 +
   shadcn/ui + TanStack Query + TanStack Table v8 + Recharts + @dnd-kit +
   React Hook Form + Zod + Framer Motion on the frontend; FastAPI + SQLAlchemy
   async + Alembic + LangGraph + Qdrant + Apache AGE + OpenRouter on the backend.
7. **Never touch `frontend/src/`.** It is dead code. Working folder is
   `frontend/apps/web/src/`. This is repeated in `10_CONVENTIONS_FOR_CLAUDE_CODE.md`
   because it has caused incidents before.

---

## 4. How to read a phase file

Each phase file has these sections in this order:

```
# Phase N — <name>
## Goal
## Preconditions
## Backend deliverables
   ### Models & migrations
   ### API endpoints
   ### Agent / service changes
## Frontend deliverables
   ### Routes
   ### Components
   ### Hooks & API client
## Data contracts (request/response JSON)
## Acceptance (smoke test)
## Tasks (PATHS-### list)
## Risks & rollback
```

Backend always comes before frontend in a phase. The frontend section assumes the
endpoints in the backend section already exist and return the shapes documented in
"Data contracts".

---

## 5. Branching & PR strategy

- One branch per phase: `phase/0-foundations`, `phase/1-job-hub`, etc.
- Within a phase, one PR per cohesive unit (e.g. "Job Detail Hub shell",
  "Pipeline Board read-only", "Pipeline Board drag-and-drop") — not one giant PR.
- PR title format: `[PATHS-014] Add fairness rubric step to job wizard`.
- PR body must include: a screenshot/GIF of the new UI, the smoke test result,
  and a checklist of the 4 page states (loading / error / empty / success).

---

## 6. Definition of "launch ready"

The platform is ready to publish to organizations and candidates when all of the
following are true:

- Phases 0–6 are merged to `main` and the acceptance test for each has passed.
- All P0 security items in `09_PHASE_8_LAUNCH_HARDENING.md` are resolved
  (rotated secrets, no service-account JSON in repo, real `SECRET_KEY`).
- GDPR endpoints work: candidates can export their data and delete their account.
- The Stripe webhook → `analytics_events` → owner revenue dashboard loop is
  exercised end-to-end with at least one test subscription.
- The README has a copy-pasteable "set up locally" section that works on a fresh
  machine in under 15 minutes.

Phases 7 and 8 should ship before public launch; Phase 7 admin tooling will be
needed the first time something breaks in production.

---

## 7. Files in this folder

```
docs/plan/
├── 00_MASTER_PLAN.md                       ← you are here
├── 01_PHASE_0_FOUNDATIONS.md
├── 02_PHASE_1_JOB_HUB_AND_PIPELINE.md
├── 03_PHASE_2_INTERVIEWS_AND_DECISIONS.md
├── 04_PHASE_3_AGENT_COMPLETION.md
├── 05_PHASE_4_CANDIDATE_PORTAL.md
├── 06_PHASE_5_REPORTS_ANALYTICS_OUTREACH.md
├── 07_PHASE_6_COMMERCIAL_LAUNCH.md
├── 08_PHASE_7_ADMIN_AND_OWNER.md
├── 09_PHASE_8_LAUNCH_HARDENING.md
├── 10_CONVENTIONS_FOR_CLAUDE_CODE.md       ← read once per session
└── 11_TASK_INDEX.md                        ← flat checklist of every PATHS-### task
```
