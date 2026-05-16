# Conventions for Claude Code

> Read this file at the start of every working session. These rules are the
> ones that **break the codebase silently** when ignored. They restate the
> non-negotiables from `CLAUDE.md` plus a few plan-specific rules.

---

## 0. The cardinal rules (memorize these)

1. **Only work in `frontend/apps/web/src/`.** `frontend/src/` is dead code and
   was deleted in Phase 0. If it reappears, delete it again.
2. **Components never import from `lib/api/*` directly.** Always use a hook
   from `lib/hooks/index.ts`. If the hook doesn't exist, add it.
3. **Every page implements all four states**: loading skeleton, error with
   retry, empty state with CTA, success.
4. **Every backend query that touches org data filters by `org_id`.** No
   exceptions. Tenant isolation tests in Phase 8 will fail your PR otherwise.
5. **`cn()` for class names, never string concatenation.**
6. **Forms = React Hook Form + Zod.** No unvalidated submissions.
7. **Before any migration, `alembic heads`.** Two heads → make a merge first.
8. **Never commit secrets.** `backend/secrets/*` is gitignored; verify before
   pushing.
9. **Backend runs on port 8001.** Not 8000. The blueprint says 8000 — it's
   wrong; `CLAUDE.md` is authoritative.
10. **Import alias `@/`** for `src/` imports, never `../../../` from deep
    nesting.

---

## 1. API layer (3 layers, always)

```
Backend response (snake_case)
        ↓
lib/api/index.ts        ← typed fetch functions, return BackendXxx
        ↓
lib/api/adapters.ts     ← snake_case → camelCase transformation
        ↓
lib/hooks/index.ts      ← TanStack Query hooks
        ↓
Component               ← uses camelCase frontend types only
```

### ✅ Right
```ts
// lib/api/index.ts
export async function getJobById(id: string): Promise<BackendJobDetail> {
  return api.get<BackendJobDetail>(`/api/v1/jobs/${id}`);
}

// lib/hooks/index.ts
export function useJob(id: string) {
  return useQuery({
    queryKey: ["job", id],
    queryFn: () => getJobById(id).then(adaptJobDetail),
    enabled: Boolean(id),
  });
}

// component
const { data: job, isLoading, isError } = useJob(jobId);
```

### ❌ Wrong
```ts
// component — NEVER
import { api } from "@/lib/api/client";
const job = await api.get(`/api/v1/jobs/${id}`);
```

### Mutations
- Use `useMutation` from TanStack Query.
- Invalidate the relevant query keys in `onSuccess`.
- Show optimistic UI when the operation is safe to roll back (drag-and-drop,
  toggles).

---

## 2. Page structure (the only allowed shape)

```tsx
"use client"; // for any (dashboard) or (candidate) page that fetches data

import { useSomething } from "@/lib/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";

export default function SomePage() {
  const { data, isLoading, isError, error, refetch } = useSomething();

  if (isLoading) return <SomeSkeleton />;
  if (isError)   return <ErrorState message={error.message} onRetry={refetch} />;
  if (!data || data.length === 0) {
    return <EmptyState title="…" description="…" cta={{label: "…", href: "…"}} />;
  }
  return <SuccessLayout data={data} />;
}
```

A page that doesn't have all four branches **will fail PR review**.

---

## 3. Backend route shape

```python
# backend/app/api/v1/new_resource.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.account import Account

router = APIRouter(prefix="/api/v1/new-resource", tags=["new-resource"])

@router.get("/{resource_id}")
async def get_resource(
    resource_id: str,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Resource).where(
            Resource.id == resource_id,
            Resource.org_id == current_user.org_id,   # MANDATORY
        )
    )
    resource = result.scalar_one_or_none()
    if resource is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    return resource
```

Then register in `backend/app/main.py`:
```python
from app.api.v1 import new_resource
app.include_router(new_resource.router)
```

---

## 4. Migrations

```bash
cd backend
alembic heads        # MUST show exactly one head
alembic revision --autogenerate -m "describe_change_in_snake_case"
# Open the generated file in alembic/versions/ and inspect by hand
alembic upgrade head
```

When generating fails (Apache AGE tables, JSONB defaults, etc.), write the
migration by hand. Always test downgrade on a throwaway DB before merging.

---

## 5. Styling

- Glass card: `<div className="glass rounded-xl p-5">`.
- Headings: `font-heading text-3xl font-bold tracking-tight`.
- Semantic tokens only:
  ```tsx
  <div className="bg-primary text-primary-foreground" />
  <div className="bg-muted text-muted-foreground" />
  ```
  Never hex. Never RGB.
