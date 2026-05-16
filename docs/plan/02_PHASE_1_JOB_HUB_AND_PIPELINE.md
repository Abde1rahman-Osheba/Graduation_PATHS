# Phase 1 — Job Detail Hub & Pipeline Board

## Goal

Make a job navigable end-to-end. After this phase a recruiter can click any job
on `/jobs`, land on a 6-tab Job Detail Hub, drag candidates across a 9-column
Kanban pipeline, open a full candidate profile with score breakdowns, and create
new jobs with a fairness rubric.

This phase is the spine of the org portal. Every later org feature plugs into
the Job Detail Hub as a new tab or a new card. **It is the highest-impact phase
in the entire plan.**

## Preconditions

- Phase 0 acceptance has passed.
- `/dashboard` and `/jobs` work and show real data.

---

## Backend deliverables

### Models & migrations

1. **`fairness_rubric` table.** Per-job bias configuration.
   ```python
   # backend/app/models/fairness_rubric.py
   class FairnessRubric(Base):
       __tablename__ = "fairness_rubric"
       id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
       job_id: Mapped[UUID] = mapped_column(ForeignKey("jobs.id"), unique=True)
       protected_attrs: Mapped[dict] = mapped_column(JSONB, default=dict)
       # e.g. {"gender": True, "age_band": True, "location": False}
       disparate_impact_threshold: Mapped[float] = mapped_column(default=0.8)  # 80% rule
       enabled: Mapped[bool] = mapped_column(default=True)
       created_at: Mapped[datetime] = mapped_column(default=func.now())
   ```
   Migration: `alembic revision --autogenerate -m "add_fairness_rubric"`.

2. **`pipeline_stage` enum column on `candidate_applications`** (or whichever
   join table connects a candidate to a job). The 9 stages:
   ```python
   class PipelineStage(str, Enum):
       DEFINE = "define"
       SOURCE = "source"
       SCREEN = "screen"
       SHORTLIST = "shortlist"
       REVEAL = "reveal"
       OUTREACH = "outreach"
       INTERVIEW = "interview"
       EVALUATE = "evaluate"
       DECIDE = "decide"
   ```
   Default new applications to `SCREEN` (already past `DEFINE`/`SOURCE` once
   they exist).

### API endpoints

3. **`GET /api/v1/jobs/{job_id}`** — full job detail.
   ```
   200 → {
     id, title, department, location, employment_type, salary_min, salary_max,
     description (rich), required_skills [{ name, weight }],
     optional_skills [{ name, weight }],
     status, posted_at, created_at, updated_at,
     stats: { total_candidates, by_stage: { screen: n, shortlist: n, ... } },
     fairness_rubric: { protected_attrs, disparate_impact_threshold, enabled }
   }
   ```
4. **`GET /api/v1/jobs/{job_id}/pipeline-stages`** — counts and previews per stage.
   ```
   200 → {
     stages: [
       { key: "screen", count: 12, preview: [{id, name, score}, ...up to 5] },
       ...
     ]
   }
   ```
5. **`GET /api/v1/jobs/{job_id}/candidates`** — paged table data.
   ```
   query: stage, min_score, source, q (search), sort, page, page_size
   200 → { items: [...], total, page, page_size }
   ```
6. **`PUT /api/v1/candidate-applications/{app_id}/stage`** — move a candidate.
   ```
   body: { stage: "shortlist" }
   200 → { id, stage, updated_at }
   ```
   Must enforce tenant isolation: the application's job must belong to
   `current_user.org_id`.
7. **`PUT /api/v1/jobs/{job_id}/fairness-rubric`** — upsert rubric.
   ```
   body: { protected_attrs, disparate_impact_threshold, enabled }
   200 → FairnessRubric
   ```
8. **`GET /api/v1/candidates/{candidate_id}`** — full profile.
   ```
   200 → {
     id, name, headline, location, email_masked, phone_masked,
     avatar_url, current_role, years_experience,
     overall_score, pipeline_stage,
     cv: { experience: [...], education: [...], skills: [...], projects: [...] },
     scores: [
       { criterion, score, weight, reasoning }
     ],
     activity: [{ type, at, actor, payload }]
   }
   ```

### Tenant isolation

Every query above must filter by `current_user.org_id` (Rule 3 in
`CLAUDE.md`). For candidate detail this means the candidate must be in
`candidate_applications` for a job belonging to the user's org.

### Routers

- New router file: `backend/app/api/v1/job_detail.py` for endpoints 3, 4, 5.
- Extend `backend/app/api/v1/candidate_applications.py` (or create it) for 6.
- New router: `backend/app/api/v1/fairness_rubric.py` for 7.
- Extend existing `backend/app/api/v1/candidates.py` for 8.
- Register all routers in `backend/app/main.py`.

