# Task Index — every PATHS-### task in one place

> Flat checklist for tracking work across phases. Tick a task only when its
> phase's acceptance test passes. Commit messages reference these IDs.

---

## Phase 0 — Foundations

- [ ] **PATHS-001** Rotate and remove committed Google service-account key
- [ ] **PATHS-002** Delete legacy `frontend/src/` directory
- [ ] **PATHS-003** Set real `SECRET_KEY` in `backend/.env`; raise on default in production
- [ ] **PATHS-004** Document Apache AGE setup in `backend/README.md`
- [ ] **PATHS-005** Resolve Alembic multi-head and run `upgrade head`
- [ ] **PATHS-006** Create `frontend/apps/web/.env.local` and `.env.local.example`
- [ ] **PATHS-007** Remove `HAS_BACKEND` flag from `lib/hooks/index.ts`
- [ ] **PATHS-008** Add `/_health` page that pings backend health endpoint
- [ ] **PATHS-009** Verify `/dashboard` renders live data end-to-end

## Phase 1 — Job Detail Hub & Pipeline Board

- [ ] **PATHS-010** Create `fairness_rubric` model + Alembic migration
- [ ] **PATHS-011** Add `pipeline_stage` enum + column to candidate_applications
- [ ] **PATHS-012** Build `GET /jobs/{id}` endpoint with stats + rubric
- [ ] **PATHS-013** Build `GET /jobs/{id}/pipeline-stages` endpoint
- [ ] **PATHS-014** Build `GET /jobs/{id}/candidates` with filtering & pagination
- [ ] **PATHS-015** Build `PUT /candidate-applications/{id}/stage` with tenant check
- [ ] **PATHS-016** Build `PUT /jobs/{id}/fairness-rubric`
- [ ] **PATHS-017** Build `GET /candidates/{id}` returning CV + scores + activity
- [ ] **PATHS-018** Frontend: Job Detail Hub shell (`/jobs/[id]/page.tsx` + TabBar)
- [ ] **PATHS-019** Frontend: Overview tab content + stats strip
- [ ] **PATHS-020** Frontend: Pipeline Board read-only (9 columns + cards)
- [ ] **PATHS-021** Frontend: Pipeline drag-and-drop with optimistic updates
- [ ] **PATHS-022** Frontend: Candidate Profile page (header + CV viewer)
- [ ] **PATHS-023** Frontend: Skills radar + score breakdown + timeline
- [ ] **PATHS-024** Frontend: Candidate action bar (Shortlist/Reject/etc.)
- [ ] **PATHS-025** Frontend: Create Job Wizard Step 3 — Fairness Rubric
- [ ] **PATHS-026** Frontend: API client + adapters + hooks for all of the above
- [ ] **PATHS-027** Add empty/error states to every page in this phase

## Phase 2 — Interviews & Decisions

- [ ] **PATHS-030** Migrations: interview_invites, interview_sessions, transcripts, decisions, bias_reports, agent_runs
- [ ] **PATHS-031** API: list/create/cancel/respond interview invites
- [ ] **PATHS-032** API: GET interview session detail + transcripts
- [ ] **PATHS-033** API: POST transcript append + Qdrant embed
- [ ] **PATHS-034** API: POST rag-suggestions (HR + Technical)
- [ ] **PATHS-035** API: POST evaluate → BackgroundTasks run of interview_intelligence
- [ ] **PATHS-036** API: GET agent-runs/{id} polling endpoint
- [ ] **PATHS-037** API: GET decision-matrix + POST decision
- [ ] **PATHS-038** API: GET screening-runs/{id}/bias-report
- [ ] **PATHS-039** Agent: add bias_guardrail_node to screening graph
- [ ] **PATHS-040** Agent: confirm interview_intelligence writes to decisions table
- [ ] **PATHS-041** Service: `services/rag.py` with HR + Technical retrievers
- [ ] **PATHS-042** Service: `services/agent_runs.py` BackgroundTasks wrapper
- [ ] **PATHS-043** Frontend: Interview list + Schedule dialog
- [ ] **PATHS-044** Frontend: Interview Session page (org-facing) with transcript + RAG
- [ ] **PATHS-045** Frontend: Evaluation form + AgentProgressIndicator
- [ ] **PATHS-046** Frontend: Decision Matrix table + AI recommendation card
- [ ] **PATHS-047** Frontend: Hire confirmation dialog + audit log
- [ ] **PATHS-048** Frontend: Bias Report Panel on screening page
- [ ] **PATHS-049** Frontend: hooks + adapters for everything above
- [ ] **PATHS-050** Add 4-state coverage to every new page

