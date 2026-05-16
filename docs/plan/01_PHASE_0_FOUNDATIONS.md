# Phase 0 — Foundations

## Goal

Unblock the rest of the project. After this phase the stack starts cleanly on
a fresh machine, the org dashboard shows live data instead of silent empty
states, and there are no committed secrets or dead code in the tree.

This phase touches almost no product features — it removes accumulated
friction. **Do not start Phase 1 before all acceptance checks here pass.**

## Preconditions

- PostgreSQL 14+ with Apache AGE extension installed locally or via Docker.
- Qdrant available at `http://localhost:6333` (run `docker run -p 6333:6333 qdrant/qdrant`).
- Node 20+ and pnpm 9+; Python 3.11+ with `uv` or `venv`.
- A working OpenRouter API key.

---

## Backend deliverables

### Environment & secrets

1. **Rotate Google service-account key.** `backend/secrets/paths-494513-11c105687034.json`
   is in git. Revoke it in Google Cloud Console, then:
   ```bash
   git rm --cached backend/secrets/paths-494513-11c105687034.json
   echo "backend/secrets/" >> .gitignore
   git commit -m "PATHS-001: rotate and remove committed service-account key"
   ```
2. **Generate a real `SECRET_KEY`** and place it in `backend/.env`:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(64))"
   ```
   Replace any `CHANGE-ME-TO-A-RANDOM-SECRET` value. Confirm `app/core/config.py`
   raises on the default sentinel value in production (`APP_ENV=production`).
3. **Verify `backend/.env`** contains:
   ```
   SECRET_KEY=<64-char-random>
   DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/paths
   QDRANT_URL=http://localhost:6333
   OPENROUTER_API_KEY=sk-or-...
   CANDIDATE_SOURCING_PROVIDER=mock
   APP_ENV=development
   ```
   Remove `GOOGLE_APPLICATION_CREDENTIALS` if it points to the deleted JSON.

### Database

4. **Install Apache AGE** in your Postgres database:
   ```sql
   CREATE EXTENSION IF NOT EXISTS age;
   LOAD 'age';
   SET search_path = ag_catalog, "$user", public;
   ```
   Document this in `backend/README.md` as a setup step.
5. **Check Alembic heads.**
   ```bash
   cd backend && alembic heads
   ```
   If two heads exist (the blueprint mentions `80a2c3cb4e2f` and `42430ef650e8`),
   create a merge migration:
   ```bash
   alembic merge -m "merge_pre_completion_branches" <head_a> <head_b>
   alembic upgrade head
   ```
6. **Smoke-test the schema.** `psql` into the database and run:
   ```sql
   SELECT COUNT(*) FROM accounts;
   SELECT COUNT(*) FROM jobs;
   ```
   Both should return 0 without errors.

### Code cleanup

7. **Delete `frontend/src/`** entirely. Move any genuinely useful snippets to
   `frontend/apps/web/src/` first, but the blueprint is clear: it is dead code.
   ```bash
   git rm -r frontend/src
   git commit -m "PATHS-002: remove legacy frontend/src dead codebase"
   ```
8. **Remove `HAS_BACKEND` flag** from `frontend/apps/web/src/lib/hooks/index.ts`.
   This flag silently returns empty arrays when `NEXT_PUBLIC_API_URL` is unset
   and is the root cause of "the org dashboard is empty" reports. Always call
   the API; let TanStack Query surface the error state if the backend is down.

### Boot smoke

9. **Confirm the API serves on port 8001** (not 8000 — the blueprint mentions
   8000 but `CLAUDE.md` is authoritative):
   ```bash
   uvicorn app.main:app --reload --port 8001
   curl http://localhost:8001/api/v1/health
   ```

---

## Frontend deliverables

### Environment

1. **Create `frontend/apps/web/.env.local`:**
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8001
   ```
   Add `frontend/apps/web/.env.local.example` with the same key but no value,
   commit the example file, ignore `.env.local`.

### Verification page

2. **Add a `/_health` page** at `frontend/apps/web/src/app/_health/page.tsx`
   that fetches `GET /api/v1/health` through the API client and shows the
   response. Use this whenever a future bug looks like a connection issue.
   Remove from production navigation but keep the route.

### Wire the dashboard to live data

3. Confirm `/dashboard` renders **real** values from `GET /api/v1/org/dashboard/stats`,
   `GET /api/v1/org/agent-status`, `GET /api/v1/org/recent-activity`. If any of
   these are still mocked, replace the mock import with the real hook from
   `lib/hooks/index.ts`.

---

## Data contracts

No new endpoints in Phase 0. Sanity-check the shapes of existing ones if needed.

---

## Acceptance

Run on a freshly cloned repo:

```
1. pnpm install (frontend) and uv sync / pip install -r requirements.txt (backend)
2. createdb paths && psql paths -c "CREATE EXTENSION IF NOT EXISTS age;"
3. cd backend && alembic upgrade head
4. cd backend && uvicorn app.main:app --reload --port 8001
5. cd frontend && pnpm dev
6. Open http://localhost:3000/dashboard
```

Pass when:

- [ ] No `CHANGE-ME` value appears anywhere in env or code.
- [ ] `git ls-files backend/secrets` returns empty.
- [ ] `git ls-files frontend/src` returns empty.
- [ ] `alembic heads` shows exactly one head.
- [ ] `/dashboard` renders KPI cards with real numbers (zeros are fine — the
      point is that the cards are populated, not empty-state).
- [ ] `/_health` returns `{"status": "ok"}`.
- [ ] Restarting the backend does not break the frontend — TanStack Query
      retries and recovers.

---

## Tasks

| ID | Task |
|---|---|
| PATHS-001 | Rotate and remove committed Google service-account key |
| PATHS-002 | Delete legacy `frontend/src/` directory |
| PATHS-003 | Set real `SECRET_KEY` in `backend/.env`; raise on default in production |
| PATHS-004 | Document Apache AGE setup in `backend/README.md` |
| PATHS-005 | Resolve Alembic multi-head and run `upgrade head` |
| PATHS-006 | Create `frontend/apps/web/.env.local` and `.env.local.example` |
| PATHS-007 | Remove `HAS_BACKEND` flag from `lib/hooks/index.ts` |
| PATHS-008 | Add `/_health` page that pings backend health endpoint |
| PATHS-009 | Verify `/dashboard` renders live data end-to-end |

---

## Risks & rollback

- **Rotating the service-account key** breaks anything that was using Google
  Drive/Calendar/etc. via that key. Audit calls before rotating; if nothing
  uses it, delete and proceed. If something does, issue a new key and update
  the consumer first.
- **Removing `HAS_BACKEND`** will surface previously hidden backend errors. That
  is the point — but expect a short period where pages show error states until
  the underlying endpoints are checked. Do this in a separate PR from other
  changes so it's easy to bisect.
- **Alembic merge migrations** are easy to do wrong. After `alembic merge`,
  inspect the generated file by hand. It should have an empty `upgrade()` and
  `downgrade()`. Never autogenerate a merge — write it manually if needed.
