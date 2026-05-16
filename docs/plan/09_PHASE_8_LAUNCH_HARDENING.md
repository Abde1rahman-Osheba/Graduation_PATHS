# Phase 8 — Launch Hardening

## Goal

Make PATHS safe to publish to the world. This phase is not about features —
it's about security, GDPR, observability, performance, CI/CD, and the kind of
documentation you need so a second engineer can run the system tomorrow.

## Preconditions

- Phases 0–7 are merged to `main` and acceptance has passed.
- A production-grade Postgres + Qdrant + Stripe (live mode) are provisioned.

---

## Security

### Authentication & authorization

- [ ] JWTs are signed with the rotated `SECRET_KEY` and have ≤ 24h TTL.
- [ ] Refresh tokens are rotated on use (rolling refresh).
- [ ] Password hashing is `argon2id` (not bcrypt with default cost).
- [ ] Rate-limit `/auth/login`, `/auth/forgot-password`, `/auth/reset-password`
      to 5 / 10 minutes / IP.
- [ ] Brute-force lockout after 10 failed attempts/account; unlock via email.
- [ ] All API routes use `Depends(get_current_user)` + role guards; add a
      route-coverage test that fails if any router file is missing the
      dependency.
- [ ] Impersonation JWTs are read-only and audited (Phase 7).

### Secrets

- [ ] `.env` files are not in git (verify `git ls-files | grep -E '\.env'`
      returns no production values).
- [ ] `backend/secrets/` is empty and gitignored.
- [ ] Stripe keys, OpenRouter key, SECRET_KEY, DATABASE_URL are pulled from a
      real secrets manager in prod (e.g. Doppler, AWS Secrets Manager).
- [ ] CI prints zero secret values; pre-commit hook (`gitleaks`) blocks
      pushes that contain key patterns.

### Tenant isolation tests

- [ ] Add an integration test suite `tests/security/test_tenant_isolation.py`
      that, for every router, creates two orgs and asserts that org B cannot
      read or mutate any org A resource. This catches the single most common
      future regression.

### Input validation

- [ ] All request bodies are typed via Pydantic; reject unknown fields
      (`model_config = ConfigDict(extra="forbid")`).
- [ ] CV upload: MIME-sniff (not just extension); cap at 10 MB; reject
      anything that contains macros.
- [ ] All user-rendered HTML (job descriptions, outreach email previews)
      goes through DOMPurify on the client and bleach on the server.

### Transport

- [ ] HTTPS only in prod; HSTS header with 6-month max-age.
- [ ] Strict CSP (no inline scripts in the dashboard; allow inline only on
      the marketing site if needed).
- [ ] CORS allowlist limited to the production frontend origin.

---

## GDPR & data protection

- [ ] `/candidate/settings` data export returns a JSON archive of every row
      tied to the candidate's account (Phase 4).
- [ ] Account deletion soft-deletes immediately, hard-deletes after 30 days,
      and is queued via a daily cron job (not on-request).
- [ ] All Qdrant points and AGE graph nodes for a deleted candidate are
      removed in the same hard-delete pass.
- [ ] Data retention policy documented in `/owner/config`: CVs 24 months,
      transcripts 18 months, decisions 7 years (legal hold).
- [ ] Cookie consent banner on public pages (analytics + marketing
      cookies behind opt-in).
- [ ] Privacy policy + Terms of service pages exist at `/legal/privacy` and
      `/legal/terms`.

---

## Observability

### Logging

- Structured JSON logs from the backend (`structlog`), correlation id per
  request, log level `INFO` in prod, `DEBUG` in dev.
- Every agent run logs `{run_id, type, org_id, status, node, duration_ms}` at
  start and end of each node.

### Metrics

- Prometheus endpoint `/metrics` on the backend exposing:
  - `http_requests_total{route, method, status}`
  - `agent_run_duration_seconds_bucket{type, status}`
  - `llm_tokens_total{model, org_id}`
  - `db_query_duration_seconds_bucket`
- Grafana dashboards for: request latency p50/p95/p99, agent success rate,
  LLM token spend per org, error rate.

### Tracing

- OpenTelemetry tracing on FastAPI; export to Jaeger or Honeycomb.
- Trace a CV upload end-to-end through all 8 ingestion nodes — useful when
  triaging slowness.

### Error monitoring

- Sentry (or equivalent) on both frontend and backend. Source maps uploaded
  from the Next.js build; release tags tied to git SHA.

### Uptime

- External uptime checks against `/api/v1/health`, `/_health`, `/pricing`.
- Status page (statuspage.io or a simple Next.js page on a subdomain).

---

## Performance budgets

| Surface | Budget |
|---|---|
| Marketing pages LCP | < 2.0s |
| Org dashboard TTI | < 3.0s |
| Pipeline board with 200 cards FCP | < 1.5s |
| Backend p95 (cached) | < 200ms |
| Backend p95 (agent trigger) | < 500ms (async, returns run_id) |

Enforced by:

