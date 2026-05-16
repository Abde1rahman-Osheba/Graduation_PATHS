# Phase 3 — Agent Completion (6 of 6)

## Goal

Bring the AI agent layer up to the spec's six-agent design. After this phase,
all six core agents exist as proper LangGraph graphs (or named services), and
the asynchronous execution model is consistent across every agent.

| Agent | Spec status | Phase 3 outcome |
|---|---|---|
| CV Ingestion | BUILT | Verified end-to-end, error recovery added |
| Screening | BUILT | Bias guardrail node added in Phase 2 |
| Interview Intelligence | PARTIAL → BUILT | Transcript + RAG nodes wired in Phase 2 |
| Bias Guardrail | MISSING → BUILT | Promoted to standalone service used by screening + shortlist |
| Sourcing / Scraping | MISSING → BUILT | Minimal LangGraph with mock source |
| Outreach / Scheduler | MISSING → BUILT | Compose + mock-send + track |

This phase also introduces the async job-runs pattern as the standard
mechanism for any long-running operation.

## Preconditions

- Phase 2 acceptance has passed.
- `agent_runs` table exists (added in Phase 2).
- Qdrant `hr_knowledge`, `tech_knowledge`, `candidates`, `jobs` collections
  exist.

---

## Backend deliverables

### Bias Guardrail Service

`backend/app/services/bias_guardrail.py`

```python
@dataclass
class BiasResult:
    overall_compliant: bool
    worst_dir: float
    by_attribute: list[AttributeReport]

async def evaluate_selection(
    *, candidates: list[Candidate], selected_ids: set[UUID],
    rubric: FairnessRubric
) -> BiasResult:
    """
    Computes selection rate per group per protected attribute.
    Disparate Impact Ratio = group_rate / max_group_rate.
    Compliant when DIR >= rubric.disparate_impact_threshold (default 0.8).
    """
```

Used from two call sites:
1. Screening graph's `bias_guardrail_node` (after `rank_and_persist`).
2. A new `POST /jobs/{id}/shortlist/preview` endpoint that returns the bias
   result for a proposed shortlist before the recruiter confirms.

### Outreach Agent

`backend/app/agents/outreach/graph.py`

Nodes:
1. `load_context` — fetch candidate, job, org branding (sender name/color).
2. `compose_email` — LLM call via OpenRouter using a Jinja2 template, with
   variables `{candidate_name}`, `{job_title}`, `{company_name}`,
   `{recruiter_name}`. Template stored in `outreach_templates` table.
3. `send_email` — calls a provider. For demo: `MockEmailProvider` that writes
   to `outreach_sequences.status="sent_mock"` and logs to console. For prod:
   `SendGridProvider` behind the same interface.
4. `track_send` — write `outreach_sequences` row, emit `analytics_events`.

Tables:
```python
class OutreachTemplate(Base):
    id, org_id, name, subject, body_template, variables (JSONB)

class OutreachSequence(Base):
    id, candidate_id, job_id, template_id
    status  # queued | sent | opened | clicked | replied | bounced
    sent_at, opened_at, replied_at, bounce_reason
```

Endpoints:
- `POST /api/v1/candidates/{id}/outreach` body `{template_id, job_id}` → `{run_id}`
- `GET /api/v1/outreach-sequences?job_id=&status=&page=` → list
- `GET /api/v1/outreach-templates` / `POST` / `PUT` / `DELETE`
- `POST /api/v1/outreach-webhook` — receives `opened`, `clicked`, `replied`,
  `bounced` events from the email provider (and the mock provider in tests).

### Sourcing Agent (minimal, LangGraph)

`backend/app/agents/sourcing/graph.py`

Nodes:
1. `search_query` — turn job description + skills into a structured query.
2. `filter` — apply per-job pool config (location, min/max experience).
3. `deduplicate` — drop candidates already in `candidates` table for this org.
4. `enrich` — pull contact details. For demo: pull from a fixture JSON; for
   prod: Hunter.io MCP integration (out of scope for graduation demo, but the
   node interface is shaped to allow swap).
5. `persist` — write to `candidates` + `candidate_applications` at stage
   `screen`.

Endpoints (replacing the current mock pool builder):
- `POST /api/v1/jobs/{id}/candidate-pool/preview` → `{estimated_count, sample: [...]}`
- `POST /api/v1/jobs/{id}/candidate-pool/build` → `{run_id}` (BackgroundTasks)
- `GET /api/v1/jobs/{id}/candidate-pool/runs` → list

Configuration: `CANDIDATE_SOURCING_PROVIDER=mock` keeps the fixture provider;
later swap to `linkedin` or `hunterio` without code change downstream.

### Decision Support standalone

Currently the Decision node is inside the Interview Intelligence graph. For
the demo it's acceptable to keep it there. For commercial launch, extract it:

`backend/app/agents/decision_support/graph.py`

Nodes:
1. `gather_signals` — pull all candidate scores, interview evaluations,
   compliance status.
2. `synthesize` — LLM call to produce structured `recommendation` +
   `reasoning_points[]`.
3. `generate_growth_plan` (only on `hire`) — skill gaps + learning resources +
   30/60/90 milestones. Writes to `growth_plans`.
4. `persist_decision` — writes to `decisions`.

Endpoint:
- `POST /api/v1/jobs/{job_id}/decisions/recompute` → `{run_id}`
  Used to re-run the recommendation when new evaluations land.

