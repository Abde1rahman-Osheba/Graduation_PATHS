# Phase 2 — Interviews, Decisions & Screening Bias Panel

## Goal

Complete the second half of the demo flow: schedule interviews, run a session
with live transcript + RAG suggestions + evaluation form, capture results in
the Interview Intelligence agent, and let the recruiter finalize a hire via
the Decision Matrix. Also surface the bias report from the Screening agent.

After this phase the spec's 9-step pipeline (Define → Source → Screen →
Shortlist → Reveal → Outreach → Interview → Evaluate → Decide) is fully
visible end-to-end inside the product.

## Preconditions

- Phase 1 acceptance has passed.
- `screening/graph.py` and `interview_intelligence/graph.py` exist and run
  (they do — verify by triggering them via the existing endpoints).

---

## Backend deliverables

### Models & migrations

1. **`interview_invites`**
   ```python
   class InterviewInvite(Base):
       __tablename__ = "interview_invites"
       id = Column(UUID, primary_key=True, default=uuid4)
       candidate_id = Column(UUID, ForeignKey("candidates.id"))
       job_id = Column(UUID, ForeignKey("jobs.id"))
       interviewer_id = Column(UUID, ForeignKey("accounts.id"))
       proposed_slots = Column(JSONB)  # [{start, end}, ...]
       selected_slot = Column(JSONB, nullable=True)
       status = Column(String)  # pending | accepted | declined | rescheduled | cancelled
       calendar_event_id = Column(String, nullable=True)
       created_at = Column(DateTime, default=func.now())
   ```
2. **`interview_sessions`** (may already exist — verify columns)
   ```python
   class InterviewSession(Base):
       id, invite_id, candidate_id, job_id, interviewer_id
       started_at, ended_at, status  # scheduled | in_progress | completed | cancelled
       evaluation_run_id  # FK to agent_runs once the eval graph fires
   ```
3. **`transcripts`** — utterances are append-only.
   ```python
   class TranscriptUtterance(Base):
       id, session_id, speaker, text, ts, source  # human | rag_suggestion
       embedding_vector_id  # Qdrant point id, nullable
   ```
4. **`decisions`**
   ```python
   class Decision(Base):
       id, job_id, candidate_id, decided_by (account_id)
       recommendation  # hire | reject | hold
       reasoning, scores (JSONB), bias_status  # passed | warning | failed
       created_at
   ```
5. **`bias_reports`**
   ```python
   class BiasReport(Base):
       id, screening_run_id, attribute, group_value
       selection_rate, baseline_rate, disparate_impact_ratio
       compliant  # bool, true if DIR >= rubric.threshold
       created_at
   ```

Migration command:
```bash
alembic revision --autogenerate -m "phase2_interviews_decisions_bias"
alembic upgrade head
```

### API endpoints

#### Interview scheduling
6. `GET /api/v1/jobs/{job_id}/interviews` → list.
7. `POST /api/v1/interview-invites` body `{candidate_id, job_id, interviewer_id, slots[]}` → 201.
8. `PUT /api/v1/interview-invites/{id}/respond` body `{decision: "accept"|"decline"|"reschedule", slot?}` (candidate-facing).
9. `POST /api/v1/interview-invites/{id}/cancel` (org-facing).

#### Interview session
10. `GET /api/v1/interview-sessions/{id}` → full session detail + transcript.
11. `POST /api/v1/interview-sessions/{id}/transcript` body `{utterances: [{speaker, text, ts}]}` → 201.
    Append-only. Embed text in Qdrant `transcripts` collection.
12. `POST /api/v1/interview-sessions/{id}/rag-suggestions` body `{topic: "hr"|"technical", context_window?: string}` → returns 3–5 suggested questions from RAG.
13. `POST /api/v1/interview-sessions/{id}/evaluate` body `{scores: {criterion: 1..10}, comments, notes}` → triggers the 5-node Interview Intelligence graph asynchronously (FastAPI BackgroundTasks). Returns `{run_id}`.
14. `GET /api/v1/agent-runs/{run_id}` → `{status, current_node, started_at, completed_at, result?}` — polled by the frontend.

#### Decision
15. `GET /api/v1/jobs/{job_id}/decision-matrix` → comparison table.
    ```
    {
      candidates: [
        {
          candidate_id, name, overall_score,
          per_criterion: { "skills": 8.2, "culture_fit": 7.5, ... },
          bias_status, recommendation_hint
        }
      ],
      ai_recommendation: { candidate_id, reasoning: ["...", "..."] },
      bias_summary: { compliant: true, worst_dir: 0.83 }
    }
    ```
16. `POST /api/v1/jobs/{job_id}/decision` body `{candidate_id, recommendation: "hire"|"reject"|"hold", reason}` → creates `Decision`. If `hire`: enqueue Growth Plan generation (Phase 3) and dispatch rejection notifications to others (Phase 4).

