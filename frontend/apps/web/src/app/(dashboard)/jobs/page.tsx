"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Plus,
  Briefcase,
  MapPin,
  Users,
  ChevronRight,
  Zap,
  Search,
  Download,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useJobs, useJobImportStatus, useRunJobImport } from "@/lib/hooks";
import { cn } from "@/lib/utils/cn";
import { shortDate, formatSalary } from "@/lib/utils/format";
import type { JobStatus } from "@/types";

const statusConfig: Record<JobStatus, { label: string; color: string }> = {
  draft:     { label: "Draft",     color: "bg-muted/40 text-muted-foreground border-border/40" },
  published: { label: "Live",      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  closed:    { label: "Closed",    color: "bg-red-500/10 text-red-400 border-red-500/20" },
  archived:  { label: "Archived",  color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
};

const modeColor = {
  inbound:  "bg-primary/8 text-primary/80",
  outbound: "bg-teal-500/8 text-teal-400/80",
  hybrid:   "bg-violet-500/8 text-violet-400/80",
};

export default function JobsPage() {
  const [keywordInput, setKeywordInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [debouncedLocation, setDebouncedLocation] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keywordInput), 350);
    return () => clearTimeout(t);
  }, [keywordInput]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedLocation(locationInput), 350);
    return () => clearTimeout(t);
  }, [locationInput]);

  const listFilters = useMemo(
    () => ({
      keyword: debouncedKeyword.trim() || undefined,
      location: debouncedLocation.trim() || undefined,
      remote: remoteOnly ? true : undefined,
      limit: 200,
    }),
    [debouncedKeyword, debouncedLocation, remoteOnly],
  );

  const { data: jobs = [], isLoading, isError, error, refetch } = useJobs(listFilters);
  const { data: importStatus } = useJobImportStatus();
  const runImport = useRunJobImport();

  const liveCount = jobs.filter((j) => j.status === "published").length;

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">Jobs</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Loading…"
              : isError
                ? "Could not load jobs"
                : `${liveCount} live · ${jobs.length} in list`}
          </p>
          {importStatus?.last_run_at != null && (
            <p className="mt-1 text-[11px] text-muted-foreground/80">
              Last import: {shortDate(importStatus.last_run_at)}
              {importStatus.last_success === false && importStatus.last_error
                ? ` — ${importStatus.last_error}`
                : importStatus.last_inserted_count != null
                  ? ` · +${importStatus.last_inserted_count} inserted`
                  : ""}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="gap-1.5 h-9"
            disabled={runImport.isPending}
            onClick={() =>
              void runImport.mutateAsync({
                keyword: keywordInput.trim() || undefined,
                location: locationInput.trim() || undefined,
                limit: 10,
              })
            }
          >
            {runImport.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Run import
          </Button>
          <Button size="sm" className="gap-1.5 h-9">
            <Plus className="h-3.5 w-3.5" /> New Job
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border/40 bg-muted/5 p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex-1 min-w-[180px] space-y-1.5">
          <label htmlFor="job-search" className="text-[11px] font-medium text-muted-foreground">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="job-search"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="Title, company, description…"
              className="h-9 pl-8 text-[13px]"
            />
          </div>
        </div>
        <div className="flex-1 min-w-[160px] space-y-1.5">
          <label htmlFor="job-location" className="text-[11px] font-medium text-muted-foreground">
            Location
          </label>
          <Input
            id="job-location"
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            placeholder="City, region, remote…"
            className="h-9 text-[13px]"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 pb-1 text-[12px] text-muted-foreground">
          <input
            type="checkbox"
            checked={remoteOnly}
            onChange={(e) => setRemoteOnly(e.target.checked)}
            className="rounded border-border"
          />
          Remote only
        </label>
      </div>

      {runImport.isSuccess && (
        <div
          className={cn(
            "rounded-xl border px-4 py-3 text-sm",
            runImport.data.success
              ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-200"
              : "border-amber-500/25 bg-amber-500/5 text-amber-200",
          )}
        >
          Import finished: {runImport.data.inserted} new, {runImport.data.duplicates} duplicates,{" "}
          {runImport.data.found} found in feed
          {runImport.data.errors.length > 0 && (
            <span className="mt-1 block text-[12px] opacity-90">
              {runImport.data.errors.slice(0, 3).join(" · ")}
            </span>
          )}
        </div>
      )}

      {runImport.isError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {runImport.error instanceof Error ? runImport.error.message : "Import failed."}
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error instanceof Error ? error.message : "Request failed."}{" "}
          <button type="button" onClick={() => void refetch()} className="ml-2 underline">
            Retry
          </button>
        </div>
      )}

      {isLoading && (
        <div className="grid gap-3">
          {[0, 1, 2].map((k) => (
            <div key={k} className="glass rounded-xl p-5 animate-pulse space-y-3">
              <div className="h-5 w-2/3 rounded bg-muted/40" />
              <div className="h-4 w-1/2 rounded bg-muted/30" />
              <div className="h-8 w-full rounded bg-muted/20" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && !isError && jobs.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/50 py-16 text-center text-sm text-muted-foreground">
          No jobs match your filters. Try clearing search, or run <strong>Run import</strong> to pull
          listings from the configured feed.
        </div>
      )}

      <div className="grid gap-3">
        {!isLoading && jobs.map((job, i) => {
          const statusConf = statusConfig[job.status] ?? statusConfig.draft;
          const metaDept = job.department || job.sourcePlatform || "—";
          const companyLine = job.companyName ? `${job.companyName} · ` : "";
          return (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-xl p-5 hover:ring-1 hover:ring-primary/20 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-heading text-[15px] font-semibold text-foreground">{job.title}</h2>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", statusConf.color)}>
                      {statusConf.label}
                    </span>
                    <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-semibold capitalize", modeColor[job.mode])}>
                      {job.mode}
                    </span>
                    {job.sourcePlatform && (
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {job.sourcePlatform}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3 w-3" /> {companyLine}
                      {job.level} · {metaDept}
                    </span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.location} · {job.workMode}</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {job.applicantCount} applicants</span>
                    {(job.salaryMin || job.salaryMax) && (
                      <span className="text-foreground/70 font-medium">{formatSalary(job.salaryMin, job.salaryMax, job.currency)}</span>
                    )}
                    {job.externalJobUrl && (
                      <a
                        href={job.externalJobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" /> Original post
                      </a>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {job.skills.length === 0 ? (
                      <span className="text-[11px] text-muted-foreground/70">No skills listed</span>
                    ) : (
                      <>
                        {job.skills.slice(0, 4).map((s) => (
                          <span key={s.skill} className={cn("evidence-pill", !s.required && "opacity-60")}>
                            {s.skill}{s.required ? " *" : ""}
                          </span>
                        ))}
                        {job.skills.length > 4 && (
                          <span className="text-[11px] text-muted-foreground">+{job.skills.length - 4}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3 shrink-0">
                  <div className="flex items-center gap-1">
                    {job.pipeline.length === 0 ? (
                      <span className="text-[10px] text-muted-foreground/60 max-w-[120px] text-right">
                        Pipeline breakdown not available
                      </span>
                    ) : (
                      job.pipeline.slice(0, 5).map((stage) => (
                        <div
                          key={stage.stage}
                          title={`${stage.label}: ${stage.count}`}
                          className="flex flex-col items-center gap-0.5"
                        >
                          <div
                            className="w-6 rounded-t-sm bg-primary/40"
                            style={{ height: `${Math.max(4, (stage.count / Math.max(1, job.applicantCount)) * 40)}px` }}
                          />
                          <span className="text-[9px] font-mono text-muted-foreground/60">{stage.count}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/jobs/${job.id}/screening`}>
                      <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px]">
                        <Zap className="h-3 w-3" /> Screening
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
