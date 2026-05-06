"use client";

import { GlossCard } from "@/components/ui/gloss-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { scaleIn } from "@/components/motion/variants";
import {
  Loader2,
  Shield,
  Upload,
  Database,
  ChevronDown,
  ChevronUp,
  Trophy,
  Target,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Minus,
} from "lucide-react";
import { useMe } from "@/components/auth/me-provider";
import { LoadingState } from "@/components/states/loading-state";
import { UnauthorizedState } from "@/components/states/unauthorized-state";
import { ErrorState } from "@/components/states/error-state";
import {
  screenJobFromDatabase,
  screenJobFromCSV,
  type ScreeningRunResponse,
  type ScreeningResultItem,
} from "@/lib/api/screening";
import { getScreeningResultDetail, type ScreeningResultDetail } from "@/lib/api/screening";
import { apiFetch } from "@/lib/api";

/* ── helpers ───────────────────────────────────────────────────────── */

const RECOMMENDATION_COLORS: Record<string, string> = {
  strong_match: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  good_match: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  possible_match: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  weak_match: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  not_recommended: "bg-red-500/20 text-red-300 border-red-500/30",
};

function RecommendationBadge({ rec }: { rec: string | null }) {
  if (!rec) return null;
  const label = rec.replace(/_/g, " ");
  const cls = RECOMMENDATION_COLORS[rec] ?? "bg-zinc-700 text-zinc-300 border-zinc-600";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {label}
    </span>
  );
}