- `pnpm build --analyze` in CI fails if main bundle > 250kB gz.
- Lighthouse CI on every PR for marketing pages.
- k6 load test against staging: 1 RPS sustained per endpoint, p95 < 500ms.

---

## CI/CD

`.github/workflows/ci.yml` (or whichever CI is used):

1. **Lint & typecheck**
   - `pnpm lint`, `pnpm typecheck` on frontend.
   - `ruff` + `mypy` on backend.
2. **Unit tests**
   - `pnpm test` (Vitest) on frontend.
   - `pytest` on backend with `--cov` ≥ 60%.
3. **Migrations**
   - `alembic upgrade head` against a disposable Postgres + AGE service.
4. **Integration**
   - Tenant isolation test suite.
   - Smoke test: register org → post job → upload CV → run screening.
5. **Build**
   - `pnpm build` (Next.js) and `docker build` (backend) succeed.
6. **Deploy** (on `main`)
   - Backend to Fly.io / Railway / Render / your platform; frontend to Vercel.
   - Run `alembic upgrade head` against prod before deploy.

Branch protection on `main`: required reviews, passing CI, no direct push.

---

## Documentation

- [ ] `README.md` at repo root: stack, prerequisites, 15-minute setup, link to
      `docs/plan/`.
- [ ] `backend/README.md`: env vars, AGE setup, Alembic workflow, agent
      diagrams (Mermaid).
- [ ] `frontend/README.md`: env vars, scripts, design system notes.
- [ ] `CONTRIBUTING.md`: branching, PR template, code conventions.
- [ ] `docs/architecture.md`: cross-references the original UI Architecture
      doc and the Completion Blueprint plus the agent topology.
- [ ] `docs/runbooks/`:
  - `01_db_migration_safely.md` — how to add a column without downtime.
  - `02_agent_failure_triage.md` — how to diagnose a stuck CV ingestion.
  - `03_billing_incident.md` — what to do when Stripe webhooks are delayed.
  - `04_security_incident.md` — key rotation, breach notification.

---

## Demo readiness (graduation track)

Even if the project ships commercially, the graduation defence still needs a
clean 10-minute demo. Build a `seed/` script that:

- Creates 3 orgs (Pending, Active, Active-Premium).
- Creates 3 jobs per active org with full descriptions + fairness rubrics.
- Imports 50 fake candidates with embeddings.
- Runs screening on one job so the bias report is populated.
- Schedules one interview, attaches a transcript, runs the eval graph.
- Generates one Hire decision → growth plan.

Run with `python -m backend.seed.demo` and the platform is demo-ready in 30s.

---

## Acceptance

- [ ] `gitleaks` runs in CI and finds nothing.
- [ ] Tenant isolation test suite covers every router and is green.
- [ ] Sentry receives a deliberately thrown error from both frontend and
      backend and tags it with the right release.
- [ ] Lighthouse CI on `/pricing` and `/` scores ≥ 90 for Performance,
      Accessibility, Best Practices, SEO.
- [ ] `k6 run scripts/smoke.js` against staging passes with p95 < 500ms.
- [ ] A new engineer follows `README.md` and gets the stack running in
      < 15 minutes on a clean machine.
- [ ] Privacy + Terms pages are live and linked from the footer.
- [ ] Cookie consent banner shows on first visit and is respected on
      subsequent visits.

---

## Tasks

| ID | Task |
|---|---|
| PATHS-170 | Rotate to argon2id password hashing |
| PATHS-171 | Add login + forgot-password rate limits + account lockout |
| PATHS-172 | Pydantic `extra="forbid"` + CV MIME sniff + HTML sanitization |
| PATHS-173 | Strict CSP + HSTS + CORS allowlist in prod |
| PATHS-174 | Tenant isolation integration test suite |
| PATHS-175 | GDPR: data export job + hard-delete daily cron |
| PATHS-176 | Cookie consent banner + Privacy + Terms pages |
| PATHS-177 | Structured logging + Prometheus metrics + OpenTelemetry traces |
| PATHS-178 | Sentry on frontend + backend; release tags from git SHA |
| PATHS-179 | Lighthouse CI on public pages |
| PATHS-180 | k6 smoke test against staging |
| PATHS-181 | CI workflow: lint, typecheck, test, build, deploy |
| PATHS-182 | gitleaks pre-commit + CI gate |
| PATHS-183 | Docs: root README, backend README, frontend README, architecture, runbooks |
| PATHS-184 | Seed script for demo-ready data |
| PATHS-185 | Status page (subdomain) + uptime checks |

---

## Risks & rollback

- **Password hashing migration.** Don't force re-hash all users at once.
  Re-hash on next successful login (verify with old algorithm, upgrade hash
  if needed, persist).
- **CSP rollout.** Strict CSP will break things you forgot about. Roll out
  in report-only mode for 48 hours first, then enforce.
- **GDPR hard-delete.** Test the cron job on a staging org before pointing it
  at production data. Deletion is irreversible.
- **Performance budgets.** If you blow a budget, fix it in the same PR.
  Letting budgets slip turns them into noise.
