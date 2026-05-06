"use client";

import { GlossCard } from "@/components/ui/gloss-card";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Building2, ChevronRight } from "lucide-react";
import { fadeInUp, staggerContainer } from "@/components/motion/variants";
import { useMe } from "@/components/auth/me-provider";
import { getOrganizationJobs } from "@/lib/api/organization";
import type { JobRow } from "@/types/domain";
import { LoadingState } from "@/components/states/loading-state";
import { UnauthorizedState } from "@/components/states/unauthorized-state";
import { ErrorState } from "@/components/states/error-state";
import { EmptyState } from "@/components/states/empty-state";
import { useRouter } from "next/navigation";

export default function OrgPage() {
  const router = useRouter();
  const { user: me, loading: sessionLoading, error: sessionError, refresh } = useMe();
  const [jobs, setJobs] = useState<JobRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!me?.organization?.organization_id) return;
    const j = await getOrganizationJobs(me.organization.organization_id);
    setJobs(j);
  }, [me?.organization?.organization_id]);

  useEffect(() => {
    load().catch((e) => setErr(e instanceof Error ? e.message : "Failed to load jobs"));
  }, [load]);

  useEffect(() => {
    if (sessionLoading) return;
    if (me && me.account_type !== "organization_member") router.replace("/candidate");
  }, [me, router, sessionLoading]);

  if (sessionLoading) return <LoadingState label="Loading organization workspace..." />;
  if (!me && sessionError) return <UnauthorizedState message="Sign in with an organization account to continue." />;
  if (me && me.account_type !== "organization_member") return <LoadingState label="Redirecting…" />;
  if (!me?.organization) return <ErrorState title="Missing organization membership" onRetry={() => refresh()} />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sky-400">
          <Building2 className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-widest">Organization</span>
        </div>
        <h1 className="text-2xl font-semibold">{me.organization.organization_name}</h1>
        <p className="text-sm text-zinc-500">Role <code className="rounded bg-white/5 px-1.5 text-xs">{me.organization.role_code}</code> · id <code className="rounded bg-white/5 px-1.5 text-xs">{me.organization.organization_id}</code></p>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <Link
            href="/org/matching"
            className="inline-flex items-center gap-1 text-sm font-medium text-sky-400 transition hover:gap-2"
          >
            Run candidate matching
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            href="/org/screening"
            className="inline-flex items-center gap-1 text-sm font-medium text-amber-300 transition hover:gap-2"
          >
            Screen candidates
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            href="/org/interviews"
            className="inline-flex items-center gap-1 text-sm font-medium text-violet-300 transition hover:gap-2"
          >
            Interview intelligence
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            href="/org/decision-support"
            className="inline-flex items-center gap-1 text-sm font-medium text-emerald-300/90 transition hover:gap-2"
          >
            Decision support (DSS)
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <GlossCard glow>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Jobs in database</h2>
        {jobs === null && <LoadingState label="Loading jobs..." />}
        {jobs && jobs.length === 0 && (
          <EmptyState title="No jobs yet" description="Use backend ingestion or scraper endpoints to add jobs, then return to this dashboard." />
        )}
        {jobs && jobs.length > 0 && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="mt-4 space-y-2"
          >
            {jobs.map((j, i) => (
              <motion.div
                key={j.id}
                custom={i}
                variants={fadeInUp}
                className="flex flex-col gap-1 rounded-xl border border-white/5 bg-black/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-zinc-200">{j.title}</p>
                  <p className="text-xs text-zinc-500">
                    {j.company_name ?? "—"} · {j.location_text || j.location_mode || "—"}
                  </p>
                </div>
                <span className="text-xs text-zinc-600">{j.status}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </GlossCard>
    </div>
  );
}