function ScoreBar({ score, label, color }: { score: number; label: string; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="font-mono text-zinc-300">{score.toFixed(1)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, score)}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function SkillChips({ skills, variant }: { skills: string[]; variant: "green" | "red" }) {
  if (!skills.length) return null;
  const base =
    variant === "green"
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      : "bg-red-500/10 text-red-400 border-red-500/20";
  return (
    <div className="flex flex-wrap gap-1.5">
      {skills.slice(0, 8).map((s) => (
        <span key={s} className={`inline-flex rounded border px-2 py-0.5 text-[11px] ${base}`}>
          {s}
        </span>
      ))}
      {skills.length > 8 && (
        <span className="text-xs text-zinc-500">+{skills.length - 8} more</span>
      )}
    </div>
  );
}

/* ── result card ───────────────────────────────────────────────────── */

function ResultCard({
  item,
  runId,
  isTopK,
}: {
  item: ScreeningResultItem;
  runId: string;
  isTopK: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<ScreeningResultDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const toggleExpand = useCallback(async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (!detail) {
      setLoadingDetail(true);
      try {
        const d = await getScreeningResultDetail(runId, item.result_id);
        setDetail(d);
      } catch {
        // silently fail
      } finally {
        setLoadingDetail(false);
      }
    }
  }, [expanded, detail, runId, item.result_id]);

  const rankIcon =
    item.rank_position === 1 ? (
      <Trophy className="h-5 w-5 text-amber-400" />
    ) : item.rank_position === 2 ? (
      <Trophy className="h-5 w-5 text-zinc-300" />
    ) : item.rank_position === 3 ? (
      <Trophy className="h-5 w-5 text-orange-400" />
    ) : (
      <Target className="h-4 w-4 text-zinc-500" />
    );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <GlossCard glow={isTopK}>
        {/* Header */}
        <button
          onClick={toggleExpand}
          className="flex w-full items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800/80 text-sm font-bold text-zinc-300">
              {item.rank_position ?? "-"}
            </div>
            {rankIcon}
            <div>
              <h3 className="font-semibold text-zinc-100">{item.blind_label}</h3>
              <p className="text-xs text-zinc-500">
                {item.match_classification?.replace(/_/g, " ") ?? "unclassified"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <RecommendationBadge rec={item.recommendation} />
            <div className="text-right">
              <div className="text-lg font-bold text-zinc-100">
                {item.final_score.toFixed(1)}
              </div>
              <div className="text-[10px] text-zinc-500">SCORE</div>
            </div>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-zinc-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-500" />
            )}
          </div>
        </button>

        {/* Score bars (always visible) */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <ScoreBar score={item.agent_score} label="LLM Score" color="bg-sky-500" />
          <ScoreBar
            score={item.vector_similarity_score}
            label="Vector Similarity"
            color="bg-purple-500"
          />
        </div>

        {/* Expanded detail */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              {loadingDetail ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-sky-400" />
                </div>
              ) : detail ? (
                <div className="mt-4 space-y-4 border-t border-zinc-800 pt-4">
                  {/* Matched skills */}
                  {detail.matched_skills.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-zinc-400">
                        ✓ Matched Skills
                      </p>
                      <SkillChips skills={detail.matched_skills} variant="green" />
                    </div>
                  )}

                  {/* Missing skills */}
                  {detail.missing_required_skills.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-zinc-400">
                        ✗ Missing Required Skills
                      </p>
                      <SkillChips skills={detail.missing_required_skills} variant="red" />
                    </div>
                  )}

                  {/* Strengths & weaknesses */}
                  <div className="grid grid-cols-2 gap-3">
                    {detail.strengths.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-emerald-400">Strengths</p>
                        <ul className="space-y-0.5">
                          {detail.strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-1 text-xs text-zinc-400">
                              <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {detail.weaknesses.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-red-400">Weaknesses</p>
                        <ul className="space-y-0.5">
                          {detail.weaknesses.map((w, i) => (
                            <li key={i} className="flex items-start gap-1 text-xs text-zinc-400">
                              <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-red-500" />
                              {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Explanation */}
                  {detail.explanation && (
                    <div className="rounded-lg bg-zinc-900/60 p-3">
                      <p className="mb-1 text-xs font-medium text-zinc-400">AI Explanation</p>
                      <p className="text-xs leading-relaxed text-zinc-300">{detail.explanation}</p>
                    </div>
                  )}

                  {/* Criteria breakdown */}
                  {detail.criteria_breakdown && (
                    <div>
                      <p className="mb-2 text-xs font-medium text-zinc-400">Score Breakdown</p>
                      <div className="space-y-2">
                        {Object.entries(detail.criteria_breakdown).map(([key, val]) => (
                          <div key={key}>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-zinc-400 capitalize">
                                {key.replace(/_/g, " ")}
                              </span>
                              <span className="font-mono text-zinc-300">
                                {val.score}/{val.max_score}
                              </span>
                            </div>
                            <div className="h-1 overflow-hidden rounded-full bg-zinc-800">
                              <div
                                className="h-full rounded-full bg-sky-500/70"
                                style={{
                                  width: `${val.max_score > 0 ? (val.score / val.max_score) * 100 : 0}%`,
                                }}
                              />
                            </div>
                            {val.reason && (
                              <p className="mt-0.5 text-[10px] text-zinc-500">{val.reason}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </GlossCard>
    </motion.div>
  );
}

/* ── main page ─────────────────────────────────────────────────────── */

export default function ScreeningPage() {
  const router = useRouter();
  const { user: me, loading: sessionLoading, error: sessionError, refresh } = useMe();

  // Form state
  const [jobId, setJobId] = useState("");
  const [topK, setTopK] = useState(10);
  const [source, setSource] = useState<"database" | "csv_upload">("database");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Jobs list
  const [jobs, setJobs] = useState<{ id: string; title: string; company_name: string | null }[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  // Run state
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<ScreeningRunResponse | null>(null);

  // Load org jobs
  useEffect(() => {
    if (!me?.organization) return;
    setJobsLoading(true);
    apiFetch<{ jobs: { id: string; title: string; company_name: string | null }[] }>(
      `/api/v1/organizations/${me.organization.organization_id}/jobs`
    )
      .then((res) => {
        setJobs(res.jobs || []);
        if (res.jobs?.length) setJobId(res.jobs[0].id);
      })
      .catch(() => {})
      .finally(() => setJobsLoading(false));
  }, [me]);

  // Auth gates
  useEffect(() => {
    if (sessionLoading) return;
    if (me && me.account_type !== "organization_member") router.replace("/candidate");
  }, [me, router, sessionLoading]);

  if (sessionLoading) return <LoadingState label="Loading organization context..." />;
  if (!me && sessionError)
    return <UnauthorizedState message="Sign in with an organization account first." />;
  if (!me && !sessionError) return <LoadingState label="Loading session..." />;
  if (sessionError)
    return <ErrorState title="Could not load session" message={sessionError} onRetry={() => refresh()} />;
  if (me && me.account_type !== "organization_member") return <LoadingState label="Redirecting…" />;
  if (!me?.organization)
    return <ErrorState title="Missing organization membership" onRetry={() => refresh()} />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!me?.organization || !jobId) return;
    setErr(null);
    setLoading(true);
    setRunResult(null);

    try {
      let res: ScreeningRunResponse;
      if (source === "csv_upload" && csvFile) {
        res = await screenJobFromCSV({
          job_id: jobId,
          organization_id: me.organization.organization_id,
          top_k: topK,
          csvFile,
        });
      } else {
        res = await screenJobFromDatabase({
          job_id: jobId,
          organization_id: me.organization.organization_id,
          top_k: topK,
        });
      }
      setRunResult(res);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Screening failed");
    } finally {
      setLoading(false);
    }
  }

  const results = runResult?.results ?? [];
  const shortlisted = results.filter((r) => r.rank_position != null && r.rank_position <= topK);

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-12">
      {/* Header */}
      <motion.div variants={scaleIn} initial="hidden" animate="show" className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-sky-400" />
        <div>
          <h1 className="text-2xl font-semibold">Screening Agent</h1>
          <p className="text-sm text-zinc-500">
            Score &amp; rank all candidates for a job — anonymized, bias-free.
          </p>
        </div>
      </motion.div>

      {/* Form */}
      <GlossCard glow>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Job selector */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">Job</label>
            {jobsLoading ? (
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading jobs…
              </div>
            ) : jobs.length > 0 ? (
              <select
                id="screening-job-select"
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} {j.company_name ? `— ${j.company_name}` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                label=""
                placeholder="Paste a Job ID (UUID)"
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                required
              />
            )}
          </div>

          {/* Source toggle */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">Candidate Source</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSource("database")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                  source === "database"
                    ? "border-sky-500/50 bg-sky-500/10 text-sky-300"
                    : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                <Database className="h-4 w-4" />
                Database
              </button>
              <button
                type="button"
                onClick={() => setSource("csv_upload")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                  source === "csv_upload"
                    ? "border-sky-500/50 bg-sky-500/10 text-sky-300"
                    : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                <Upload className="h-4 w-4" />
                Upload CSV
              </button>
            </div>
          </div>

          {/* CSV upload */}
          {source === "csv_upload" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">CSV File</label>
              <div
                onClick={() => fileRef.current?.click()}
                className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-zinc-700 bg-zinc-900/50 px-4 py-6 text-sm text-zinc-400 transition hover:border-sky-500/50 hover:text-zinc-300"
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
                {csvFile ? (
                  <span className="text-sky-300">{csvFile.name}</span>
                ) : (
                  <span>Click to select a CSV file</span>
                )}
              </div>
            </div>
          )}

          {/* Top K */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
              Shortlist Size (Top K)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={50}
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                className="flex-1 accent-sky-500"
              />
              <span className="w-8 text-center font-mono text-sm text-zinc-300">{topK}</span>
            </div>
          </div>

          {err && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {err}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !jobId || (source === "csv_upload" && !csvFile)}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Screening candidates…
              </>
            ) : (
              <>
                <Shield className="h-4 w-4" />
                Start Screening
              </>
            )}
          </Button>
        </form>
      </GlossCard>

      {/* Results */}
      {runResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Stats bar */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Scanned", value: runResult.total_candidates_scanned, icon: Database },
              { label: "Passed Filter", value: runResult.candidates_passed_filter, icon: Target },
              { label: "Scored", value: runResult.candidates_scored, icon: CheckCircle2 },
              { label: "Failed", value: runResult.candidates_failed, icon: XCircle },
            ].map(({ label, value, icon: Icon }) => (
              <GlossCard key={label}>
                <div className="flex flex-col items-center gap-1 py-1">
                  <Icon className="h-4 w-4 text-zinc-500" />
                  <span className="text-lg font-bold text-zinc-100">{value}</span>
                  <span className="text-[10px] text-zinc-500">{label}</span>
                </div>
              </GlossCard>
            ))}
          </div>

          {/* Ranked list */}
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-200">
            <Trophy className="h-5 w-5 text-amber-400" />
            Ranked Candidates
            <span className="text-sm font-normal text-zinc-500">
              ({results.length} total, top {Math.min(topK, results.length)} shortlisted)
            </span>
          </h2>

          <div className="space-y-3">
            {results.map((item) => (
              <ResultCard
                key={item.result_id}
                item={item}
                runId={runResult.screening_run_id}
                isTopK={item.rank_position != null && item.rank_position <= topK}
              />
            ))}
          </div>

          {results.length === 0 && (
            <GlossCard>
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Minus className="h-8 w-8 text-zinc-600" />
                <p className="text-sm text-zinc-400">
                  No candidates matched the screening criteria for this job.
                </p>
              </div>
            </GlossCard>
          )}
        </motion.div>
      )}

      <p className="text-center text-xs text-zinc-600">
        <Link href="/org" className="text-sky-400/80 hover:text-sky-400">
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
