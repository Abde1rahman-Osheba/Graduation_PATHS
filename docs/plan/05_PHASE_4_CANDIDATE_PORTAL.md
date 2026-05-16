# Phase 4 — Candidate Portal

## Goal

Make the candidate experience real. After this phase a candidate can register,
build a profile (triggers CV Ingestion), discover matched jobs, track every
application through 9 stages, accept interview invites, take their interview,
view a personalized Growth Plan after hire, and manage notifications + GDPR
controls in settings.

## Preconditions

- Phase 3 acceptance has passed.
- `growth_plans` and `outreach_sequences` tables exist.

---

## Backend deliverables

### Tables / migrations

1. **`candidate_profile`** — extends `accounts` with candidate-specific fields:
   `headline`, `location`, `linkedin_url`, `desired_salary_min/max`,
   `desired_locations` (JSONB), `work_type` (`remote`|`hybrid`|`onsite`|`any`),
   `notice_period_days`, `is_discoverable` (bool), `profile_completion` (float).
2. **`candidate_skills`** — `candidate_id, skill, level (1–5), source
   (`cv_extracted`|`self_assessed`|`verified`), verified_at`.
3. **`notifications`** — `id, account_id, type, title, body, link, read_at,
   created_at`.
4. **`notification_preferences`** — `account_id, channel (email|in_app),
   type, enabled`.
5. **`gdpr_requests`** — `id, account_id, kind (export|delete), status,
   payload_ref, created_at, completed_at`.

### Endpoints

- `GET /api/v1/candidate/dashboard` → welcome stats + recent activity.
- `GET /api/v1/candidate/applications?status=` → list with stage progress.
- `GET /api/v1/candidate/recommended-jobs` → personalized matches (cosine
  similarity vs candidate embedding).
- `POST /api/v1/candidate/job-search` body `{query, filters}` → AI-ranked jobs.
- `GET /api/v1/candidate/notifications?unread=&page=`
- `PUT /api/v1/candidate/notifications/read-all`
- `GET /api/v1/candidate/profile` / `PUT`
- `POST /api/v1/candidate/upload-cv` (multipart) → triggers CV Ingestion graph.
- `GET /api/v1/candidate/skills` / `POST /api/v1/candidate/skill-assessment/:id/submit`
- `GET /api/v1/candidate/interview-invites`
- `PUT /api/v1/candidate/interview-invites/:id/respond` (already defined in Phase 2).
- `GET /api/v1/interview-sessions/:id/candidate-view` (sanitized session view).
- `GET /api/v1/candidate/growth-plan`
- `GET /api/v1/candidate/settings` / `PUT`
- `POST /api/v1/candidate/export-data` → enqueues GDPR export → email link.
- `DELETE /api/v1/candidate/account` → soft delete + scheduled hard delete after 30 days.

### Recommendation engine

A new service `backend/app/services/job_matching.py`:

```python
async def recommended_jobs_for(candidate_id: UUID, *, limit: int = 20):
    """
    1. Fetch candidate embedding from Qdrant 'candidates' collection.
    2. Search 'jobs' collection by cosine similarity, filtered by:
       - candidate.desired_locations or remote = True
       - candidate.work_type compatibility
    3. Hydrate top-N hits from Postgres.
    4. Return with match_score (cosine similarity 0..1).
    """
```

Used by `GET /candidate/recommended-jobs` and `POST /candidate/job-search`.

### CV Ingestion progress

The CV upload endpoint must return an `agent_run_id` immediately so the
profile builder can poll progress. Already supported by the generic
`agent_runs` table from Phase 3.

---

## Frontend deliverables

### Routes

```
src/app/(candidate)/candidate/
├── dashboard/page.tsx                ← (extend existing)
├── discover/page.tsx                 ← NEW
├── applications/page.tsx             ← NEW
├── notifications/page.tsx            ← NEW
├── profile/page.tsx                  ← (extend existing)
├── skills/page.tsx                   ← NEW
├── interviews/
│   ├── page.tsx                      ← (extend existing)
│   └── [sid]/page.tsx                ← NEW (candidate-facing session)
├── growth-plan/page.tsx              ← NEW
└── settings/page.tsx                 ← NEW
```

### Components

Under `src/components/features/candidate/`:

- **Dashboard:** `ApplicationsTimeline`, `UpcomingInterviewCards`,
  `ProfileStrengthMeter`, `DiscoverJobsCta`.
- **Discover:** `AISearchBar`, `JobMatchCard` (with match % bar),
  `JobFilterPanel`, `SavedJobsDrawer`.
- **Applications:** `ApplicationRow`, `StageProgressBar` (9-step visual),
  `WithdrawDialog`.
- **Notifications:** `NotificationsList`, `NotificationPreferences`.
- **Profile:** `CVUploadZone` (with agent-run progress chip),
  `WorkExperienceEditor`, `EducationEditor`, `SkillsEditor`, `PreferencesForm`.
- **Skills:** `SkillsRadarChart`, `VerifiedSkillsBadges`, `AssessmentsList`.
- **Interview Session (candidate view):** `VideoCallFrame` (iframe placeholder),
  `AIAssistantPanel` (suggested questions for the candidate to prepare),
  `LiveCaptions`, `NotesPad`, `EndSessionButton`.
