# Phase 6 — Commercial Launch (Public Site, Pricing, Billing, Job Board)

## Goal

Turn PATHS from a working internal product into a commercial SaaS people can
sign up for and pay for. After this phase the public website is complete, a
visitor can pick a plan, sign up, get billed by Stripe, and see usage meters
in their org's Billing page. Job postings flow to a public job board where
candidates can apply.

## Preconditions

- Phases 0–5 acceptance has passed.
- A Stripe account exists (test mode is sufficient for graduation; production
  mode is required for real launch).
- A custom domain is purchased (e.g. `paths.app`).

---

## Backend deliverables

### Billing & subscription tables

```python
class Plan(Base):
    id, name, code (starter|growth|enterprise|custom)
    price_monthly_cents, price_annual_cents, currency
    limits (JSONB)  # { jobs_active, cvs_per_month, seats, agent_runs_per_hour }
    features (JSONB) # feature flag map
    is_public  # whether shown on /pricing
    stripe_price_id_monthly, stripe_price_id_annual

class Subscription(Base):
    id, org_id, plan_id, billing_cycle (monthly|annual)
    status (trialing|active|past_due|cancelled)
    trial_ends_at, current_period_start, current_period_end
    stripe_customer_id, stripe_subscription_id
    cancel_at_period_end

class Invoice(Base):
    id, org_id, subscription_id, amount_cents, currency
    status (open|paid|void|uncollectible), pdf_url
    period_start, period_end, due_at, paid_at, stripe_invoice_id

class UsageCounter(Base):
    org_id, period_start, period_end
    cvs_processed, jobs_active, agent_runs, api_calls
```

### Stripe integration

`backend/app/services/stripe_billing.py` wraps:

- `create_customer(org_id) -> stripe_customer_id`
- `create_subscription(org_id, price_id, trial_days) -> {sub_id, status}`
- `update_subscription_plan(sub_id, new_price_id) -> ...`
- `cancel_subscription(sub_id, at_period_end=True)`
- `create_customer_portal_session(customer_id) -> {url}`

### Webhook

`POST /api/v1/stripe/webhook` — processes:
- `customer.subscription.created/updated/deleted`
- `invoice.created/paid/payment_failed`
- `customer.updated`

On each, update local tables and emit an `analytics_events` row
(`billing.subscription_started`, `billing.payment_failed`, …) so the Owner
revenue dashboard reflects real numbers.

### Plan limit enforcement

A FastAPI dependency `enforce_limit(metric)` checks the org's current
`UsageCounter` against `Subscription.plan.limits` and raises 402 when
exceeded. Applied to job creation, CV upload, agent run triggers.

### Public endpoints (unauthenticated)

- `GET /api/v1/public/platform-stats` — orgs, CVs processed, placements
  (used by hero counters).
- `GET /api/v1/public/plans` — public plans for the pricing page.
- `GET /api/v1/public/jobs?q=&location=&type=&page=` — public job listings.
- `GET /api/v1/public/jobs/{slug}` — single listing with schema.org-shaped
  metadata.

### Forgot / reset password

