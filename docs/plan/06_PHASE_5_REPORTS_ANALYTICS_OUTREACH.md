# Phase 5 — Reports, Analytics & Outreach Center

## Goal

Give org users credibility-grade reporting and a single place to run outreach
at scale. After this phase a hiring manager can answer "how is recruiting
going?" in one screen, and a recruiter can manage outreach across all jobs
from one inbox.

This phase also finishes the Knowledge Base RAG test panel so HR docs uploaded
there become the source for interview question suggestions.

## Preconditions

- Phase 4 acceptance has passed.
- `outreach_sequences`, `outreach_templates`, `decisions`, `bias_reports`,
  `agent_runs` are all populated by normal product usage.

---

## Backend deliverables

### `analytics_events` (append-only event log)

```python
class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"
    id, org_id, event_type, payload (JSONB), created_at
    # event_type examples:
    # job.posted, candidate.applied, screening.completed,
    # interview.scheduled, interview.completed, decision.hire,
    # outreach.sent, outreach.opened, outreach.replied
```

Every state-changing operation writes one row. Implemented as a tiny helper:

```python
async def emit(db, *, org_id, event_type, payload): ...
```

Indexed on `(org_id, event_type, created_at)`.

### Aggregation views

SQL materialized views, refreshed nightly + on-demand:

- `mv_hiring_funnel` — counts per stage per org per day.
- `mv_time_to_hire` — `decision.hire - job.posted` per job.
- `mv_source_quality` — per source: candidates, shortlisted, hired,
  quality-of-hire score (hire_rate × avg_decision_score).
- `mv_bias_summary` — rolling 30-day worst DIR per org per attribute.

A simple `services/analytics.py` reads from these views.

### Endpoints

- `GET /api/v1/analytics/summary?from=&to=&job_id=` →
  ```
  {
    metrics: {
      time_to_hire_days: 18.4, cost_per_hire: null, // pluggable
      offer_acceptance_rate: 0.83, quality_of_hire: 7.6
    },
    funnel: [{ stage, count, conversion_from_prev }],
    over_time: [{ date, hires, applications }],
    source_quality: [{ source, candidates, shortlisted, hired, quality_score }]
  }
  ```
- `GET /api/v1/analytics/bias-summary?from=&to=&job_id=` → rolling bias
  reports + the worst DIR breakdown.
- `GET /api/v1/analytics/export.csv?metric=&from=&to=` → CSV stream.
- `GET /api/v1/analytics/export.pdf?metric=&from=&to=` → PDF rendered server-side
  via a tiny ReportLab template; sufficient for board-level handoff.

### Outreach Center API surface

Mostly already built in Phase 3. New endpoints for the Center UI:

- `GET /api/v1/outreach-sequences?job_id=&status=&page=` — full list.
- `POST /api/v1/outreach-sequences/bulk` body `{candidate_ids[], template_id, job_id}` → `{run_id}`.
- `GET /api/v1/outreach-templates`
- `POST /api/v1/outreach-templates` body `{name, subject, body, variables}`
- `PUT /api/v1/outreach-templates/{id}`
- `DELETE /api/v1/outreach-templates/{id}`
- `GET /api/v1/outreach-stats?template_id=` → `{sent, opened, clicked, replied}`.

### Knowledge Base RAG test panel API

Already exists at `POST /knowledge-base/test-query`. Confirm response shape:
```
{
  "chunks": [
    { "doc_title": "...", "chunk_id": "...", "text": "...", "score": 0.78 }
  ],
  "answer": "AI-synthesized answer from top chunks"
}
```

---

## Frontend deliverables

### Routes

```
src/app/(dashboard)/
├── reports/page.tsx               ← NEW
├── outreach/page.tsx              ← NEW (Outreach Center)
└── knowledge-base/page.tsx        ← extend with RAG test panel
```

### Components

Under `src/components/features/reports/`:

- `DateRangePicker` (presets: 7d/30d/90d + custom).
- `MetricsGrid` — 4 cards: time-to-hire, offer acceptance rate, quality-of-hire,
  total hires.
- `TimeToHireChart` (Recharts `LineChart`).
- `FunnelConversionTable` — 9 stages with conversion % between each.
- `SourceQualityTable` (TanStack Table).
- `BiasEquityReport` — per-attribute panel, expandable per group.
- `ExportButtons` — CSV / PDF.

Under `src/components/features/outreach/`:

- `OutreachSequenceTable` — candidate, job, template, status, sent_at,
  reply_at, actions.
- `ComposeOutreachDialog` — template picker → variable preview → recipient
  picker → send.
- `EmailTemplateEditor` — Tiptap rich text with `{{candidate_name}}` chips
  showing variable insertion.
- `TemplatePerformanceCard` — open rate, reply rate per template.
- `BulkOutreachBar` — visible when rows selected on Candidates Table; lets
  recruiters fire one sequence at many candidates.

Under `src/components/features/knowledge-base/`:

- `DocumentUploadZone`
- `IngestionStatusTable` (status: uploading → chunking → embedding → ready)
- `RAGTestPanel` — collection selector + query box; on submit, shows
  top-K chunks with similarity scores and the synthesized answer.

### Hooks

```ts
useAnalyticsSummary({from, to, jobId?})
useBiasSummary({from, to, jobId?})
useExportAnalytics(metric, from, to, fmt)
useOutreachSequences(filters)
useOutreachTemplates()
useCreateOutreachTemplate()         // mutation
useSendBulkOutreach()               // mutation
useKbDocuments()
useUploadKbDocument()               // mutation
useKbTestQuery()                    // mutation, returns chunks + answer
```

---

## Data contracts (canonical examples)

### `GET /analytics/summary` (truncated)
```json
{
  "metrics": {
    "time_to_hire_days": 18.4,
    "offer_acceptance_rate": 0.83,
    "quality_of_hire": 7.6,
    "hires_in_range": 12
  },
  "funnel": [
    { "stage": "screen", "count": 480, "conversion_from_prev": null },
    { "stage": "shortlist", "count": 120, "conversion_from_prev": 0.25 },
    { "stage": "interview", "count": 40, "conversion_from_prev": 0.33 },
    { "stage": "decide", "count": 12, "conversion_from_prev": 0.30 }
  ],
  "over_time": [{"date": "2026-05-01", "hires": 1, "applications": 12}]
}
```

### `POST /knowledge-base/test-query`
```json
// request
{ "question": "What benefits do we mention in offer letters?", "collection": "hr_policies" }

// response
{
  "answer": "Standard benefits include 25 days PTO, private medical, …",
  "chunks": [
    { "doc_title": "Benefits Policy v3", "chunk_id": "...", "text": "…", "score": 0.82 }
  ]
}
```

---

## Acceptance

- [ ] `/reports` renders within 2 seconds for a date range of 90 days and an
      org with 500+ applications.
- [ ] Time-to-hire chart updates within 5 minutes of a new `decision.hire`
      event (materialized view refresh on event commit).
- [ ] Bias Equity Report shows at least one protected attribute with both
      compliant and non-compliant groups in a seeded demo dataset.
- [ ] `/outreach` lists every sequence with paginated rows; selecting 10
      candidates and clicking "Send" triggers a single `agent_runs` row that
      fans out one sequence per candidate.
- [ ] `/knowledge-base` RAG test panel returns top-K chunks within 1 second
      for an uploaded HR document.
- [ ] CSV and PDF exports both download successfully.

---

## Tasks

| ID | Task |
|---|---|
| PATHS-100 | `analytics_events` table + `emit()` helper |
| PATHS-101 | Instrument state-changing endpoints to emit events |
| PATHS-102 | Materialized views: funnel, time-to-hire, source quality, bias summary |
| PATHS-103 | API: `/analytics/summary` + `/analytics/bias-summary` |
| PATHS-104 | API: CSV + PDF export |
| PATHS-105 | API: Outreach Center list + bulk + templates |
| PATHS-106 | Frontend: `/reports` page with all charts and exports |
| PATHS-107 | Frontend: `/outreach` Center with templates + bulk dialog |
| PATHS-108 | Frontend: `/knowledge-base` extended with upload + RAG test |
| PATHS-109 | Hooks + adapters for all of the above |
| PATHS-110 | Add 4-state coverage to every new page |

---

## Risks & rollback

- **Materialized views vs live queries.** For an org with <10k events, live
  queries are fine. Materialized views are documented above but only build them
  once `/reports` p95 exceeds 2s on real data.
- **PDF export.** ReportLab is enough for a clean tabular PDF. Don't try to
  reproduce the full UI in PDF — render a stripped-down "executive summary"
  layout.
- **Bulk outreach safety.** Bulk send must require a confirmation dialog with
  the candidate count. Block sends >50 without an explicit override toggle.
