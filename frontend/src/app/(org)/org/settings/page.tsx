"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { GlossCard } from "@/components/ui/gloss-card";
import { useMe } from "@/components/auth/me-provider";
import { LoadingState } from "@/components/states/loading-state";
import { ErrorState } from "@/components/states/error-state";

export default function OrgSettingsPage() {
  const router = useRouter();
  const { user, loading, error, refresh } = useMe();

  useEffect(() => {
    if (loading) return;
    if (user && user.account_type !== "organization_member") router.replace("/candidate");
  }, [user, loading, router]);

  if (loading) return <LoadingState label="Loading workspace settings…" />;
  if (error) return <ErrorState title="Could not load workspace" message={error} onRetry={() => refresh()} />;
  if (!user) return <LoadingState label="Loading session…" />;
  if (user.account_type !== "organization_member") return <LoadingState label="Redirecting…" />;

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Workspace</h1>
        <p className="mt-2 text-sm text-zinc-400">Operational context for recruiter efficiency — no fake toggles.</p>
      </div>

      <GlossCard glow>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">API</h2>
        <p className="mt-3 text-sm text-zinc-300">
          Frontend base URL: <span className="font-mono text-xs text-sky-200">{apiBase}</span>
        </p>
        <p className="mt-3 text-sm text-zinc-500">
          If actions fail with network errors, verify Uvicorn is running and `NEXT_PUBLIC_API_BASE_URL` matches the
          server port. Ensure backend `CORS_ORIGINS` includes your UI origin.
        </p>
      </GlossCard>

      <GlossCard>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Organization</h2>
        <p className="mt-3 text-sm text-zinc-300">{user.organization?.organization_name ?? "—"}</p>
        <p className="mt-2 font-mono text-xs text-zinc-500">{user.organization?.organization_id ?? "—"}</p>
        <p className="mt-3 text-sm text-zinc-500">
          Role: <span className="font-mono text-xs text-zinc-300">{user.organization?.role_code ?? "—"}</span>
        </p>
      </GlossCard>
    </div>
  );
}
