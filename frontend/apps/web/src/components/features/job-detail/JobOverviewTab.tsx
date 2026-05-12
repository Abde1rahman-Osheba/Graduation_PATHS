"use client";

import { Shield, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { JobDetail } from "@/types";

interface Props {
  job: JobDetail;
}

export function JobOverviewTab({ job }: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left: description */}
      <div className="lg:col-span-2 space-y-6">
        {job.description && (
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Description
            </h2>
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: job.description }}
            />
          </section>
        )}

        {job.requiredSkills.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Required Skills
            </h2>
            <div className="flex flex-wrap gap-2">
              {job.requiredSkills.map((s) => (
                <span
                  key={s.name}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2.5 py-1 text-xs font-medium"
                >
                  {s.name}
                  <span className="text-muted-foreground">w{s.weight}</span>
                </span>
              ))}
            </div>
          </section>
        )}

        {job.optionalSkills.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Nice-to-have
            </h2>
            <div className="flex flex-wrap gap-2">
              {job.optionalSkills.map((s) => (
                <span
                  key={s.name}
                  className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground"
                >
                  {s.name}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Right: salary + fairness rubric */}
      <div className="space-y-4">
        {(job.salaryMin || job.salaryMax) && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Salary Range
            </p>
            <p className="text-lg font-bold">
              {job.salaryMin != null ? `$${job.salaryMin.toLocaleString()}` : "—"}
              {" – "}
              {job.salaryMax != null ? `$${job.salaryMax.toLocaleString()}` : "—"}
            </p>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-500" />
            <p className="text-sm font-semibold">Fairness Rubric</p>
          </div>

          {job.fairnessRubric ? (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Status</span>
                <span className={job.fairnessRubric.enabled ? "text-green-600 font-medium" : "text-muted-foreground"}>
                  {job.fairnessRubric.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  4/5 threshold
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Disparate impact ratio — selection rate for any protected group must be ≥ {job.fairnessRubric.disparateImpactThreshold * 100}% of the highest-rate group.
                    </TooltipContent>
                  </Tooltip>
                </span>
                <span className="font-medium">{(job.fairnessRubric.disparateImpactThreshold * 100).toFixed(0)}%</span>
              </div>
              <div className="space-y-1">
                {Object.entries(job.fairnessRubric.protectedAttrs).map(([attr, on]) => (
                  <div key={attr} className="flex items-center justify-between text-xs">
                    <span className="capitalize text-muted-foreground">{attr.replace(/_/g, " ")}</span>
                    <span className={on ? "text-blue-600 font-medium" : "text-muted-foreground"}>
                      {on ? "Monitored" : "Off"}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">No rubric configured yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
