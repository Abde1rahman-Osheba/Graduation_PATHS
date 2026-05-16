# Runbook 02 — Triaging a Stuck or Failed CV Ingestion

**Symptoms**:
- Candidate uploaded a CV but their profile was not created.
- `AgentRun` row stuck in `running` or `queued` for > 5 minutes.
- Recruiter sees "Processing…" indefinitely on the pipeline board.

---

## Step 1 — Identify the failing run

```sql
-- Find runs stuck in running for more than 5 minutes
SELECT id, type, status, org_id, created_at, updated_at, error_log
FROM agent_runs
WHERE status IN ('running', 'queued')
  AND updated_at < NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 20;
```

Or via the Platform Admin panel: **Admin → Agent Monitor → Filter: failed/running**.

---

## Step 2 — Read the error log

```sql
SELECT error_log
FROM agent_runs
WHERE id = '<run_id>';
```

Common errors and their causes:

| Error substring | Likely cause |
|---|---|
| `QdrantException: collection not found` | Qdrant collection was recreated; run the sync script |
| `ParseError: expected PDF` | Corrupted file upload; ask candidate to re-upload |
| `OpenAI / OpenRouter 429` | Rate limit hit; check API quota |
| `asyncpg.exceptions.UniqueViolationError` | Duplicate candidate email in same org |
| `AGEError: vertex label does not exist` | Missing AGE migration; run `alembic upgrade head` |
| `ConnectionRefused: 6333` | Qdrant is down; check Qdrant Cloud status |

---

## Step 3 — Check structured logs

```bash
# Backend logs on Fly.io
fly logs --app paths-backend | grep '"run_id":"<run_id>"'

# Locally
grep '"run_id":"<run_id>"' /var/log/paths/backend.log
```

Look for the last node name logged before the error:
```json
{"ts": "...", "level": "INFO", "msg": "node complete",
 "run_id": "...", "node": "embed", "duration_ms": 342}
```

This tells you exactly where the pipeline stopped.

---

## Step 4 — Retry via the admin panel

1. Open **Admin → Agent Monitor**.
2. Find the failed run.
3. Click **Retry** — this resets `status=queued` and `error_log=null`.

Or via the API:

```bash
curl -X POST https://api.paths.ai/api/v1/platform-admin/agent-runs/<run_id>/retry \
  -H "Authorization: Bearer <admin_token>"
```

---

## Step 5 — If retry keeps failing

1. **Qdrant down**: check https://status.qdrant.io or your Qdrant Cloud
   dashboard.  Once restored, the retry will proceed normally.

2. **Corrupted CV**: download the original from `candidate_documents` table,
   open it locally, confirm it's a valid PDF/DOCX.

3. **OpenRouter rate limit**: check your OpenRouter usage dashboard.  The
   scoring agent has exponential back-off (`tenacity`); if the error is
   persistent, the API key may be exhausted or blocked.

4. **Database connection issue**: check `GET /api/v1/health/databases`.
   If any store is unhealthy, resolve the connectivity issue first.

5. **Code bug in a new deployment**: roll back with
   `fly deploy --app paths-backend --image <previous_image>`.

---

## Step 6 — Clear ghost runs after an outage

After resolving a system-wide outage, there may be many stuck `running` runs
that will never complete because the worker process was killed mid-flight.
Reset them all:

```sql
UPDATE agent_runs
SET status = 'failed',
    error_log = 'Killed during system outage — reset by ops',
    updated_at = NOW()
WHERE status = 'running'
  AND updated_at < NOW() - INTERVAL '30 minutes';
```

Then retrigger each one via the admin panel or ask affected users to re-upload.
