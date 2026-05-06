"use client";

import { GlossCard } from "@/components/ui/gloss-card";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ListTree } from "lucide-react";
import { getMatchingRun, getMatchingShortlist } from "@/lib/api/matching";
import { LoadingState } from "@/components/states/loading-state";
import { ErrorState } from "@/components/states/error-state";
import { EmptyState } from "@/components/states/empty-state";
import { UnauthorizedState } from "@/components/states/unauthorized-state";
import { useMe } from "@/components/auth/me-provider";

export default function OrgRunPage() {
  const router = useRouter();
  const { user: me, loading: sessionLoading, error: sessionError, refresh } = useMe();
  const params = useParams<{ runId: string }>();
  const runId = params.runId;
  const [run, setRun] = useState<Record<string, unknown> | null>(null);
  const [shortlist, setShortlist] = useState<unknown[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionLoading) return;
    if (me && me.account_type !== "organization_member") router.replace("/candidate");
  }, [me, router, sessionLoading]);

  useEffect(() => {
    if (!runId) return;
    if (sessionLoading) return;
    if (!me || me.account_type !== "organization_member" || !me.organization) return;

    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const r = await getMatchingRun(runId);
        setRun(r);
        const sl = await getMatchingShortlist(runId);
        setShortlist(sl.shortlist ?? []);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [runId, sessionLoading, me]);

  if (!runId) {
    return <p className="text-sm text-zinc-500">Invalid run.</p>;
  }

  if (sessionLoading) return <LoadingState label="Loading organization context..." />;
  if (!me && sessionError) return <UnauthorizedState message="Organization membership is required." />;
  if (!me && !sessionError) return <LoadingState label="Loading session..." />;
  if (sessionError) return <ErrorState title="Could not load session" message={sessionError} onRetry={() => refresh()} />;
  if (me && me.account_type !== "organization_member") return <LoadingState label="Redirecting…" />;
  if (!me?.organization) return <ErrorState title="Missing organization membership" onRetry={() => refresh()} />;

  if (loading) return <LoadingState label="Loading run details..." />;
  if (err && !run) return <ErrorState message={err} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Matching run</h1>
        <p className="mt-1 font-mono text-xs text-zinc-500">{runId}</p>
        {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
      </div>

      {run && (
        <GlossCard glow>
          <div className="mb-2 flex items-center gap-2 text-zinc-400">
            <h2 className="text-xs font-semibold uppercase tracking-wider">Run summary</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Status</p>
              <p className="mt-1 text-sm text-zinc-200">{String(run.status ?? "unknown")}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Job ID</p>
              <p className="mt-1 truncate text-sm text-zinc-200">{String(run.job_id ?? "n/a")}</p>
            </div>
          </div>
        </GlossCard>
      )}

      <GlossCard glow>
        <div className="mb-2 flex items-center gap-2 text-zinc-400">
          <ListTree className="h-4 w-4" />
          <h2 className="text-xs font-semibold uppercase tracking-wider">Anonymised shortlist</h2>
        </div>
        {shortlist && shortlist.length === 0 && <EmptyState title="No shortlist entries yet" description="Try another search with broader skills or a larger Top-K value." />}
        {shortlist && shortlist.length > 0 && (
          <div className="space-y-3">
            {shortlist.map((item, index) => {
              const record = item as Record<string, unknown>;
              return (
                <div key={String(record.candidate_id ?? index)} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-sm font-medium text-zinc-100">Candidate {index + 1}</p>
                  <p className="mt-1 text-xs text-zinc-500">Alias: {String(record.alias ?? record.candidate_alias ?? "n/a")}</p>
                  <p className="mt-1 text-xs text-zinc-400">Score: {String(record.score ?? record.final_score ?? "n/a")}</p>
                </div>
              );
            })}
          </div>
        )}
      </GlossCard>

      <p className="text-center text-sm text-zinc-600">
        <Link href="/org/matching" className="text-sky-400 hover:underline">
          New search
        </Link>
        {" · "}
        <Link href="/org" className="text-sky-400 hover:underline">
          Organisation
        </Link>
      </p>
    </div>
  );
}
