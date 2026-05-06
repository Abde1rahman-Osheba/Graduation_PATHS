"use client";

import { GlossCard } from "@/components/ui/gloss-card";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Play, Upload } from "lucide-react";
import { useMe } from "@/components/auth/me-provider";
import { UnauthorizedState } from "@/components/states/unauthorized-state";
import { LoadingState } from "@/components/states/loading-state";
import { ErrorState } from "@/components/states/error-state";
import { EmptyState } from "@/components/states/empty-state";
import type { IngestionJob, ScoreList } from "@/types/domain";
import { getIngestionJob, uploadCandidateCv } from "@/lib/api/candidate";
import { getCandidateScores, runCandidateScoring } from "@/lib/api/scoring";
import { useRouter } from "next/navigation";

export default function CandidatePage() {
  const router = useRouter();
  const { user: me, loading: sessionLoading, error: sessionError, refresh } = useMe();
  const [err, setErr] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [ingestJob, setIngestJob] = useState<string | null>(null);
  const [ingestStatus, setIngestStatus] = useState<IngestionJob | null>(null);
  const [scores, setScores] = useState<ScoreList | null>(null);
  const [scoreBusy, setScoreBusy] = useState(false);

  const loadScores = useCallback(async () => {
    if (!me?.candidate_profile?.id) return;
    const s = await getCandidateScores(me.candidate_profile.id);
    setScores(s);
  }, [me?.candidate_profile?.id]);

  useEffect(() => {
    if (sessionLoading) return;
    if (me && me.account_type !== "candidate") router.replace("/org");
  }, [me, router, sessionLoading]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!me || me.account_type !== "candidate") return;
    loadScores().catch((e) => setErr(e instanceof Error ? e.message : "Failed to load scores"));
  }, [loadScores, me, sessionLoading]);

  useEffect(() => {
    if (!ingestJob) return;
    const t = setInterval(() => {
      getIngestionJob(ingestJob)
        .then(setIngestStatus)
        .catch(() => {});
    }, 2000);
    return () => clearInterval(t);
  }, [ingestJob]);

  async function uploadCv(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !me?.candidate_profile?.id) return;
    setErr(null);
    try {
      const j = await uploadCandidateCv(me.candidate_profile.id, file);
      setIngestJob(j.job_id);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Upload failed");
    }
  }

  async function runScoring() {
    if (!me?.candidate_profile?.id) return;
    setScoreBusy(true);
    setErr(null);
    try {
      await runCandidateScoring(me.candidate_profile.id);
      await loadScores();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Scoring failed");
    } finally {
      setScoreBusy(false);
    }
  }

  if (sessionLoading) return <LoadingState label="Loading candidate workspace..." />;
  if (!me && sessionError) return <UnauthorizedState message="Sign in with a candidate account to continue." />;
  if (!me && !sessionError) return <LoadingState label="Loading session..." />;
  if (sessionError) return <ErrorState title="Could not load session" message={sessionError} onRetry={() => refresh()} />;
  if (me && me.account_type !== "candidate") return <LoadingState label="Redirecting…" />;
  if (!me?.candidate_profile) return <ErrorState title="Missing candidate profile" onRetry={() => refresh()} />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold">Candidate</h1>
          <p className="mt-1 text-sm text-zinc-500">{me.full_name} · profile <code className="rounded bg-white/5 px-1.5 py-0.5 text-xs">{me.candidate_profile.id}</code></p>
        </div>
      </div>

      {err && <p className="text-sm text-red-400" role="alert">{err}</p>}

      <GlossCard glow>
        <div className="mb-4 flex items-center gap-2">
          <Upload className="h-4 w-4 text-sky-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Upload CV</h2>
        </div>
        <p className="mb-4 text-xs text-zinc-500">PDF, DOCX, or TXT. Processing is asynchronous.</p>
        <form onSubmit={uploadCv} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 cursor-pointer rounded-xl border border-dashed border-white/15 bg-black/20 px-4 py-3 text-sm text-zinc-400 transition hover:border-sky-500/40">
            <input
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? file.name : "Choose file"}
          </label>
          <Button type="submit" disabled={!file}>
            Upload
          </Button>
        </form>
        <AnimatePresence mode="wait">
          {ingestStatus && (
            <motion.pre
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0 }}
              className="mt-4 overflow-x-auto rounded-lg bg-black/40 p-3 text-xs text-zinc-400"
            >
              Status: {ingestStatus.status}{"\n"}Stage: {ingestStatus.stage}
              {ingestStatus.error_message ? `\nError: ${ingestStatus.error_message}` : ""}
            </motion.pre>
          )}
        </AnimatePresence>
      </GlossCard>

      <GlossCard glow>
        <div className="mb-4 flex items-center gap-2">
          <Play className="h-4 w-4 text-violet-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Scoring</h2>
        </div>
        <p className="mb-4 text-xs text-zinc-500">Llama + vector similarity over active jobs.</p>
        <Button type="button" onClick={runScoring} disabled={scoreBusy} className="mb-6">
          {scoreBusy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Scoring…
            </>
          ) : (
            "Run scoring"
          )}
        </Button>

        {scores && scores.items.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-500">
                  <th className="p-3">Job</th>
                  <th className="p-3">Company</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Class</th>
                </tr>
              </thead>
              <tbody>
                {scores.items.map((r, i) => (
                  <motion.tr
                    key={r.job_id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b border-white/5"
                  >
                    <td className="p-3 text-zinc-200">{r.job_title ?? r.job_id}</td>
                    <td className="p-3 text-zinc-500">{r.company_name ?? "—"}</td>
                    <td className="p-3 font-mono text-sky-300">{r.final_score.toFixed(1)}</td>
                    <td className="p-3 text-zinc-500">{r.match_classification ?? r.recommendation ?? "—"}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {scores && scores.items.length === 0 && (
          <EmptyState title="No scores yet" description="Upload your CV, then run scoring to see job matches." />
        )}
      </GlossCard>

    </div>
  );
}
