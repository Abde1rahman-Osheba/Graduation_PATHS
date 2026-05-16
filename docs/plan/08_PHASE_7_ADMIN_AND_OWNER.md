# Phase 7 — Platform Admin & Owner Portals

## Goal

Give PATHS staff full visibility and control. After this phase, support staff
(`PLATFORM_ADMIN`) can approve orgs, monitor agents, impersonate users for
support, and control feature flags. Founders/CEO (`OWNER`) get the business
view: MRR, churn, customer health, revenue analytics, and the ability to send
platform-wide announcements.

Both portals share most infrastructure with the org portal but are gated by
role in `middleware.ts`.

## Preconditions

- Phase 6 acceptance has passed.
- Stripe webhook is flowing `analytics_events` (`billing.*`) so revenue metrics
  are real.

---

## Backend deliverables

### Tables

- **`feature_flags`** — `id, code, description, enabled (default), created_at`.
- **`feature_flag_overrides`** — `flag_id, org_id, enabled, set_by, set_at`.
- **`platform_settings`** — singleton row: `display_name, support_email,
  legal_company_name, default_plan_id, maintenance_mode, email_templates (JSONB)`.
- **`announcements`** — `id, content (rich), audience (JSONB filter),
  scheduled_at, sent_at, in_app_banner_enabled, banner_color, created_by`.
- **`impersonation_sessions`** — `id, impersonator_account_id, target_account_id,
  started_at, ended_at, reason` (auditable).

### Endpoints — Admin

- `GET /api/v1/platform-admin/stats` — totals: orgs, candidates, CVs, jobs, hires.
- `GET /api/v1/platform-admin/pending-orgs`
- `PUT /api/v1/platform-admin/orgs/{id}/status` — approve / suspend.
- `GET /api/v1/platform-admin/orgs/{id}` — full org dossier.
- `POST /api/v1/platform-admin/orgs/{id}/impersonate` — returns short-lived
  scoped JWT.
- `GET /api/v1/platform-admin/users`
- `POST /api/v1/platform-admin/users/{id}/impersonate`
- `PUT /api/v1/platform-admin/users/{id}/suspend`
- `GET /api/v1/platform-admin/agent-runs` — filterable list across all orgs.
- `POST /api/v1/platform-admin/agent-runs/{id}/retry`
- `GET /api/v1/platform-admin/system-health` — Postgres, AGE, Qdrant, OpenRouter
  status checks (each as a small async probe).
- `GET /api/v1/platform-admin/feature-flags` / `PUT` / `POST .../org-override`
- `GET /api/v1/platform-admin/settings` / `PUT`

### Endpoints — Owner

- `GET /api/v1/owner/revenue-summary` → MRR, ARR, churn, new orgs, top customers.
- `GET /api/v1/owner/analytics/revenue?from=&to=`
- `GET /api/v1/owner/customers?health=&plan=&churned=` — with health score.
- `GET /api/v1/owner/orgs?q=&plan=&health=` — superset of admin org list with
  commercial columns (MRR, health).
- `POST /api/v1/owner/orgs/{id}/impersonate`
- `GET /api/v1/owner/plans` / `POST` / `PUT`
- `GET /api/v1/owner/platform-config` / `PUT`
- `GET /api/v1/owner/analytics/marketing` — UTM funnel.
- `POST /api/v1/owner/announcements` / `GET`

### Health score

`services/org_health.py` — a 0–100 score weighting:
- Activity (jobs posted, CVs processed, logins last 30d) 50%
- Commercial (paid plan, on-time invoices) 30%
- Engagement (feature adoption breadth) 20%

### Impersonation safety

- Impersonation JWTs are scoped: short TTL (15 min), can only `GET`, can never
  trigger destructive actions, and are stamped with an `impersonating: true`
  claim. The UI shows a persistent red banner during an impersonation session.
- Every impersonation writes a row to `impersonation_sessions` (audit log
  surfaced in the admin Settings page).

---

## Frontend deliverables

