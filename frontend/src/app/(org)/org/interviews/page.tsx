"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GlossCard } from "@/components/ui/gloss-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { scaleIn } from "@/components/motion/variants";
import { CalendarClock, Loader2, Stethoscope } from "lucide-react";
import { useMe } from "@/components/auth/me-provider";
import { getInterviewAvailability, getInterviewSummary } from "@/lib/api/interviews";
import { LoadingState } from "@/components/states/loading-state";
import { UnauthorizedState } from "@/components/states/unauthorized-state";
import type { InterviewAvailabilityResponse, InterviewSummaryResponse } from "@/types/domain";
import { useRouter } from "next/navigation";
import { ErrorState } from "@/components/states/error-state";

export default function OrgInterviewsPage() {
  const router = useRouter();
  const { user: me, loading: sessionLoading, error: sessionError, refresh } = useMe();
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState<InterviewAvailabilityResponse | null>(null);
  const [interviewId, setInterviewId] = useState("");
  const [summary, setSummary] = useState<InterviewSummaryResponse | null>(null);
  const [fromIso, setFromIso] = useState("");
  const [toIso, setToIso] = useState("");
  const hasValidInterviewId = useMemo(() => /^[0-9a-fA-F-]{36}$/.test(interviewId.trim()), [interviewId]);

  async function fetchAvailability() {
    if (!me?.organization) return;
    setErr(null);
    setLoading(true);
    setAvailability(null);
    try {
      const from = fromIso ? new Date(fromIso).toISOString() : undefined;
      const to = toIso ? new Date(toIso).toISOString() : undefined;
      const res = await getInterviewAvailability({
        organization_id: me.organization.organization_id,
        from_date: from,
        to_date: to,
        slot_minutes: 30,
      });
      setAvailability(res);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function fetchSummary() {
    if (!me?.organization || !hasValidInterviewId) return;
    setErr(null);
    setLoading(true);
    setSummary(null);
    try {
      const res = await getInterviewSummary(interviewId.trim(), me.organization.organization_id);
      setSummary(res);
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

  if (sessionLoading) return <LoadingState label="Loading interviews workspace..." />;
  if (!me && sessionError) return <UnauthorizedState message="Organization membership is required." />;
  if (!me && !sessionError) return <LoadingState label="Loading session..." />;
  if (sessionError) return <ErrorState title="Could not load session" message={sessionError} onRetry={() => refresh()} />;
  if (me && me.account_type !== "organization_member") return <LoadingState label="Redirecting…" />;
  if (!me?.organization) return <ErrorState title="Missing organization membership" onRetry={() => refresh()} />;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <motion.div variants={scaleIn} initial="hidden" animate="show" className="flex items-center gap-2">
        <Stethoscope className="h-6 w-6 text-sky-400" />
        <div>
          <h1 className="text-2xl font-semibold">Interview intelligence</h1>
          <p className="text-sm text-zinc-500">Schedule context and review summaries using real interview APIs.</p>
        </div>
      </motion.div>

      {err && <p className="text-sm text-red-400">{err}</p>}

      <GlossCard glow>
        <div className="mb-3 flex items-center gap-2 text-sky-300">
          <CalendarClock className="h-4 w-4" />
          <h2 className="text-sm font-semibold uppercase tracking-wider">Availability (next window)</h2>
        </div>
        <p className="mb-4 text-xs text-zinc-500">Use optional date window fields. If empty, backend defaults apply.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="From (optional)" type="datetime-local" value={fromIso} onChange={(e) => setFromIso(e.target.value)} />
          <Input label="To (optional)" type="datetime-local" value={toIso} onChange={(e) => setToIso(e.target.value)} />
        </div>
        <Button type="button" className="mt-4" onClick={fetchAvailability} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Get slots
        </Button>
        {availability && availability.slots.length === 0 && <p className="mt-4 text-sm text-zinc-500">No open slots found in this window.</p>}
        {availability && availability.slots.length > 0 && (
          <div className="mt-4 space-y-2">
            {availability.slots.slice(0, 8).map((slot) => (
              <div key={slot.start} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-300">
                {new Date(slot.start).toLocaleString()} - {new Date(slot.end).toLocaleTimeString()} ({slot.timezone})
              </div>
            ))}
          </div>
        )}
      </GlossCard>

      <GlossCard glow>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">Interview summary by ID</h2>
        <p className="mb-3 text-xs text-zinc-500">Requires a valid interview UUID with a generated summary in your organization scope.</p>
        <Input
          label="Interview UUID"
          value={interviewId}
          onChange={(e) => setInterviewId(e.target.value)}
          placeholder="00000000-0000-0000-0000-000000000000"
        />
        {!hasValidInterviewId && interviewId.trim() && <p className="text-xs text-amber-300">Use a valid UUID format.</p>}
        <Button type="button" className="mt-3" onClick={fetchSummary} disabled={loading || !hasValidInterviewId}>
          Load summary
        </Button>
        {summary && (
          <div className="mt-4 space-y-3 rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-zinc-300">
            <p>
              Summary ID: <span className="font-mono text-xs">{summary.id}</span>
            </p>
            <p>Created: {new Date(summary.created_at).toLocaleString()}</p>
            <p className="text-xs text-zinc-400">Summary payload is available and can be expanded in future detailed views.</p>
          </div>
        )}
      </GlossCard>

      <p className="text-center text-xs text-zinc-600">
        <Link href="/org" className="text-sky-400">
          Back to organization
        </Link>{" "}
        · API docs: <span className="text-zinc-500">/docs → Interviews</span>
      </p>
    </div>
  );
}