- `POST /api/v1/auth/forgot-password` body `{email}` → always responds 200
  (don't leak which emails exist), enqueues email.
- `POST /api/v1/auth/reset-password` body `{token, new_password}` → resets.

---

## Frontend deliverables

### Routes

```
src/app/(public)/
├── page.tsx                        ← (extend existing landing)
├── features/page.tsx
├── pricing/page.tsx
├── case-studies/
│   ├── page.tsx
│   └── [slug]/page.tsx
├── blog/
│   ├── page.tsx
│   └── [slug]/page.tsx
├── about/page.tsx
├── contact/page.tsx
├── jobs/                            ← Public Job Board
│   ├── page.tsx
│   └── [slug]/page.tsx
└── ...

src/app/(auth)/
├── forgot-password/page.tsx
└── reset-password/[token]/page.tsx

src/app/(dashboard)/
└── billing/page.tsx                 ← Org Billing & Subscription
```

### Components

Under `src/components/marketing/`:

- `PricingToggle` (monthly/annual)
- `PricingCard` ×3
- `FeatureComparisonTable` — full matrix
- `FAQAccordion`
- `EnterpriseCta`
- `TrustBadges`
- `AgentExplainer` (interactive 6-agent diagram)
- `PipelineWalkthrough` (scrollytelling)
- `IntegrationsLogos`
- `CaseStudyGrid` / `CaseStudyDetail` (MDX-driven from `content/case-studies/`)
- `BlogGrid` / `BlogPost` (MDX from `content/blog/`)
- `PublicJobBoard` — search + filter + card grid
- `PublicJobDetail` — job header + apply CTA + `JobPostingSchema` (script tag
  with schema.org JSON-LD for Google Jobs indexing)

Under `src/components/features/billing/`:

- `CurrentPlanCard`
- `UpgradePlanDialog`
- `PaymentMethodCard`
- `InvoicesTable`
- `UsageMeters` — CVs / jobs / seats / agent runs vs limits
- `CancelPlanFlow` with retention step

### SEO essentials

- `metadata` exports on every public route with title, description, OG tags.
- `app/sitemap.ts` generates a sitemap from all public routes + public jobs.
- `app/robots.ts` for crawler hints.
- `next/image` for all marketing imagery; `next/font` for typography.

### Hooks

```ts
usePublicPlans()
usePublicJobs(filters)
usePublicJob(slug)
useOrgSubscription()
useOrgInvoices()
useUpgradePlan()                    // mutation → redirect to Stripe Checkout
useCustomerPortalLink()             // mutation → redirect to Stripe Portal
useUsage()
useForgotPassword()                 // mutation
useResetPassword()                  // mutation
```

### Stripe Checkout flow

The UI never collects card details directly. `UpgradePlanDialog` calls
`POST /billing/checkout-session` which returns a Stripe Checkout URL; the
frontend `window.location.assign`s to it. After payment, Stripe redirects
back to `/billing?session_id=...` and the page polls `useOrgSubscription`
until the subscription reflects the new plan.

Card updates go via Stripe Customer Portal (`useCustomerPortalLink`).

---

## Data contracts

### `GET /public/plans`
```json
{
  "plans": [
    {
      "id": "plan_starter", "name": "Starter", "code": "starter",
      "price_monthly_cents": 4900, "price_annual_cents": 49000,
      "currency": "USD",
      "limits": { "jobs_active": 5, "cvs_per_month": 100, "seats": 3 },
      "features": ["cv_ingestion", "screening", "interview_intelligence"]
    }
  ]
}
```

### Stripe webhook event handling (excerpt)
```
invoice.paid → mark invoice paid, emit analytics_events("billing.payment_succeeded")
invoice.payment_failed → set subscription.status = past_due, notify org admin
customer.subscription.deleted → status = cancelled, downgrade limits at period end
```

---

## Acceptance

- [ ] `/pricing` loads with three plans, monthly/annual toggle works,
      Stripe Checkout redirect succeeds in test mode for each plan.
- [ ] `/billing` shows current plan, real invoices, usage meters that update
      after a CV upload.
- [ ] Stripe webhook in test mode triggers the local DB to reflect plan
      changes within 5 seconds.
- [ ] Public Job Board lists active jobs from all orgs (where `is_public=true`).
- [ ] A public job detail page renders schema.org JobPosting JSON-LD that
      passes Google's Rich Results Test.
- [ ] Forgot-password flow delivers an email (or logs the link in dev) and
      reset works with a fresh token.
- [ ] `sitemap.xml` includes every public route + all public job slugs.

---

## Tasks

| ID | Task |
|---|---|
| PATHS-120 | Tables: plans, subscriptions, invoices, usage_counters |
| PATHS-121 | Service: stripe_billing.py (customer + sub + portal + checkout) |
| PATHS-122 | API: stripe webhook handler |
| PATHS-123 | Dependency: enforce_limit(metric) on resource-creating endpoints |
| PATHS-124 | API: public/plans, public/platform-stats, public/jobs |
| PATHS-125 | API: forgot/reset password |
| PATHS-126 | Frontend: /pricing page with Stripe Checkout integration |
| PATHS-127 | Frontend: /billing with plan + invoices + usage meters |
| PATHS-128 | Frontend: Public Job Board + Public Job Detail with schema.org JSON-LD |
| PATHS-129 | Frontend: Forgot/Reset Password pages |
| PATHS-130 | Frontend: Features, Case Studies, Blog (MDX), About, Contact |
| PATHS-131 | SEO: metadata + sitemap.ts + robots.ts on all public routes |
| PATHS-132 | Hooks + adapters for billing and public APIs |

---

## Risks & rollback

- **Stripe webhook idempotency.** Use the `Stripe-Signature` header for
  verification and the event id for dedupe; store processed event ids in a
  small `stripe_processed_events` table.
- **Plan migrations.** When you change plan limits, grandfather existing
  subscriptions — never silently reduce a paying customer's limits.
- **Public Job Board moderation.** A public, SEO-indexed job board is a spam
  magnet. Require admin approval on org creation (already exists) and add a
  `is_public_listable` flag per job (default true; recruiters can opt out).
- **Schema.org JSON-LD** must validate. Add a CI step that runs Google's
  Structured Data linter on a sample job page.
- **Email delivery in dev.** Use Mailpit (local SMTP) so the forgot-password
  flow works without sending real email during development.
