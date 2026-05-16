"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  ExternalLink,
  MapPin,
  Search,
  Sparkles,
  Star,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { usePublicJobs, useApplyToJob } from "@/lib/hooks";

const WORK_MODE_LABELS: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};

const WORK_MODE_COLORS: Record<string, string> = {
  remote: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  hybrid: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  onsite: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const { data: jobs = [], isLoading } = usePublicJobs();
  const { mutateAsync: applyToJob, isPending: applying } = useApplyToJob();
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const filtered = jobs.filter(
    (j) =>
      !query ||
      j.title.toLowerCase().includes(query.toLowerCase()) ||
      j.company.toLowerCase().includes(query.toLowerCase()) ||
      j.location.toLowerCase().includes(query.toLowerCase()),
  );

  async function handleApply(jobId: string) {
    setApplyingId(jobId);
    try {
      await applyToJob(jobId);
      toast.success("Application submitted successfully!");
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        toast.info("You've already applied to this job.");
      } else {
        toast.error("Failed to submit application. Please try again.");
      }
    } finally {
      setApplyingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Discover Jobs
        </h1>
        <p className="text-muted-foreground mt-1">
          Browse open positions matched to your profile.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by title, company, or location…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Job list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <Briefcase className="h-12 w-12 text-muted-foreground/30" />
          <div>
            <p className="font-semibold">No jobs found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try a different search term or check back later.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => (
            <div
              key={job.id}
              className="rounded-xl border border-border bg-card p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Job info */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-base">{job.title}</h3>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        WORK_MODE_COLORS[job.workMode] ?? WORK_MODE_COLORS.onsite,
                      )}
                    >
                      {WORK_MODE_LABELS[job.workMode] ?? job.workMode}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{job.company}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {job.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {job.level}
                    </span>
                    {job.salary && (
                      <span className="font-medium text-foreground">{job.salary}</span>
                    )}
                    {job.applicants > 0 && (
                      <span>{job.applicants} applicants</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {job.applicationMode === "external_apply" && job.externalApplyUrl ? (
                    <a
                      href={job.externalApplyUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                        <ExternalLink className="h-3 w-3" />
                        Apply Externally
                      </Button>
                    </a>
                  ) : (
                    <Button
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => handleApply(job.id)}
                      disabled={applyingId === job.id || applying}
                    >
                      {applyingId === job.id ? (
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
                      ) : (
                        <Briefcase className="h-3.5 w-3.5" />
                      )}
                      Apply Now
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center pt-4">
        Showing {filtered.length} of {jobs.length} open positions
      </p>
    </div>
  );
}
