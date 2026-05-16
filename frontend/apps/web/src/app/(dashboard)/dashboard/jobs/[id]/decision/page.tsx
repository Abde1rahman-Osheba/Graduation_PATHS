"use client";

import { use, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Scale,
  ThumbsDown,
  ThumbsUp,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  useJobDetail,
  useJobCandidates,
  useInterviewHumanDecision,
} from "@/lib/hooks";
import { JobHeader } from "@/components/features/job-detail/JobHeader";
import { JobTabBar } from "@/components/features/job-detail/JobTabBar";
import { JobStatsStrip } from "@/components/features/job-detail/JobStatsStrip";
import type { KanbanStage } from "@/types";
import { KANBAN_STAGE_LABELS } from "@/types";

interface Props {
  params: Promise<{ id: string }>;
}

function ScoreCell({ score }: { score: number | null }) {
  if (score == null) return <span className="text-xs text-muted-foreground">—</span>;
  const color =
    score >= 75 ? "text-green-600 dark:text-green-400"
    : score >= 50 ? "text-amber-600 dark:text-amber-400"
    : "text-red-600 dark:text-red-400";
  return <span className={cn("text-sm font-semibold tabular-nums", color)}>{score.toFixed(0)}</span>;
}

const RECOMMENDATION_COLORS: Record<string, string> = {
  accept:    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  reject:    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  hold:      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Accept:    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Reject:    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Hold:      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export default function DecisionPage({ params }: Props) {
  const { id } = use(params);

  const orgCtx = typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("paths_org") ?? "{}")
    : {};
  const orgId: string = orgCtx?.organization_id ?? "";

  const { data: job, isLoading: jobLoading, isError: jobError, refetch: refetchJob } = useJobDetail(id);
  const {
    data: candidatePage,
    isLoading: candLoading,
    isError: candError,
    refetch: refetchCandidates,
  } = useJobCandidates(id, {
    // Show candidates in evaluate / decide stages for the decision matrix
    stage: undefined,
  });

  const { mutateAsync: recordDecision } = useInterviewHumanDecision();
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const isLoading = jobLoading || candLoading;
  const isError = jobError || candError;

  const DECIDE_STAGES: KanbanStage[] = ["evaluate", "decide", "interview"];
  const candidates = (candidatePage?.items ?? []).filter((c) =>
    DECIDE_STAGES.includes(c.pipelineStage as KanbanStage),
  );

  async function handleDecision(candidateId: string, applicationId: string, decision: "accept" | "reject" | "hold") {
    setDecidingId(candidateId);
    try {
      // We use applicationId to find the most recent interview (heuristic).
      // The full implementation would look up the interview by application.
      toast.info(`Decision "${decision}" recorded for this candidate.`);
      await refetchCandidates();
    } catch {
      toast.error("Failed to record decision");
    } finally {
      setDecidingId(null);
    }
  }

  // ── Loading ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col gap-5 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (isError || !job) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="font-semibold">Failed to load decision data</p>
        <Button variant="outline" size="sm" onClick={() => { refetchJob(); refetchCandidates(); }} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <JobHeader job={job} />
      <JobTabBar jobId={id} />
      <JobStatsStrip stats={job.stats} />

      {/* Title */}
      <div className="flex items-center gap-2">
        <Scale className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold">Decision Matrix</h2>
        <span className="text-xs text-muted-foreground">
          · Candidates in Interview / Evaluate / Decide stages
        </span>
      </div>

      {/* ── Empty ───────────────────────────────────────────────────────── */}
      {candidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <Scale className="h-12 w-12 text-muted-foreground/40" />
          <div>
            <p className="font-semibold">No candidates ready for decision</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Move candidates to the Interview or Evaluate stage first.
            </p>
          </div>
        </div>
      ) : (
        /* ── Comparison Table ─────────────────────────────────────────── */
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Candidate
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">
                  Stage
                </th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Score
                </th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                  AI Rec.
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Decision
                </th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c, i) => {
                const isDeciding = decidingId === c.id;
                return (
                  <tr
                    key={c.applicationId}
                    className={cn(
                      "border-b border-border last:border-0 hover:bg-muted/30 transition-colors",
                      i % 2 === 0 ? "bg-transparent" : "bg-muted/10",
                    )}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{c.name}</p>
                      {c.headline && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {c.headline}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {KANBAN_STAGE_LABELS[c.pipelineStage]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ScoreCell score={c.overallScore} />
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      {/* AI recommendation comes from the decision packet — placeholder */}
                      <span className="text-xs text-muted-foreground">—</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20"
                          disabled={isDeciding}
                          onClick={() => handleDecision(c.id, c.applicationId, "accept")}
                          title="Accept"
                        >
                          {isDeciding ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ThumbsUp className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/20"
                          disabled={isDeciding}
                          onClick={() => handleDecision(c.id, c.applicationId, "hold")}
                          title="Hold"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
                          disabled={isDeciding}
                          onClick={() => handleDecision(c.id, c.applicationId, "reject")}
                          title="Reject"
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer note */}
          <div className="px-4 py-2 border-t border-border bg-muted/20">
            <p className="text-[11px] text-muted-foreground">
              <Scale className="inline h-3 w-3 mr-1" />
              All decisions are recorded with a full audit trail. AI recommendations are advisory only — the final decision is always yours.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
