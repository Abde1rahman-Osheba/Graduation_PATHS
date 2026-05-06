"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Briefcase, Clock, MapPin, Search, X, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCandidateApplications } from "@/lib/hooks";
import { cn } from "@/lib/utils/cn";

const STATUS_LABELS: Record<string, string> = {
  applied:   "Applied",
  screening: "In Screening",
  interview: "Interview",
  offered:   "Offered",
  rejected:  "Not Selected",
  withdrawn: "Withdrawn",
};

const STATUS_COLORS: Record<string, string> = {
  applied:   "border-slate-500/30 bg-slate-500/10 text-slate-400",
  screening: "border-primary/30 bg-primary/10 text-primary",
  interview: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  offered:   "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  rejected:  "border-rose-500/30 bg-rose-500/10 text-rose-400",
  withdrawn: "border-muted/30 bg-muted/10 text-muted-foreground",
};

const WORK_MODE_COLORS: Record<string, string> = {
  remote: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  hybrid: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  onsite: "border-blue-500/30 bg-blue-500/10 text-blue-400",
};

const STAGE_STEPS = ["Applied", "Screening", "Interview", "Offer", "Hired"];

type AppItem = {
  id: string;
  jobTitle: string;
  companyName: string;
  location: string;
  workMode: string;
  status: string;
  appliedAt: string;
  matchScore?: number;
  stage: string;
};

function ApplicationCard({ app }: { app: AppItem }) {
  const stageIdx = STAGE_STEPS.findIndex((s) => s.toLowerCase() === app.stage.toLowerCase());

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass gradient-border rounded-2xl p-6 space-y-5"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-heading text-[15px] font-bold text-foreground">{app.jobTitle}</h3>
            <Badge variant="outline" className={cn("text-[10px]", STATUS_COLORS[app.status] ?? "")}>
              {STATUS_LABELS[app.status] ?? app.status}
            </Badge>
            <Badge variant="outline" className={cn("text-[10px]", WORK_MODE_COLORS[app.workMode] ?? "")}>
              {app.workMode}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{app.companyName}</span>
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{app.location}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Applied {new Date(app.appliedAt).toLocaleDateString()}</span>
          </div>
        </div>
        {app.matchScore && (
          <div className="text-right shrink-0">
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">Match</p>
            <p className="font-heading text-2xl font-bold text-primary">{app.matchScore}%</p>
          </div>
        )}
      </div>

      {/* Progress pipeline */}
      <div className="relative">
        <div className="flex items-center gap-0">
          {STAGE_STEPS.map((step, i) => {
            const isDone    = i < stageIdx;
            const isCurrent = i === stageIdx;
            return (
              <div key={step} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1">
                  <div className={cn(
                    "h-2.5 w-2.5 rounded-full border transition-all",
                    isDone    ? "bg-primary border-primary"         : "",
                    isCurrent ? "bg-primary/40 border-primary ring-2 ring-primary/20" : "",
                    !isDone && !isCurrent ? "bg-muted/30 border-border/40" : "",
                  )} />
                  <span className={cn(
                    "text-[9px] font-medium uppercase tracking-wide whitespace-nowrap",
                    isCurrent ? "text-primary" : isDone ? "text-muted-foreground" : "text-muted-foreground/40"
                  )}>
                    {step}
                  </span>
                </div>
                {i < STAGE_STEPS.length - 1 && (
                  <div className={cn("flex-1 h-px mb-4", i < stageIdx ? "bg-primary/40" : "bg-border/40")} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

export default function ApplicationsPage() {
  const [query, setQuery] = useState("");
  const { data: apps = [] } = useCandidateApplications();

  const filtered = apps.filter((a) => {
    const q = query.toLowerCase();
    return !q || a.jobTitle.toLowerCase().includes(q) || a.companyName.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground">My Applications</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track the status of all your job applications.</p>
        </motion.div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by job title or company…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 pl-10 pr-4"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Summary */}
        <p className="mb-5 text-sm text-muted-foreground">{filtered.length} {filtered.length === 1 ? "application" : "applications"}</p>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/40 py-16 text-center">
            <Briefcase className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">
              {query ? "No applications match your search." : "No applications yet."}
            </p>
            {!query && (
              <Button className="mt-5 gap-2 glow-blue" size="sm" asChild>
                <Link href="/jobs">Browse Jobs <ArrowRight className="h-3.5 w-3.5" /></Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((app) => <ApplicationCard key={app.id} app={app} />)}
          </div>
        )}

        {/* CTA */}
        <div className="mt-10 glass gradient-border rounded-2xl p-6 text-center">
          <p className="text-sm font-semibold text-foreground">Looking for more opportunities?</p>
          <p className="mt-1 text-xs text-muted-foreground">Browse open positions and apply with your existing profile.</p>
          <Button className="mt-4 gap-2 glow-blue" size="sm" asChild>
            <Link href="/jobs">Browse Jobs <ArrowRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