### `growth_plans` table

```python
class GrowthPlan(Base):
    id, candidate_id, job_id
    skill_gaps (JSONB)        # [{skill, current_level, target_level}]
    learning_resources (JSONB) # [{skill, type, title, url}]
    milestones (JSONB)         # [{day: 30|60|90, goal, success_metric}]
    overall_completion: float = 0.0
    generated_by_run_id
    created_at
```

### Generic `agent_runs` polling

Single source of truth for any async agent job:

```python
class AgentRun(Base):
    id, type            # cv_ingestion | screening | interview_eval | sourcing | outreach | decision_support
    org_id, triggered_by (account_id)
    status              # queued | running | completed | failed
    current_node, started_at, completed_at
    input_ref (JSONB)   # what was queued
    result_ref (JSONB)  # ids of created records
    error               # text, only on failed
```

All long-running endpoints in the project use this table from now on. Replace
ad-hoc status tracking in `cv_ingestion` etc. with this pattern.

---

## Frontend deliverables

Phase 3 is mostly backend-heavy, but two UI surfaces gain functionality here:

### Candidate Pool Builder

Wire up the existing partial page at `src/app/(dashboard)/jobs/[id]/pool/page.tsx`:

- `SourceConfigForm` — skills, location, experience range, education.
- `PreviewButton` → calls `.../candidate-pool/preview`.
- `BuildPoolButton` → calls `.../build`, then polls `agent-runs/{run_id}`.
- `RunHistoryList` — uses `useJobCandidatePoolRuns`.

### Outreach trigger on Candidate Profile

Add a "Send Outreach" entry to the Candidate Action Bar from Phase 1. It opens
a small dialog: pick template, preview, send. Shows the resulting sequence in
the activity timeline.

The full Outreach Center page is in Phase 5.

### Agent run toasts

A global `<AgentRunsListener />` component, mounted in the dashboard layout,
subscribes to all in-flight runs for the current user and surfaces toasts on
completion: "CV ingestion completed for John D. (3.2s)".

Implementation: TanStack Query subscription to `useMyAgentRuns()` with 5-second
polling; compare previous status → emit toast on transition to `completed` or
`failed`.

---

## Data contracts (canonical examples)

### `POST /candidates/{id}/outreach`
```json
// request
{ "template_id": "tpl_intro_v1", "job_id": "..." }

// response
{ "run_id": "...", "sequence_id": "..." }
```

### `GET /jobs/{id}/candidate-pool/runs`
```json
{
  "items": [
    {
      "id": "...",
      "started_at": "2026-05-11T10:14:00Z",
      "completed_at": "2026-05-11T10:14:11Z",
      "status": "completed",
      "estimated_count": 142,
      "persisted_count": 138,
      "duplicates_skipped": 4
    }
  ]
}
```

---

## Acceptance

- [ ] `POST /candidates/{id}/outreach` produces an `OutreachSequence` row with
      status `sent` (mock provider) within 5 seconds.
- [ ] Calling the screening run on a job with a fairness rubric writes
      `bias_reports` and stamps the run with `overall_compliant`.
- [ ] `POST /jobs/{id}/candidate-pool/build` creates an `agent_runs` row that
      transitions queued → running → completed; the pool builder UI polls and
      reflects each transition.
- [ ] Hiring a candidate (from Phase 2's Decision Matrix) creates a
      `growth_plans` row with non-empty `skill_gaps` and `milestones`.
- [ ] The global `AgentRunsListener` shows a toast within 5 seconds of any
      run completing for the current user.

---

## Tasks

| ID | Task |
|---|---|
| PATHS-060 | Service: `bias_guardrail.py` with selection rate + DIR computation |
| PATHS-061 | Wire Screening agent to use the bias service (replace inline logic) |
| PATHS-062 | Agent: Outreach LangGraph (compose → send → track) |
| PATHS-063 | Tables: `outreach_templates`, `outreach_sequences` |
| PATHS-064 | API: outreach endpoints + provider webhook |
| PATHS-065 | Agent: Sourcing LangGraph (search → filter → dedup → enrich → persist) |
| PATHS-066 | Replace mock pool builder with Sourcing graph |
| PATHS-067 | Agent: extract Decision Support to standalone graph |
| PATHS-068 | Tables: `growth_plans` + Decision Support write path |
| PATHS-069 | Generic `agent_runs` pattern across all long-running endpoints |
| PATHS-070 | Frontend: Candidate Pool Builder UI fully wired |
| PATHS-071 | Frontend: Send Outreach dialog on Candidate Profile |
| PATHS-072 | Frontend: global AgentRunsListener with toasts |

---

## Risks & rollback

- **LLM cost.** Outreach compose + decision synthesis are LLM calls. Cap with
  a per-org `monthly_token_budget` checked before each call. Budget enforcement
  lives in `services/llm_budget.py` and is configured per plan in Phase 6.
- **Mock provider drift.** The mock email provider must implement the same
  interface as SendGrid so the swap is one line. Add a contract test that
  exercises both against a fixture.
- **Sourcing duplicates.** Use a stable hash of `(name + normalized_email +
  org_id)` as a dedup key. Index it.
- **Decision Support inside vs outside interview graph.** Until the standalone
  graph ships, the existing inline node continues to work. Cut over carefully
  — both should produce identical output for the same input before the inline
  node is removed.