#### Screening bias
17. `GET /api/v1/screening-runs/{run_id}/bias-report` → list of `BiasReport` rows for that run, with `overall_compliant` summary.

### Agent / service changes

- **Extend `screening/graph.py`** with a `bias_guardrail_node` placed after
  `rank_and_persist`. It reads the job's `fairness_rubric`, computes selection
  rates per protected attribute, writes `BiasReport` rows, and stamps the run
  with `overall_compliant`.
- **Extend `interview_intelligence/graph.py`** — confirm the 5 nodes
  (summarize, hr_eval, tech_eval, compliance, decision_support) execute and
  write to `decisions` table. If decision_support currently inlines outputs,
  refactor it to write a single `Decision` row.
- **RAG retrieval helpers** in `backend/app/services/rag.py`:
  - `retrieve_hr_chunks(query, k=5)` → top-K from Qdrant `hr_knowledge`.
  - `retrieve_tech_chunks(query, job_skills, k=5)` → filter by skills in metadata.
- **`backend/app/services/agent_runs.py`** — generic helper that wraps an
  agent invocation in BackgroundTasks and writes status to a new `agent_runs`
  table (`id, type, status, started_at, completed_at, result_ref, error`).

---

## Frontend deliverables

### Routes

```
src/app/(dashboard)/jobs/[id]/
├── interviews/
│   ├── page.tsx                ← list + Schedule button
│   └── [sid]/page.tsx          ← Interview Session (org-facing)
├── decision/page.tsx           ← Decision Matrix
└── screening/page.tsx          ← extend with bias panel
```

The candidate-facing Interview Session page lives under
`src/app/(candidate)/candidate/interviews/[sid]/page.tsx` (built in Phase 4 —
the org page comes first because it drives the agent).

### Components

Under `src/components/features/interviews/`:

- `InterviewList.tsx` — TanStack Table with columns: candidate, role,
  interviewer, slot, status.
- `ScheduleInterviewDialog.tsx` — uses `react-day-picker` for slot selection,
  multiple slots, optional `interviewer_id`.
- `InterviewSessionHeader.tsx`
- `TranscriptPanel.tsx` — virtualized list (`@tanstack/react-virtual`) of
  utterances; auto-scroll to latest.
- `RAGSuggestionPanel.tsx` — collapsible; two tabs (HR / Technical); each
  triggers `POST .../rag-suggestions` and shows results.
- `EvaluationSidebar.tsx` — React Hook Form + Zod with per-criterion sliders
  1–10 and comments. Submit triggers `POST .../evaluate` and starts polling
  `GET /agent-runs/{run_id}`.
- `AgentProgressIndicator.tsx` — shows the 5 nodes light up in sequence.

Under `src/components/features/decision/`:

- `DecisionMatrixTable.tsx` — TanStack Table with sticky first column
  (candidate name) and one column per criterion. Color cells by score band.
- `AIRecommendationCard.tsx` — top recommended candidate with bullet
  reasoning.
- `ComplianceBanner.tsx` — green / amber / red banner showing bias status.
- `HireDecisionDialog.tsx` — confirms "this will trigger Growth Plan
  generation and rejection notifications".
- `DecisionAuditLog.tsx` — chronological list of decisions.

Under `src/components/features/screening/`:

- `BiasReportPanel.tsx` — per-attribute table: group, selection rate, DIR,
  compliant ✓/✗. Threshold line at the rubric's `disparate_impact_threshold`.

### Hooks & API client

Add to `src/lib/api/index.ts`:
```ts
listJobInterviews(jobId)
createInterviewInvite({...})
cancelInterviewInvite(id)
getInterviewSession(sid)
appendTranscript(sid, utterances)
getRagSuggestions(sid, topic, context?)
submitEvaluation(sid, scores)
getAgentRun(runId)
getDecisionMatrix(jobId)
postDecision(jobId, body)
getScreeningBiasReport(runId)
```

Hooks in `src/lib/hooks/index.ts`:
```ts
useJobInterviews(jobId)
useCreateInterviewInvite()         // mutation
useInterviewSession(sid)
useAppendTranscript()              // mutation
useRagSuggestions(sid, topic)      // lazy-fetched on tab open
useSubmitEvaluation()              // mutation, returns run_id
useAgentRun(runId, opts)           // refetch every 2s while status !== done
useDecisionMatrix(jobId)
usePostDecision()                  // mutation, invalidates matrix + job stats
useScreeningBiasReport(runId)
```

### Polling pattern

```ts
const { data: run } = useAgentRun(runId, {
  refetchInterval: (q) =>
    ["queued", "running"].includes(q?.state.data?.status) ? 2000 : false,
});
```

---

## Data contracts (canonical examples)