- Conditional classes via `cn()`:
  ```tsx
  <div className={cn("base", isActive && "border-primary")} />
  ```

---

## 6. State management

| State type | Tool |
|---|---|
| Server data | TanStack Query |
| Form state | React Hook Form + Zod |
| Ephemeral UI | Zustand (small slices) |
| Auth session | Zustand + localStorage (existing `paths-auth` key) |
| Real-time | WebSocket / SSE (interview transcripts) |

Don't introduce Redux, Recoil, Jotai, MobX. The stack is fixed.

---

## 7. Component imports (order matters for review hygiene)

```ts
// 1. React
import { useState } from "react";
// 2. Next
import Link from "next/link";
// 3. Third-party
import { useQuery } from "@tanstack/react-query";
// 4. Lucide icons
import { Briefcase } from "lucide-react";
// 5. Internal UI
import { Button } from "@/components/ui/button";
// 6. Internal shared/feature
import { EmptyState } from "@/components/shared/EmptyState";
// 7. Internal hooks/stores/utils
import { useJobs } from "@/lib/hooks";
import { cn } from "@/lib/utils/cn";
// 8. Types
import type { Job } from "@/types";
```

---

## 8. File naming

| Type | Convention |
|---|---|
| Next.js page | `page.tsx` |
| Next.js layout | `layout.tsx` |
| React component | `PascalCase.tsx` |
| Hook file | `use-kebab.ts` or block in `hooks/index.ts` |
| Backend router | `snake_case.py` |
| Backend model | `snake_case.py` |
| Alembic migration | autogenerated name from message |

---

## 9. Allowed libraries

**Frontend:** shadcn/ui, TanStack Query, TanStack Table v8, Recharts,
@dnd-kit (core + sortable), React Hook Form, Zod, Framer Motion, Lucide,
date-fns + react-day-picker, Tiptap (or Quill — pick one), next/image,
next/font.

**Backend:** FastAPI, SQLAlchemy (async), Alembic, Pydantic v2, LangGraph,
LangChain core, OpenRouter client, qdrant-client, age (Apache AGE),
structlog, prometheus-fastapi-instrumentator, opentelemetry, stripe,
sendgrid (or any one provider behind a single interface),
python-jose / pyjwt, argon2-cffi, passlib.

If you need anything not on these lists, file an issue first.

---

## 10. PR hygiene

- Title format: `[PATHS-###] short imperative description`.
- Body must include:
  - A screenshot or GIF of new UI (if frontend).
  - The smoke-test result from the phase file.
  - A checklist of 4-state coverage.
  - "Risks" if anything outside the touched files might be affected.
- One cohesive change per PR. "Phase 1" is too big; "Job Detail Hub shell"
  is right.
- Squash-merge. The PR title becomes the squash commit.

---

## 11. Quick-reference: things that have caused incidents

| Mistake | Symptom | Fix |
|---|---|---|
| Missing `.env.local` (`NEXT_PUBLIC_API_URL`) | Org dashboard empty | Phase 0 |
| Calling `api.*` from a component | Snake_case bleeds into UI | Use a hook |
| Skipping `org_id` filter | Cross-tenant data leak | Add tenant test |
| `alembic upgrade head` with 2 heads | Migration loops or errors | `alembic merge` |
| Drag-and-drop without optimistic rollback | Cards reset on server reject | `onMutate` snapshot |
| Polling forever | Tabs frozen, $$ on LLM calls | `refetchInterval: false` when done |
| Inline CSS or `style={{...}}` | Inconsistent with design system | Tailwind tokens only |

---

## 12. Claude Code session kickoff

At the start of a coding session, **attach** (or `@` reference) in this order:

1. [`CLAUDE.md`](../../CLAUDE.md) — repo layout and stack.
2. [`00_MASTER_PLAN.md`](00_MASTER_PLAN.md) — which phase you are in.
3. This file (`10_CONVENTIONS_FOR_CLAUDE_CODE.md`).
4. **Exactly one** phase work order, e.g. [`01_PHASE_0_FOUNDATIONS.md`](01_PHASE_0_FOUNDATIONS.md) or [`02_PHASE_1_JOB_HUB_AND_PIPELINE.md`](02_PHASE_1_JOB_HUB_AND_PIPELINE.md).

Then prompt in one sentence: *Implement only this phase file end-to-end; use task IDs from [`11_TASK_INDEX.md`](11_TASK_INDEX.md) in commit messages (`PATHS-###: …`); run the phase **Acceptance** checklist before opening the next phase.*
