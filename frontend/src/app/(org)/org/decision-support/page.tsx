"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GlossCard } from "@/components/ui/gloss-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { scaleIn } from "@/components/motion/variants";
import { FileText, Loader2, Scale } from "lucide-react";
import { useMe } from "@/components/auth/me-provider";
import { LoadingState } from "@/components/states/loading-state";
import { UnauthorizedState } from "@/components/states/unauthorized-state";
import { generateDecisionPacket, getLatestDecisionPacket } from "@/lib/api/decisionSupport";
import type { DecisionSupportGenerateResponse, DecisionSupportLatestResponse } from "@/types/domain";
import { useRouter } from "next/navigation";
import { ErrorState } from "@/components/states/error-state";

export default function OrgDecisionSupportPage() {
  const router = useRouter();
  const { user: me, loading: sessionLoading, error: sessionError, refresh } = useMe();
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [applicationId, setApplicationId] = useState("");
  const [candidateId, setCandidateId] = useState("");
  const [jobId, setJobId] = useState("");
  const [latestAppId, setLatestAppId] = useState("");
  const [generated, setGenerated] = useState<DecisionSupportGenerateResponse | null>(null);
  const [latest, setLatest] = useState<DecisionSupportLatestResponse | null>(null);

  const validGenerateInput = useMemo(
    () => [applicationId, candidateId, jobId].every((x) => /^[0-9a-fA-F-]{36}$/.test(x.trim())),
    [applicationId, candidateId, jobId],
  );
  const validLatestInput = useMemo(() => /^[0-9a-fA-F-]{36}$/.test(latestAppId.trim()), [latestAppId]);

  async function generatePacket() {
    if (!me?.organization) return;
    if (!validGenerateInput) {
      setErr("Fill valid application, candidate, and job UUIDs.");
      return;
    }
    setErr(null);
    setLoading(true);
    setGenerated(null);
    try {
      const res = await generateDecisionPacket(me.organization.organization_id, {
        application_id: applicationId.trim(),
        candidate_id: candidateId.trim(),
        job_id: jobId.trim(),
      });
      setGenerated(res);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function fetchLatest() {
    if (!me?.organization || !validLatestInput) return;
    setErr(null);
    setLoading(true);
    setLatest(null);
    try {
      const res = await getLatestDecisionPacket(latestAppId.trim(), me.organization.organization_id);
      setLatest(res);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (sessionLoading) return;
    if (me && me.account_type !== "organization_member") router.replace("/candidate");
  }, [me, router, sessionLoading]);

  if (sessionLoading) return <LoadingState label="Loading decision support workspace..." />;
  if (!me && sessionError) return <UnauthorizedState message="Organization membership is required." />;
  if (!me && !sessionError) return <LoadingState label="Loading session..." />;
  if (sessionError) return <ErrorState title="Could not load session" message={sessionError} onRetry={() => refresh()} />;
  if (me && me.account_type !== "organization_member") return <LoadingState label="Redirecting…" />;
  if (!me?.organization) return <ErrorState title="Missing organization membership" onRetry={() => refresh()} />;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <motion.div variants={scaleIn} initial="hidden" animate="show" className="flex items-center gap-2">
        <Scale className="h-6 w-6 text-violet-400" />
        <div>
          <h1 className="text-2xl font-semibold">Decision support</h1>
          <p className="text-sm text-zinc-500">Generate and review explainable decision packets from real backend contracts.</p>
        </div>
      </motion.div>

      {err && <p className="text-sm text-red-400">{err}</p>}

      <GlossCard glow>
        <div className="mb-2 flex items-center gap-2 text-violet-300">
          <FileText className="h-4 w-4" />
          <h2 className="text-sm font-semibold uppercase tracking-wider">Generate packet</h2>
        </div>
        <p className="mb-3 text-xs text-zinc-500">All IDs must be valid UUIDs and belong to the same real application context.</p>
        <div className="space-y-3">
          <Input label="Application UUID" value={applicationId} onChange={(e) => setApplicationId(e.target.value)} />
          <Input label="Candidate UUID" value={candidateId} onChange={(e) => setCandidateId(e.target.value)} />
          <Input label="Job UUID" value={jobId} onChange={(e) => setJobId(e.target.value)} />
        </div>
        {!validGenerateInput && (applicationId || candidateId || jobId) && (
          <p className="mt-3 text-xs text-amber-300">Enter valid UUID values before generating.</p>
        )}
        <Button type="button" className="mt-4" onClick={generatePacket} disabled={loading || !validGenerateInput}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Generate
        </Button>
        {generated && (
          <div className="mt-4 rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-zinc-300">
            <p className="font-mono text-xs text-zinc-400">Packet ID: {generated.packet_id}</p>
            <p className="mt-1">Recommendation: {generated.recommendation ?? "n/a"}</p>
            <p className="mt-1">Journey score: {generated.final_journey_score ?? "n/a"}</p>
          </div>
        )}
      </GlossCard>

      <GlossCard glow>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">Latest packet for application</h2>
        <Input
          label="Application UUID"
          value={latestAppId}
          onChange={(e) => setLatestAppId(e.target.value)}
        />
        {!validLatestInput && latestAppId.trim() && <p className="mt-2 text-xs text-amber-300">Application ID must be a valid UUID.</p>}
        <Button type="button" className="mt-3" onClick={fetchLatest} disabled={loading || !validLatestInput}>
          Load latest
        </Button>
        {latest && (
          <div className="mt-4 rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-zinc-300">
            <p className="font-mono text-xs text-zinc-400">Packet ID: {latest.packet_id}</p>
            <p className="mt-1">Recommendation: {latest.recommendation ?? "n/a"}</p>
            <p className="mt-1">Journey score: {latest.final_journey_score ?? "n/a"}</p>
          </div>
        )}
      </GlossCard>

      <p className="text-center text-xs text-zinc-600">
        <Link href="/org" className="text-sky-400">
          Back to organization
        </Link>
      </p>
    </div>
  );
}