### `GET /jobs/{job_id}/decision-matrix`
```json
{
  "candidates": [
    {
      "candidate_id": "...", "name": "Layla Hassan", "overall_score": 8.7,
      "per_criterion": {
        "technical_skills": 9.1, "communication": 8.4,
        "experience_fit": 8.2, "culture_fit": 9.0
      },
      "bias_status": "passed",
      "recommendation_hint": "strong_match"
    }
  ],
  "ai_recommendation": {
    "candidate_id": "...",
    "reasoning": [
      "Highest technical score with no compliance warnings",
      "Past role at similar-stage company",
      "Communication score above org's hired-cohort median"
    ]
  },
  "bias_summary": { "compliant": true, "worst_dir": 0.86 }
}
```

### `GET /screening-runs/{id}/bias-report`
```json
{
  "run_id": "...",
  "overall_compliant": true,
  "by_attribute": [
    {
      "attribute": "gender",
      "groups": [
        { "group": "female", "selection_rate": 0.31, "dir": 0.92, "compliant": true },
        { "group": "male",   "selection_rate": 0.34, "dir": 1.00, "compliant": true }
      ]
    }
  ]
}
```

---

## Acceptance

A reviewer should be able to:

- [ ] Open `/jobs/{id}/interviews`, click Schedule, pick a candidate, propose
      two time slots, and see the invite appear as `pending`.
- [ ] Open `/jobs/{id}/interviews/{sid}`, paste a few transcript lines into the
      panel (or use a stub button to insert them), see them stored.
- [ ] Click "Suggest HR questions" and see 3–5 questions returned from the RAG
      service (real Qdrant content if any HR doc has been uploaded, otherwise
      seed `hr_knowledge` with a small fixture for the demo).
- [ ] Submit the evaluation form; the 5-node progress indicator advances over
      ~10–30 seconds; final page shows the Decision Support recommendation.
- [ ] Open `/jobs/{id}/decision`, see the comparison matrix, the AI
      recommendation card, the compliance banner. Click Hire on a candidate;
      a Decision row is created and the job stats refresh.
- [ ] Open `/jobs/{id}/screening`, run screening, then see the Bias Report
      Panel rendered with at least one protected attribute's selection rates
      and DIR values.

---

## Tasks

| ID | Task |
|---|---|
| PATHS-030 | Migrations: interview_invites, interview_sessions, transcripts, decisions, bias_reports, agent_runs |
| PATHS-031 | API: list/create/cancel/respond interview invites |
| PATHS-032 | API: GET interview session detail + transcripts |
| PATHS-033 | API: POST transcript append + Qdrant embed |
| PATHS-034 | API: POST rag-suggestions (HR + Technical) |
| PATHS-035 | API: POST evaluate → BackgroundTasks run of interview_intelligence |
| PATHS-036 | API: GET agent-runs/{id} polling endpoint |
| PATHS-037 | API: GET decision-matrix + POST decision |
| PATHS-038 | API: GET screening-runs/{id}/bias-report |
| PATHS-039 | Agent: add bias_guardrail_node to screening graph |
| PATHS-040 | Agent: confirm interview_intelligence writes to decisions table |
| PATHS-041 | Service: `services/rag.py` with HR + Technical retrievers |
| PATHS-042 | Service: `services/agent_runs.py` BackgroundTasks wrapper |
| PATHS-043 | Frontend: Interview list + Schedule dialog |
| PATHS-044 | Frontend: Interview Session page (org-facing) with transcript + RAG |
| PATHS-045 | Frontend: Evaluation form + AgentProgressIndicator |
| PATHS-046 | Frontend: Decision Matrix table + AI recommendation card |
| PATHS-047 | Frontend: Hire confirmation dialog + audit log |
| PATHS-048 | Frontend: Bias Report Panel on screening page |
| PATHS-049 | Frontend: hooks + adapters for everything above |
| PATHS-050 | Add 4-state coverage to every new page |

---

## Risks & rollback

- **RAG returns empty.** If no HR or technical docs are uploaded, the suggestion
  panel must show a clear empty state ("No HR knowledge uploaded yet — add docs
  via Knowledge Base") rather than throw. Phase 5 will build the upload UI; for
  Phase 2, ship a small fixture set of HR/tech chunks in `backend/seed/`.
- **BackgroundTasks blocks worker.** FastAPI BackgroundTasks run in the worker
  process. For the demo this is fine. If response latency degrades, set
  `--workers 4` on uvicorn and document the limit in `09_PHASE_8_LAUNCH_HARDENING.md`.
- **Transcript embedding cost.** Embedding every utterance is expensive. Batch
  utterances and embed on a debounce or on session-end; do not embed each line
  synchronously.
- **Decision write-amplification.** A Hire decision should fan out to (a) Growth
  Plan job, (b) rejection notifications for other candidates, (c) job status →
  Filled. Use a transactional outbox if any of these can fail independently.
