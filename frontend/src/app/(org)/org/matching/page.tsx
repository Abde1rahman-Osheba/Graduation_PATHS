"use client";

import { GlossCard } from "@/components/ui/gloss-card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { scaleIn } from "@/components/motion/variants";
import { Loader2, Search } from "lucide-react";
import { useMe } from "@/components/auth/me-provider";
import { createDatabaseMatchRun } from "@/lib/api/matching";
import { LoadingState } from "@/components/states/loading-state";
import { UnauthorizedState } from "@/components/states/unauthorized-state";
import { ErrorState } from "@/components/states/error-state";

export default function OrgMatchingPage() {
  const router = useRouter();
  const { user: me, loading: sessionLoading, error: sessionError, refresh } = useMe();
  const [title, setTitle] = useState("Senior Backend Engineer");
  const [summary, setSummary] = useState("");
  const [requiredSkills, setRequiredSkills] = useState("Python, PostgreSQL, FastAPI");
  const [topK, setTopK] = useState(5);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!me?.organization) return;
    setErr(null);
    setLoading(true);
    const skills = requiredSkills
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const res = await createDatabaseMatchRun({
        organization_id: me.organization.organization_id,
        top_k: topK,
        job: {
          title,
          summary: summary || null,
          required_skills: skills,
          preferred_skills: [],
          employment_type: "full_time",
        },
      });
      if (!res.matching_run_id) throw new Error("No run id");
      router.push(`/org/runs/${res.matching_run_id}`);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Match failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (sessionLoading) return;
    if (me && me.account_type !== "organization_member") router.replace("/candidate");
  }, [me, router, sessionLoading]);

  if (sessionLoading) return <LoadingState label="Loading organization context..." />;
  if (!me && sessionError) return <UnauthorizedState message="Sign in with an organization account first." />;
  if (!me && !sessionError) return <LoadingState label="Loading session..." />;
  if (sessionError) return <ErrorState title="Could not load session" message={sessionError} onRetry={() => refresh()} />;
  if (me && me.account_type !== "organization_member") return <LoadingState label="Redirecting…" />;
  if (!me?.organization) return <ErrorState title="Missing organization membership" onRetry={() => refresh()} />;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <motion.div variants={scaleIn} initial="hidden" animate="show" className="flex items-center gap-2">
        <Search className="h-5 w-5 text-sky-400" />
        <div>
          <h1 className="text-2xl font-semibold">Database search</h1>
          <p className="text-sm text-zinc-500">Ranked shortlist with anonymised preview.</p>
        </div>
      </motion.div>
      <GlossCard glow>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Job title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea label="Summary (optional)" value={summary} onChange={(e) => setSummary(e.target.value)} />
          <Input
            label="Required skills (comma-separated)"
            value={requiredSkills}
            onChange={(e) => setRequiredSkills(e.target.value)}
          />
          <Input
            type="number"
            label="Top K"
            min={1}
            max={20}
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value))}
          />
          {err && <p className="text-sm text-red-400">{err}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running…
              </>
            ) : (
              "Run search"
            )}
          </Button>
        </form>
      </GlossCard>
      <p className="text-center text-xs text-zinc-600">
        <Link href="/org" className="text-sky-400/80 hover:text-sky-400">
          Back to org
        </Link>
      </p>
    </div>
  );
}