## Phase 3 — Agent Completion

- [ ] **PATHS-060** Service: `bias_guardrail.py` with selection rate + DIR computation
- [ ] **PATHS-061** Wire Screening agent to use the bias service (replace inline logic)
- [ ] **PATHS-062** Agent: Outreach LangGraph (compose → send → track)
- [ ] **PATHS-063** Tables: `outreach_templates`, `outreach_sequences`
- [ ] **PATHS-064** API: outreach endpoints + provider webhook
- [ ] **PATHS-065** Agent: Sourcing LangGraph (search → filter → dedup → enrich → persist)
- [ ] **PATHS-066** Replace mock pool builder with Sourcing graph
- [ ] **PATHS-067** Agent: extract Decision Support to standalone graph
- [ ] **PATHS-068** Tables: `growth_plans` + Decision Support write path
- [ ] **PATHS-069** Generic `agent_runs` pattern across all long-running endpoints
- [ ] **PATHS-070** Frontend: Candidate Pool Builder UI fully wired
- [ ] **PATHS-071** Frontend: Send Outreach dialog on Candidate Profile
- [ ] **PATHS-072** Frontend: global AgentRunsListener with toasts

## Phase 4 — Candidate Portal

- [ ] **PATHS-080** Migrations: candidate_profile, candidate_skills, notifications, notification_preferences, gdpr_requests
- [ ] **PATHS-081** API: candidate dashboard / applications / notifications
- [ ] **PATHS-082** API: profile read/update + CV upload trigger
- [ ] **PATHS-083** Service: job_matching (Qdrant cosine + filters)
- [ ] **PATHS-084** API: recommended-jobs + job-search
- [ ] **PATHS-085** API: skills + skill assessment submission
- [ ] **PATHS-086** API: candidate growth-plan + settings + GDPR (export/delete)
- [ ] **PATHS-087** API: candidate-view of interview session (sanitized)
- [ ] **PATHS-088** Frontend: Candidate Dashboard (extend)
- [ ] **PATHS-089** Frontend: Discover page with AI search + match cards
- [ ] **PATHS-090** Frontend: My Applications with 9-step stage bar
- [ ] **PATHS-091** Frontend: Notifications page + preferences
- [ ] **PATHS-092** Frontend: Profile builder with CV upload + agent progress chip
- [ ] **PATHS-093** Frontend: Skills & Assessments
- [ ] **PATHS-094** Frontend: Interview Session (candidate view)
- [ ] **PATHS-095** Frontend: Growth Plan / IDP page
- [ ] **PATHS-096** Frontend: Settings + GDPR controls

## Phase 5 — Reports, Analytics & Outreach Center

- [ ] **PATHS-100** `analytics_events` table + `emit()` helper
- [ ] **PATHS-101** Instrument state-changing endpoints to emit events
- [ ] **PATHS-102** Materialized views: funnel, time-to-hire, source quality, bias summary
- [ ] **PATHS-103** API: `/analytics/summary` + `/analytics/bias-summary`
- [ ] **PATHS-104** API: CSV + PDF export
- [ ] **PATHS-105** API: Outreach Center list + bulk + templates
- [ ] **PATHS-106** Frontend: `/reports` page with all charts and exports
- [ ] **PATHS-107** Frontend: `/outreach` Center with templates + bulk dialog
- [ ] **PATHS-108** Frontend: `/knowledge-base` extended with upload + RAG test
- [ ] **PATHS-109** Hooks + adapters for all of the above
- [ ] **PATHS-110** Add 4-state coverage to every new page

## Phase 6 — Commercial Launch

