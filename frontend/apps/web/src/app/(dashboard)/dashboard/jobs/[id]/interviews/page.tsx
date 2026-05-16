"use client";

import { use } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  Video,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useJobDetail, useInterviewList } from "@/lib/hooks";
import { JobHeader } from "@/components/features/job-detail/JobHeader";
import { JobTabBar } from "@/components/features/job-detail/JobTabBar";
import { JobStatsStrip } from "@/components/features/job-detail/JobStatsStrip";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

const STATUS_COLORS: Record<string, string> = {
  scheduled:  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed:  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled:  "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  no_show:    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  rescheduled:"bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  draft:      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const TYPE_LABELS: Record<string, string> = {
  hr: "HR",
  technical: "Technical",
  mixed: "Mixed",
};

function InterviewStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        STATUS_COLORS[status] ?? STATUS_COLORS.draft,
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function InterviewsPage({ params }: Props) {
  const { id } = use(params);
  const orgCtx = typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("paths_org") ?? "{}")
    : {};
  const orgId: string = orgCtx?.organization_id ?? "";

  const {
    data: job,
    isLoading: jobLoading,
    isError: jobError,
  } = useJobDetail(id);

  const {
    data: interviews = [],
    isLoading: intLoading,
    isError: intError,
    refetch,
  } = useInterviewList(orgId);

  const isLoading = jobLoading || intLoading;
  const isError = jobError || intError;

  // Filter to this job's interviews
  const jobInterviews = interviews.filter((i) =>
    // The backend list item contains job_title but not job_id directly,
    // so we match by job title as a heuristic (best effort without a
    // job-scoped interviews endpoint).
    // If the backend is extended to return job_id, swap to strict match.
    job?.title && i.job_title === job.title
  );

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col gap-5 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (isError || !job) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="font-semibold">Failed to load interviews</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
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

      {/* ── Empty ─────────────────────────────────────────────────────────── */}
      {jobInterviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground/40" />
          <div>
            <p className="font-semibold">No interviews scheduled</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Schedule interviews from the candidates list after shortlisting.
            </p>
          </div>
        </div>
      ) : (
        /* ── Interview list ──────────────────────────────────────────────── */
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Candidate
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">
                  Type
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                  Scheduled
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {jobInterviews.map((interview, i) => (
                <tr
                  key={interview.interview_id}
                  className={cn(
                    "border-b border-border last:border-0 hover:bg-muted/30 transition-colors",
                    i % 2 === 0 ? "bg-transparent" : "bg-muted/10",
                  )}
                >
                  <td className="px-4 py-3 font-medium">
                    {interview.candidate_name}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {TYPE_LABELS[interview.interview_type] ?? interview.interview_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <InterviewStatusBadge status={interview.status} />
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {interview.scheduled_start
                        ? new Date(interview.scheduled_start).toLocaleString()
                        : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {interview.meeting_url && (
                        <a
                          href={interview.meeting_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Video className="h-3.5 w-3.5" />
                          Join
                        </a>
                      )}
                      <Link href={`/dashboard/jobs/${id}/interviews/${interview.interview_id}`}>
                        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                          <ExternalLink className="h-3 w-3" />
                          {interview.status === "completed" ? "Analysis" : "View"}
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
