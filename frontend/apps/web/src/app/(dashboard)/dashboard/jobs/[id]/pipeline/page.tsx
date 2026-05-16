"use client";

import { use } from "react";
import { AlertCircle, RefreshCw, Columns } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { JobHeader } from "@/components/features/job-detail/JobHeader";
import { JobTabBar } from "@/components/features/job-detail/JobTabBar";
import { JobStatsStrip } from "@/components/features/job-detail/JobStatsStrip";
import { PipelineBoard } from "@/components/features/pipeline/PipelineBoard";
import { useJobDetail, useJobCandidates } from "@/lib/hooks";
import { KANBAN_STAGES } from "@/types";
import type { KanbanStage } from "@/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default function PipelinePage({ params }: Props) {
  const { id } = use(params);

  const { data: job, isLoading: jobLoading, isError: jobError, error: jobErr, refetch: refetchJob } = useJobDetail(id);
  const { data: candidatePage, isLoading: candLoading, isError: candError, refetch: refetchCandidates } = useJobCandidates(id, {});

  const isLoading = jobLoading || candLoading;
  const isError = jobError || candError;

  // ── Loading state ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col gap-5 p-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="flex gap-3 overflow-x-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-64 min-w-[220px] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────
  if (isError || !job) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <div>
          <p className="font-semibold">Failed to load pipeline</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {jobErr instanceof Error ? jobErr.message : "An unexpected error occurred."}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { refetchJob(); refetchCandidates(); }}
          className="gap-2"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </Button>
      </div>
    );
  }

  const candidates = candidatePage?.items ?? [];

  // ── Empty state ────────────────────────────────────────────────────────
  if (candidates.length === 0) {
    return (
      <div className="flex flex-col gap-5 p-6">
        <JobHeader job={job} />
        <JobTabBar jobId={id} />
        <JobStatsStrip stats={job.stats} />
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <Columns className="h-12 w-12 text-muted-foreground/40" />
          <div>
            <p className="font-semibold">No candidates in pipeline yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Run screening to populate the pipeline with candidates.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Stage counts ───────────────────────────────────────────────────────
  const stageCounts = KANBAN_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = candidates.filter((c) => c.pipelineStage === stage).length;
      return acc;
    },
    {} as Record<KanbanStage, number>,
  );

  // ── Success state ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 p-6">
      <JobHeader job={job} />
      <JobTabBar jobId={id} />
      <JobStatsStrip stats={job.stats} />
      <PipelineBoard jobId={id} candidates={candidates} stageCounts={stageCounts} />
    </div>
  );
}
