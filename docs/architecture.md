# PATHS — Architecture Overview

> This document is the canonical technical reference.  For the original UI
> design brief see `PATHS_Complete_UI_Architecture.docx`; for the
> delivery blueprint see `PATHS_Completion_Blueprint.docx`; for the
> phase-by-phase implementation plan see `docs/plan/`.

---

## System topology

```
┌────────────────────────────────────────────────────────────────────┐
│  Browser / PWA                                                     │
│  Next.js 16 App Router (Vercel)                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │ Marketing    │  │  Auth flow   │  │ Recruiter dashboard      │ │
│  │ /pricing     │  │ /login       │  │ /dashboard/*             │ │
│  │ /legal/*     │  │ /register    │  │ /admin/* /owner/*        │ │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘ │
└────────────────────────┬───────────────────────────────────────────┘
                         │ HTTPS  (X-Correlation-ID header)
                         ▼
┌────────────────────────────────────────────────────────────────────┐
│  FastAPI service  (Fly.io)                                         │
│  ┌──────────┐ ┌───────────┐ ┌──────────────┐ ┌─────────────────┐ │
│  │ Auth     │ │  Jobs /   │ │  Agents      │ │ Admin / Owner   │ │
│  │ /api/v1/ │ │ Candidates│ │  LangGraph   │ │ platform-admin  │ │
│  └──────────┘ └───────────┘ └──────┬───────┘ └─────────────────┘ │
│                                     │                              │
│  Middleware stack:                  │ async task queued in DB      │
│    TrustedHost → CORS →             │                              │
│    SecurityHeaders →                │                              │
│    CorrelationID                    │                              │
└──────────────────┬──────────────────┼──────────────────────────────┘
                   │                  │
         ┌─────────┴──────┐   ┌───────┴──────────────────┐
         │                │   │                          │
         ▼                ▼   ▼                          ▼
  ┌────────────┐  ┌─────────────┐  ┌───────────┐  ┌──────────────┐
  │ PostgreSQL │  │  Apache AGE │  │  Qdrant   │  │  OpenRouter  │
  │ (primary   │  │  graph DB   │  │  vector   │  │  (LLM API)   │
  │  store)    │  │  (cand-job  │  │  search   │  │              │
  └────────────┘  │  relations) │  └───────────┘  └──────────────┘
                  └─────────────┘
```

---

## Database schema (high-level)

### Core entities

| Table | Purpose |
|---|---|
| `users` | All user accounts (recruiter, candidate, platform_admin) |
| `organizations` | Hiring organisations (tenants) |
| `jobs` | Job postings |
| `candidates` | Candidate profiles |
| `applications` | Candidate → Job applications |
| `interviews` | Scheduled interviews + transcripts |
| `agent_runs` | LangGraph task tracking (status, node, duration) |

### Commercial

| Table | Purpose |
|---|---|
| `subscriptions` | Stripe subscription per org |
| `invoices` | Invoice records |
| `plans` | Available billing plans |

### Governance

| Table | Purpose |
|---|---|
| `audit_log` | Immutable append-only event log |
| `impersonation_sessions` | Admin impersonation audit trail |
| `feature_flag_overrides` | Per-org feature flag overrides |
| `platform_settings` | Global key-value settings |

### GDPR

| Table | Purpose |
|---|---|
| Soft-delete column `is_active` on `candidates` | 30-day grace period |
| `candidate_documents` | CV files (hard-deleted with candidate) |

---

## Multi-tenancy model

- Every data row that belongs to an org carries an `organization_id` FK.
- All API dependencies call `get_current_user` → org membership check.
- Tenant isolation is enforced at the ORM layer — queries always filter by
  `organization_id` of the authenticated user.
- The integration test suite (`tests/security/test_tenant_isolation.py`)
  verifies cross-tenant access returns 403/404 for every router.

---

## Agent architecture

Agents are LangGraph `StateGraph` instances defined in
`backend/app/services/`.  Each agent:

1. Creates an `AgentRun` row with `status=queued`.
2. Streams node-level updates (`status=running, node=<name>`).
3. Updates the row to `completed` or `failed` at the end.
4. Emits structured log: `{run_id, type, org_id, status, node, duration_ms}`.

The frontend's `AgentRunsListener` component subscribes to the SSE stream at
`/api/v1/agent-runs/{run_id}/stream` and updates the UI in real time.

### Agent state isolation

Each invocation allocates its own `AgentState` TypedDict; there is no shared
mutable global.  The LangGraph checkpointer is not used in production — state
lives in the DB row + Qdrant.

---

## Security model

| Concern | Implementation |
|---|---|
| Authentication | argon2id password hashing; JWT HS256 (24h TTL) |
| Rate limiting | In-process sliding-window (per-IP + per-account lockout) |
| Tenant isolation | ORM-level `organization_id` filter everywhere |
| Impersonation | 15-min read-only JWT; `ImpersonationSession` audit row |
| CSP | Strict in production (no inline scripts); relaxed in dev |
| HSTS | 6-month `max-age` in production |
| Secret scanning | gitleaks pre-commit + CI gate |
| GDPR | Soft-delete → 30-day cron hard-delete (Qdrant + AGE + DB) |

---

## Observability

| Signal | Tool | Where |
|---|---|---|
| Errors | Sentry | Frontend + Backend |
| Metrics | Prometheus `/metrics` | Backend |
| Traces | OpenTelemetry → OTLP | Backend (optional) |
| Logs | Structured JSON (production) / human-readable (dev) | Backend stdout |
| Correlation | `X-Correlation-ID` header | Propagated across all hops |
| Uptime | External checks on `/api/v1/health` | TBD (PATHS-185) |

---

## Deployment

| Service | Platform | Branch |
|---|---|---|
| Backend | Fly.io | `main` (auto-deploy via CI) |
| Frontend | Vercel | `main` (auto-deploy via CI) |
| PostgreSQL + AGE | Fly.io Postgres / Supabase | — |
| Qdrant | Qdrant Cloud | — |
| Stripe | Stripe Live | — |

CI pipeline: `.github/workflows/ci.yml`
- Secrets scan → Backend lint → Backend tests → Frontend lint → Frontend build
  → Lighthouse CI (PRs only) → Deploy staging (main only)

---

## Key design decisions

1. **No Redis** — rate limiter is in-process with `threading.Lock()`.  Scales
   to a single-instance deploy; upgrade to Redis-based limiter for multi-worker.

2. **No message queue** — agents run inline in the HTTP handler, returning a
   `run_id` immediately and completing asynchronously in a background task.
   For high-concurrency production, migrate to Celery/ARQ.

3. **Hybrid scoring** — candidate–job matching uses 65% LLM score + 35% vector
   cosine similarity, configurable via `SCORING_AGENT_WEIGHT` /
   `SCORING_VECTOR_WEIGHT`.

4. **Apache AGE for relationships** — graph traversals (e.g. "find candidates
   who worked at a company that hired from Org X") are impossible in relational
   SQL without many JOINs.  AGE lets us express these as Cypher queries while
   keeping the rest of the schema in PostgreSQL.

5. **Single Alembic migration chain** — all schema changes go through
   `alembic/versions/` in sequence.  Never edit a migration that has been
   applied to production.