### Routes

```
src/app/(admin)/admin/
├── page.tsx                       ← extend (full stats + system health + agent health)
├── analytics/page.tsx
├── orgs/
│   ├── page.tsx                   ← (already BUILT)
│   └── [id]/page.tsx              ← NEW
├── users/page.tsx
├── agents/page.tsx                ← Agent Monitor
├── system/page.tsx                ← System Health
├── flags/page.tsx                 ← Feature Flags
└── settings/page.tsx              ← Platform Settings

src/app/(owner)/owner/
├── page.tsx                       ← Owner Dashboard
├── revenue/page.tsx               ← Revenue Analytics
├── customers/page.tsx             ← Customer Analytics
├── orgs/page.tsx                  ← All Orgs (Owner view)
├── plans/page.tsx                 ← Subscription Plans editor
├── config/page.tsx                ← Platform Config
├── marketing/page.tsx             ← Marketing Analytics
└── announcements/page.tsx
```

### Components

Under `src/components/features/admin/`:

- `PlatformStatsGrid`, `OrgApprovalQueue`, `AgentHealthCards`,
  `SystemStatusRow`, `RecentPlatformEvents`.
- `OrgDetailHeader`, `OrgMetricsCards`, `OrgMembersTable`, `OrgJobsList`,
  `OrgActivityTimeline`, `OrgUsageMeters`, `AdminActionsBar` (with
  `ImpersonateButton`).
- `UsersTable` with `ImpersonateButton`, `SuspendDialog`, `ResetPasswordButton`.
- `AgentRunsTable` with retry; `ErrorLogPanel`; `AgentPerformanceCharts`.
- `ServiceStatusGrid`, `LatencyCharts`, `DatabaseMetrics`,
  `QdrantCollectionStats`, `ErrorRateChart`, `MaintenanceModeToggle`.
- `FeatureFlagsList` + `OrgOverridePanel` + `FlagAuditLog`.
- `PlatformSettingsForm`, `EmailTemplatesEditor`.

Under `src/components/features/owner/`:

- `MrrCard`, `ArrCard`, `ChurnRateGauge`, `NewOrgsSparkline`, `ActiveSeatsBar`,
  `RevenueByPlanDonut`, `TopCustomersTable`, `AlertBanner`.
- `MrrOverTimeChart`, `RevenueBreakdownStackedArea`, `ChurnCohortTable`,
  `LtvHistogram`.
- `CustomerTable` with `HealthScoreIndicator` (color gradient) and
  `AtRiskFilter`.
