"use client";

import { use } from "react";
import { Scale } from "lucide-react";
import { useJobDetail } from "@/lib/hooks";
import { JobHeader } from "@/components/features/job-detail/JobHeader";
import { JobTabBar } from "@/components/features/job-detail/JobTabBar";
import { JobStatsStrip } from "@/components/features/job-detail/JobStatsStrip";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  params: Promise<{ id: string }>;
}

export default function DecisionPage({ params }: Props) {
  const { id } = use(params);
  const { data: job, isLoading } = useJobDetail(id);

  if (isLoading || !job) {
    return (
      <div className="flex flex-col gap-5 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <JobHeader job={job} />
      <JobTabBar jobId={id} />
      <JobStatsStrip stats={job.stats} />
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <Scale className="h-12 w-12 text-muted-foreground/40" />
        <div>
          <p className="font-semibold">Decision Hub</p>
          <p className="mt-1 text-sm text-muted-foreground">Coming in Phase 2.</p>
        </div>
      </div>
    </div>
  );
}