---

## Frontend deliverables

### Routes

```
src/app/(dashboard)/
├── jobs/
│   ├── new/
│   │   └── page.tsx                     ← extend wizard, add Step 3
│   ├── [id]/
│   │   ├── page.tsx                     ← Job Detail Hub (default tab: overview)
│   │   ├── pipeline/page.tsx            ← Pipeline Board (Kanban)
│   │   ├── candidates/
│   │   │   ├── page.tsx                 ← candidates table (already partial)
│   │   │   └── [cid]/page.tsx           ← Candidate Profile
│   │   ├── screening/page.tsx           ← (extended in Phase 2)
│   │   ├── interviews/page.tsx          ← stub (built in Phase 2)
│   │   └── decision/page.tsx            ← stub (built in Phase 2)
```

The Job Detail Hub uses `next/navigation`'s `<Link>` inside a `<TabBar />`
component so each tab is a real route — preserves URL, browser back, sharing.

### Components

Create under `src/components/features/job-detail/`:

- `JobHeader.tsx` — title, status badge, action menu (Edit / Archive / Delete /
  Run Screening).
- `JobTabBar.tsx` — 6 tab links: Overview | Pipeline | Candidates | Screening |
  Interviews | Decision.
- `JobOverviewTab.tsx` — description, required skills with weights, optional
  skills, fairness rubric summary, KPI strip.
- `JobStatsStrip.tsx` — 4 mini-cards: Total Candidates, Avg Score, Shortlisted,
  Time-to-First-Hire.

Under `src/components/features/pipeline/`:

- `PipelineBoard.tsx` — top-level. Uses `@dnd-kit/core` + `@dnd-kit/sortable`.
  9 columns laid out with `overflow-x-auto`.
- `PipelineColumn.tsx` — one stage. Renders header + `SortableContext` over
  `CandidateCard`.
- `CandidateCard.tsx` — avatar, name, score chip, source tag, drag handle.
- `PipelineFilterBar.tsx` — score range slider, source multiselect, search.
- `MoveAllToNextStageButton.tsx` — column action.

Under `src/components/features/candidate-profile/`:

- `CandidateProfileHeader.tsx`
- `CandidateScoreBar.tsx` — single criterion bar with tooltip carrying the LLM
  reasoning.
- `CandidateSkillsRadar.tsx` — Recharts `RadarChart` comparing required vs
  candidate skill level.
- `CandidateTimeline.tsx` — vertical list of pipeline events.
- `CandidateActionBar.tsx` — Shortlist / Schedule Interview / Reveal Contact /
  Reject / Move Stage.

Under `src/components/features/job-wizard/`:

- `FairnessRubricStep.tsx` — Step 3 of the wizard. Toggles per protected
  attribute, slider for disparate-impact threshold (default 0.8 = the
  four-fifths rule), info popovers explaining each setting.

### Hooks & API client

In `src/lib/api/index.ts`:
```ts
export async function getJobById(id: string): Promise<BackendJobDetail> { ... }
export async function getJobPipelineStages(id: string): Promise<BackendPipelineStages> { ... }
export async function getJobCandidates(id: string, q: JobCandidatesQuery) { ... }
export async function moveApplicationStage(appId: string, stage: PipelineStage) { ... }
export async function putFairnessRubric(jobId: string, r: FairnessRubricInput) { ... }
export async function getCandidate(cid: string): Promise<BackendCandidateDetail> { ... }
```

In `src/lib/api/adapters.ts` — add `adaptJobDetail`, `adaptPipelineStages`,
`adaptCandidateDetail` to map snake_case → camelCase.

In `src/lib/hooks/index.ts`:
```ts
export function useJob(id: string) { ... }
export function useJobPipelineStages(id: string) { ... }
export function useJobCandidates(id, q) { ... }
export function useMoveApplicationStage() { ... }      // mutation
export function useUpdateFairnessRubric() { ... }      // mutation
export function useCandidate(cid: string) { ... }
```

All mutations invalidate `["job", id]`, `["jobPipelineStages", id]`, and
`["jobCandidates", id]` on success.

### Drag-and-drop spec

- **Library:** `@dnd-kit/core` + `@dnd-kit/sortable` (per `8.1` of the
  architecture doc — do not use `react-beautiful-dnd`, it is unmaintained).
- **Optimistic update:** when a card is dropped, immediately update the
  TanStack Query cache for both source and destination columns, then call
  `PUT /candidate-applications/{id}/stage`. On error, revert and toast.