- **Growth Plan:** `IDPHeader`, `SkillGapRadar`, `LearningPathList`,
  `MilestoneTimeline` (30/60/90 day with checkboxes), `ProgressRing`.
- **Settings:** `AccountForm`, `NotificationPreferences`, `PrivacyControls`,
  `DataExportButton`, `DeleteAccountSection`.

### Hooks

```ts
useCandidateDashboard()
useRecommendedJobs(filters)
useCandidateJobSearch()                   // mutation
useApplications(status)
useNotifications(opts)
useMarkAllNotificationsRead()             // mutation
useCandidateProfile()
useUpdateCandidateProfile()               // mutation
useUploadCv()                             // mutation, returns agent_run_id
useCandidateSkills()
useInterviewInvites()
useRespondToInvite()                      // mutation
useCandidateInterviewSession(sid)
useGrowthPlan()
useCandidateSettings()
useExportMyData()                         // mutation
useDeleteMyAccount()                      // mutation
```

### CV upload polling

`useUploadCv` returns `{run_id}`. The profile builder shows a chip
"AI is parsing your CV — extracting skills" that polls `useAgentRun(runId)`
and animates through the 8 nodes of the CV Ingestion graph. On `completed`,
re-fetch profile so the extracted skills/experience appear.

---

## Data contracts (canonical examples)

### `GET /candidate/recommended-jobs`
```json
{
  "items": [
    {
      "job_id": "...", "title": "Senior Backend Engineer",
      "company": { "name": "Acme", "logo_url": "..." },
      "location": "Remote", "salary_range": "40k–60k EGP",
      "match_score": 0.87, "top_matching_skills": ["Python", "PostgreSQL"]
    }
  ]
}
```

### `GET /candidate/growth-plan`
```json
{
  "candidate_id": "...", "job_id": "...",
  "hired_role": "Senior Backend Engineer", "start_date": "2026-06-01",
  "skill_gaps": [
    { "skill": "Kubernetes", "current": 2, "target": 4 }
  ],
  "learning_resources": [
    { "skill": "Kubernetes", "type": "course", "title": "CKAD Crash Course", "url": "..." }
  ],
  "milestones": [
    { "day": 30, "goal": "Deploy first service to staging cluster",
      "success_metric": "PR merged, passing CI" }
  ],
  "overall_completion": 0.0
}
```

---

## Acceptance

- [ ] A new candidate registers, uploads a CV, and within 30 seconds sees
      auto-extracted experience and skills in their profile.
- [ ] `/candidate/discover` shows at least 5 jobs ranked by match score, each
      with a visible % bar.
- [ ] `/candidate/applications` shows the candidate's pipeline stage per
      application as a 9-step visual progress bar.
- [ ] Accepting an invite from `/candidate/interviews` moves the invite to
      `accepted` and writes the selected slot to `interview_sessions`.
- [ ] When the org marks a hire (Phase 2 Decision Matrix), the candidate's
      `/candidate/growth-plan` is auto-generated and renders with non-empty
      skill gaps and milestones.
- [ ] `/candidate/settings` data export creates a downloadable JSON within
      2 minutes (link sent by email or in-app notification).
- [ ] Account deletion soft-deletes the row, shows a 30-day undo window in
      settings, and prevents login during that window.

---

## Tasks

| ID | Task |
|---|---|
| PATHS-080 | Migrations: candidate_profile, candidate_skills, notifications, notification_preferences, gdpr_requests |
| PATHS-081 | API: candidate dashboard / applications / notifications |
| PATHS-082 | API: profile read/update + CV upload trigger |
| PATHS-083 | Service: job_matching (Qdrant cosine + filters) |
| PATHS-084 | API: recommended-jobs + job-search |
| PATHS-085 | API: skills + skill assessment submission |
| PATHS-086 | API: candidate growth-plan + settings + GDPR (export/delete) |
| PATHS-087 | API: candidate-view of interview session (sanitized) |
| PATHS-088 | Frontend: Candidate Dashboard (extend) |
| PATHS-089 | Frontend: Discover page with AI search + match cards |
| PATHS-090 | Frontend: My Applications with 9-step stage bar |
| PATHS-091 | Frontend: Notifications page + preferences |
| PATHS-092 | Frontend: Profile builder with CV upload + agent progress chip |
| PATHS-093 | Frontend: Skills & Assessments |
| PATHS-094 | Frontend: Interview Session (candidate view) |
| PATHS-095 | Frontend: Growth Plan / IDP page |
| PATHS-096 | Frontend: Settings + GDPR controls |

---

## Risks & rollback

- **Match score relevance.** Cosine similarity alone is noisy. Add a hard
  filter on required-skill overlap before sorting by score so candidates
  don't see irrelevant matches when the embedding is weak.
- **GDPR data export** must include everything tied to the account: profile,
  applications, transcripts they participated in, growth plan. Build with a
  schema test that diffs against the data model to catch new tables.
- **Account deletion cascades.** Hard delete must not break referential
  integrity in agent_runs / decisions. Use anonymization (replace name/email
  with `[deleted user]`) rather than row deletion where audit history matters.