- [ ] **PATHS-120** Tables: plans, subscriptions, invoices, usage_counters
- [ ] **PATHS-121** Service: stripe_billing.py (customer + sub + portal + checkout)
- [ ] **PATHS-122** API: stripe webhook handler
- [ ] **PATHS-123** Dependency: enforce_limit(metric) on resource-creating endpoints
- [ ] **PATHS-124** API: public/plans, public/platform-stats, public/jobs
- [ ] **PATHS-125** API: forgot/reset password
- [ ] **PATHS-126** Frontend: /pricing page with Stripe Checkout integration
- [ ] **PATHS-127** Frontend: /billing with plan + invoices + usage meters
- [ ] **PATHS-128** Frontend: Public Job Board + Public Job Detail with schema.org JSON-LD
- [ ] **PATHS-129** Frontend: Forgot/Reset Password pages
- [ ] **PATHS-130** Frontend: Features, Case Studies, Blog (MDX), About, Contact
- [ ] **PATHS-131** SEO: metadata + sitemap.ts + robots.ts on all public routes
- [ ] **PATHS-132** Hooks + adapters for billing and public APIs

## Phase 7 — Admin & Owner Portals

- [ ] **PATHS-140** Tables: feature_flags, feature_flag_overrides, platform_settings, announcements, impersonation_sessions
- [ ] **PATHS-141** Service: org_health.py (health score)
- [ ] **PATHS-142** API: admin stats / pending orgs / approve / suspend
- [ ] **PATHS-143** API: admin org detail + impersonate
- [ ] **PATHS-144** API: admin users + impersonate + suspend
- [ ] **PATHS-145** API: admin agent-runs + retry
- [ ] **PATHS-146** API: admin system-health probes
- [ ] **PATHS-147** API: feature flags + org overrides
- [ ] **PATHS-148** API: platform settings + email templates
- [ ] **PATHS-149** API: owner revenue-summary + analytics/revenue
- [ ] **PATHS-150** API: owner customers + owner orgs + plans editor
- [ ] **PATHS-151** API: owner platform-config + marketing analytics
- [ ] **PATHS-152** API: announcements + delivery (in-app + email)
- [ ] **PATHS-153** Frontend: admin dashboard + org detail + users
- [ ] **PATHS-154** Frontend: agent monitor + system health
- [ ] **PATHS-155** Frontend: feature flags + platform settings
- [ ] **PATHS-156** Frontend: owner dashboard + revenue + customers
- [ ] **PATHS-157** Frontend: owner orgs + plans editor + config
- [ ] **PATHS-158** Frontend: marketing analytics + announcements composer
- [ ] **PATHS-159** Global ImpersonationBanner + Exit button
- [ ] **PATHS-160** Audit log surfaced in admin settings

## Phase 8 — Launch Hardening

- [ ] **PATHS-170** Rotate to argon2id password hashing
- [ ] **PATHS-171** Add login + forgot-password rate limits + account lockout
- [ ] **PATHS-172** Pydantic `extra="forbid"` + CV MIME sniff + HTML sanitization
- [ ] **PATHS-173** Strict CSP + HSTS + CORS allowlist in prod
- [ ] **PATHS-174** Tenant isolation integration test suite
- [ ] **PATHS-175** GDPR: data export job + hard-delete daily cron
- [ ] **PATHS-176** Cookie consent banner + Privacy + Terms pages
- [ ] **PATHS-177** Structured logging + Prometheus metrics + OpenTelemetry traces
- [ ] **PATHS-178** Sentry on frontend + backend; release tags from git SHA
- [ ] **PATHS-179** Lighthouse CI on public pages
- [ ] **PATHS-180** k6 smoke test against staging
- [ ] **PATHS-181** CI workflow: lint, typecheck, test, build, deploy
- [ ] **PATHS-182** gitleaks pre-commit + CI gate
- [ ] **PATHS-183** Docs: root README, backend README, frontend README, architecture, runbooks
- [ ] **PATHS-184** Seed script for demo-ready data
- [ ] **PATHS-185** Status page (subdomain) + uptime checks

---

## Counts by phase

| Phase | Tasks |
|---|---|
| 0 | 9 |
| 1 | 18 |
| 2 | 21 |
| 3 | 13 |
| 4 | 17 |
| 5 | 11 |
| 6 | 13 |
| 7 | 21 |
| 8 | 16 |
| **Total** | **139** |