- **Accessibility:** use `KeyboardSensor` so candidates can be moved with
  arrow keys + space — required for WCAG 2.1 AA per the design system.

---

## Data contracts (canonical examples)

### `GET /jobs/{id}` (success)
```json
{
  "id": "5b1...",
  "title": "Senior Backend Engineer",
  "department": "Engineering",
  "location": "Cairo, Egypt (Hybrid)",
  "employment_type": "full_time",
  "salary_min": 40000,
  "salary_max": 60000,
  "description": "<p>We are hiring...</p>",
  "required_skills": [
    { "name": "Python", "weight": 5 },
    { "name": "PostgreSQL", "weight": 4 }
  ],
  "optional_skills": [{ "name": "LangGraph", "weight": 2 }],
  "status": "active",
  "stats": {
    "total_candidates": 47,
    "by_stage": {
      "screen": 23, "shortlist": 12, "reveal": 4, "outreach": 3,
      "interview": 3, "evaluate": 1, "decide": 1
    }
  },
  "fairness_rubric": {
    "protected_attrs": {"gender": true, "age_band": true, "location": false},
    "disparate_impact_threshold": 0.8,
    "enabled": true
  }
}
```

### `PUT /candidate-applications/{id}/stage` (error)
```json
HTTP 403
{ "detail": "Application does not belong to your organization." }
```

---

## Acceptance

A reviewer should be able to:

- [ ] Click any row on `/jobs` and land on `/jobs/{id}` showing the Overview tab.
- [ ] Switch through all 6 tabs without a full page reload (route is a real
      Next.js route per tab, but `<Link>` makes transitions feel instant).
- [ ] Open `/jobs/{id}/pipeline`, see 9 columns with correct counts.
- [ ] Drag a candidate card from `Screen` → `Shortlist`; the move persists
      after browser reload.
- [ ] Open `/jobs/{id}/candidates/{cid}`, see the radar chart, scoring bars
      with hover-reveal LLM reasoning, and a timeline of events.
- [ ] Create a new job via `/jobs/new`, fill all 4 steps including Step 3
      (Fairness Rubric), and see the rubric reflected on the Overview tab.
- [ ] Every page in this phase has 4 states: loading skeleton, error with
      retry, empty state with CTA, and the success render.

---

## Tasks

| ID | Task |
|---|---|
| PATHS-010 | Create `fairness_rubric` model + Alembic migration |
| PATHS-011 | Add `pipeline_stage` enum + column to candidate_applications |
| PATHS-012 | Build `GET /jobs/{id}` endpoint with stats + rubric |
| PATHS-013 | Build `GET /jobs/{id}/pipeline-stages` endpoint |
| PATHS-014 | Build `GET /jobs/{id}/candidates` with filtering & pagination |
| PATHS-015 | Build `PUT /candidate-applications/{id}/stage` with tenant check |
| PATHS-016 | Build `PUT /jobs/{id}/fairness-rubric` |
| PATHS-017 | Build `GET /candidates/{id}` returning CV + scores + activity |
| PATHS-018 | Frontend: Job Detail Hub shell (`/jobs/[id]/page.tsx` + TabBar) |
| PATHS-019 | Frontend: Overview tab content + stats strip |
| PATHS-020 | Frontend: Pipeline Board read-only (9 columns + cards) |
| PATHS-021 | Frontend: Pipeline drag-and-drop with optimistic updates |
| PATHS-022 | Frontend: Candidate Profile page (header + CV viewer) |
| PATHS-023 | Frontend: Skills radar + score breakdown + timeline |
| PATHS-024 | Frontend: Candidate action bar (Shortlist/Reject/etc.) |
| PATHS-025 | Frontend: Create Job Wizard Step 3 — Fairness Rubric |
| PATHS-026 | Frontend: API client + adapters + hooks for all of the above |
| PATHS-027 | Add empty/error states to every page in this phase |

---

## Risks & rollback

- **Pipeline drag-and-drop is the highest-risk piece.** Ship the read-only
  board first (PATHS-020) as a separate PR. Add drag-and-drop in PATHS-021 only
  after the read-only version is stable.
- **`@dnd-kit` keyboard a11y** needs explicit `aria-roledescription` on
  draggables. The architecture doc requires WCAG 2.1 AA. If keyboard support
  is incomplete, the design accessibility review skill will flag it later.
- **Optimistic updates** must reconcile when the server rejects. Always keep
  the pre-mutation snapshot in `onMutate` and restore it in `onError`.
- **Candidate Profile** can be heavy. Lazy-load the radar chart and the CV
  viewer; show skeletons until each loads.