- `OrgSuperTable` (extends admin's), `OrgDetailDrawer`.
- `PlansEditor`, `FeatureMatrix`, `GrandfatheringControl`, `TrialConfig`.
- `PlatformConfigForm` with `ApiKeyRotation`, `DataRetentionPolicy`.
- `UtmTrafficTable`, `ConversionFunnel`, `CampaignRoiTable`.
- `AnnouncementComposer`, `AudienceSelector`, `SchedulePicker`, `InAppBannerConfig`.

### Impersonation UI

Global `<ImpersonationBanner />` rendered in the dashboard layout. When the
session has the `impersonating: true` claim, show a persistent red banner with
"You are viewing as ..." + an "Exit impersonation" button that calls
`POST /auth/exit-impersonation`.

### Hooks

```ts
// admin
usePlatformStats(), usePendingOrgs(), useApproveOrg(), useSuspendOrg(),
useAdminOrg(id), useImpersonate(targetId),
useAdminUsers(filters), useSuspendUser(),
useAgentRuns(filters), useRetryAgentRun(),
useSystemHealth(), useFeatureFlags(), useUpdateFlag(),
useFlagOrgOverride(), usePlatformSettings(), useUpdatePlatformSettings()

// owner
useRevenueSummary(), useRevenueAnalytics({from,to}),
useCustomers(filters), useOwnerOrgs(filters),
usePlans(), useUpsertPlan(),
usePlatformConfig(), useUpdatePlatformConfig(),
useMarketingAnalytics({from,to}),
useAnnouncements(), useCreateAnnouncement()
```

---

## Data contracts (canonical examples)

### `GET /owner/revenue-summary`
```json
{
  "mrr_cents": 184000, "mrr_change_mom_pct": 0.12,
  "arr_cents": 2208000,
  "churn_rate_30d": 0.018,
  "new_orgs_this_month": 7, "new_orgs_last_month": 5,
  "active_seats_used": 142, "active_seats_total": 180,
  "revenue_by_plan": [
    { "plan": "starter", "cents": 24500, "pct": 0.13 },
    { "plan": "growth", "cents": 102000, "pct": 0.55 },
    { "plan": "enterprise", "cents": 57500, "pct": 0.31 }
  ],
  "top_customers": [
    { "org_id": "...", "name": "Acme", "mrr_cents": 39000, "plan": "enterprise" }
  ],
  "alerts": [
    { "kind": "payment_failed", "org_id": "...", "message": "Last 2 invoices failed" }
  ]
}
```

---

## Acceptance

- [ ] `/admin` shows real platform totals matching `SELECT count(*)` against
      the DB.
- [ ] `/admin/orgs/{id}` shows all members, jobs, usage; clicking Impersonate
      starts a session with a persistent red banner.
- [ ] `/admin/agents` lists agent runs across all orgs with a working retry.
- [ ] `/admin/system` returns all-green when Postgres + AGE + Qdrant +
      OpenRouter are reachable; flips a service to red when one is down.
- [ ] `/owner` shows non-zero MRR/ARR after at least one successful Stripe
      subscription in test mode.
- [ ] Sending an announcement to "all orgs" displays an in-app banner across
      every org user's dashboard.
- [ ] Editing a plan in `/owner/plans` propagates immediately to `/pricing`.

---

## Tasks

| ID | Task |
|---|---|
| PATHS-140 | Tables: feature_flags, feature_flag_overrides, platform_settings, announcements, impersonation_sessions |
| PATHS-141 | Service: org_health.py (health score) |
| PATHS-142 | API: admin stats / pending orgs / approve / suspend |
| PATHS-143 | API: admin org detail + impersonate |
| PATHS-144 | API: admin users + impersonate + suspend |
| PATHS-145 | API: admin agent-runs + retry |
| PATHS-146 | API: admin system-health probes |
| PATHS-147 | API: feature flags + org overrides |
| PATHS-148 | API: platform settings + email templates |
| PATHS-149 | API: owner revenue-summary + analytics/revenue |
| PATHS-150 | API: owner customers + owner orgs + plans editor |
| PATHS-151 | API: owner platform-config + marketing analytics |
| PATHS-152 | API: announcements + delivery (in-app + email) |
| PATHS-153 | Frontend: admin dashboard + org detail + users |
| PATHS-154 | Frontend: agent monitor + system health |
| PATHS-155 | Frontend: feature flags + platform settings |
| PATHS-156 | Frontend: owner dashboard + revenue + customers |
| PATHS-157 | Frontend: owner orgs + plans editor + config |
| PATHS-158 | Frontend: marketing analytics + announcements composer |
| PATHS-159 | Global ImpersonationBanner + Exit button |
| PATHS-160 | Audit log surfaced in admin settings |

---

## Risks & rollback

- **Impersonation is the highest-trust feature in the system.** Lock down the
  scope (read-only, short TTL, audited). A single bug here is a security
  incident.
- **Owner role separation.** `OWNER` is a different JWT role from
  `PLATFORM_ADMIN`. The Owner portal must be hidden from admins; double-check
  the middleware rule.
- **Feature flag granularity.** Per-org overrides allow gradual rollout but
  also create test-matrix explosion. Document each flag's lifecycle: when it
  was added, when it should be removed.
- **Announcement delivery.** "Send to all orgs" can mean tens of thousands of
  recipients. Process via the agent_runs queue, not synchronously.
