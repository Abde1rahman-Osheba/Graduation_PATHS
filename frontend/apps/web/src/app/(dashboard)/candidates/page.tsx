"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Search, Filter, LayoutGrid, List,
  Star, Shield, ShieldOff, GitBranch,
  ChevronRight, Users, Plus, SlidersHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useApplications } from "@/lib/hooks";
import { cn } from "@/lib/utils/cn";
import { relativeTime, initials, scoreColor, stageLabel } from "@/lib/utils/format";
import type { Application, ApplicationStatus } from "@/types";

const PIPELINE_STAGES: { key: ApplicationStatus; label: string; color: string }[] = [
  { key: "applied",       label: "Applied",       color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  { key: "sourced",       label: "Sourced",       color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  { key: "screening",     label: "Screening",     color: "bg-primary/10 text-primary border-primary/20" },
  { key: "assessment",    label: "Assessment",    color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  { key: "hr_interview",  label: "HR Interview",  color: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
  { key: "tech_interview",label: "Tech Interview",color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  { key: "decision",      label: "Decision",      color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
];

function ScoreBadge({ score }: { score?: number }) {
  if (score == null || Number.isNaN(score))
    return (
      <span className="text-[11px] font-medium text-muted-foreground/80 whitespace-nowrap">
        Not scored yet
      </span>
    );
  const color = score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400";
  return (
    <span className={cn("font-mono text-[13px] font-bold", color)}>{score}%</span>
  );
}

function ConfidenceDot({ confidence }: { confidence?: number }) {
  if (confidence == null || Number.isNaN(confidence)) return null;
  const color = confidence >= 0.75 ? "bg-emerald-400" : confidence >= 0.5 ? "bg-amber-400" : "bg-red-400";
  return (
    <span title={`Confidence: ${Math.round(confidence * 100)}%`} className={cn("inline-block h-2 w-2 rounded-full", color)} />
  );
}

function CandidateCard({ app }: { app: Application }) {
  const c = app.candidate;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="group glass rounded-xl p-4 transition-all hover:border-primary/20 hover:glow-blue cursor-pointer"
    >
      <Link href={`/candidates/${c.id}`} className="block">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10">
                {!app.isAnonymized && <AvatarImage src={c.avatar} alt={c.name} />}
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {app.isAnonymized ? "?" : initials(c.name)}
                </AvatarFallback>
              </Avatar>
              {app.isAnonymized && (
                <ShieldOff className="absolute -right-1 -top-1 h-3.5 w-3.5 text-amber-400" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-semibold text-[14px] text-foreground truncate">
                  {app.isAnonymized ? c.alias : c.name}
                </p>
                {!app.isAnonymized && <Shield className="h-3 w-3 text-emerald-400/70 shrink-0" />}
              </div>
              <p className="text-[12px] text-muted-foreground truncate">{c.title}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <ScoreBadge score={app.matchScore} />
            <ConfidenceDot confidence={app.matchConfidence} />
          </div>
        </div>

        {/* Skills */}
        {c.skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {c.skills.slice(0, 3).map((s) => (
              <span key={s.id} className="evidence-pill">{s.skill}</span>
            ))}
            {c.skills.length > 3 && (
              <span className="text-[11px] text-muted-foreground">+{c.skills.length - 3}</span>
            )}
          </div>
        )}

        {/* Meta */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <GitBranch className="h-3 w-3" />
            {app.sourcePlatform}
          </span>
          <span>{relativeTime(app.applyDate)}</span>
        </div>

        {/* Bias flags */}
        {app.biasFlags && app.biasFlags.length > 0 && (
          <div className="mt-2 flex items-center gap-1">
            <span className="text-[10px] font-semibold text-amber-400">⚠ {app.biasFlags[0].description}</span>
          </div>
        )}
      </Link>
    </motion.div>
  );
}

function KanbanColumn({
  stage, label, color, apps,
}: {
  stage: ApplicationStatus; label: string; color: string; apps: Application[];
}) {
  return (
    <div className="flex w-72 shrink-0 flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", color)}>
            {label}
          </span>
          <span className="text-[12px] font-medium text-muted-foreground">{apps.length}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        <AnimatePresence mode="popLayout">
          {apps.map((app) => (
            <CandidateCard key={app.id} app={app} />
          ))}
        </AnimatePresence>
        {apps.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/40 bg-muted/10 p-6 text-center">
            <p className="text-xs text-muted-foreground/60">No candidates at this stage</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CandidatesPage() {
  const { data: applications = [], isLoading, isError, error, refetch } = useApplications();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [selectedJob, setSelectedJob] = useState("all");

  const filtered = applications.filter((app) => {
    const q = search.toLowerCase();
    return (
      !q ||
      app.candidate.name.toLowerCase().includes(q) ||
      app.candidate.alias.toLowerCase().includes(q) ||
      app.candidate.title.toLowerCase().includes(q)
    );
  });

  const byStage = (stage: ApplicationStatus) =>
    filtered.filter((a) => a.status === stage);

  return (
    <div className="flex h-full flex-col">
      {isError && (
        <div className="mx-6 mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error instanceof Error ? error.message : "Could not load applications."}{" "}
          <button type="button" onClick={() => void refetch()} className="ml-2 underline">
            Retry
          </button>
        </div>
      )}
      {/* Top bar */}
      <div className="border-b border-border/50 bg-background/60 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
              Candidate Pipeline
            </h1>
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? "Loading pipeline…"
                : `${applications.length} total in pipeline · ${filtered.length} shown`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search candidates…"
                className="h-9 w-56 rounded-lg border border-border/60 bg-muted/40 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Filter
            </Button>
            <div className="flex rounded-lg border border-border/60 overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-9 w-9 rounded-none border-0", view === "kanban" && "bg-primary/10 text-primary")}
                onClick={() => setView("kanban")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-9 w-9 rounded-none border-0", view === "list" && "bg-primary/10 text-primary")}
                onClick={() => setView("list")}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban board */}
      {view === "kanban" && !isLoading && !isError && applications.length === 0 && (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-md rounded-xl border border-dashed border-border/50 px-8 py-12 text-center text-sm text-muted-foreground">
            No applications yet. When candidates apply to your org&apos;s jobs, they will show here by stage.
          </div>
        </div>
      )}

      {view === "kanban" && !isError && (isLoading ? (
        <div className="flex flex-1 gap-4 overflow-x-auto p-6">
          {PIPELINE_STAGES.slice(0, 4).map((s) => (
            <div key={s.key} className="w-72 shrink-0 space-y-2">
              <div className="h-6 w-24 animate-pulse rounded bg-muted/30" />
              <div className="h-28 animate-pulse rounded-xl bg-muted/20" />
              <div className="h-28 animate-pulse rounded-xl bg-muted/20" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto p-6">
          <div className="flex gap-4 h-full pb-4">
            {PIPELINE_STAGES.map(({ key, label, color }) => (
              <KanbanColumn
                key={key}
                stage={key}
                label={label}
                color={color}
                apps={byStage(key)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* List view */}
      {view === "list" && !isLoading && !isError && applications.length === 0 && (
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
          No applications to display.
        </div>
      )}

      {view === "list" && !isError && (isLoading ? (
        <div className="flex-1 p-6">
          <div className="glass rounded-xl h-64 animate-pulse bg-muted/15" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="glass rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/40 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  <th className="px-4 py-3 text-left">Candidate</th>
                  <th className="px-4 py-3 text-left">Stage</th>
                  <th className="px-4 py-3 text-left">Job</th>
                  <th className="px-4 py-3 text-right">Score</th>
                  <th className="px-4 py-3 text-right">Applied</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filtered.map((app) => {
                  const c = app.candidate;
                  const stageConf = PIPELINE_STAGES.find((s) => s.key === app.status);
                  return (
                    <tr key={app.id} className="group hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {!app.isAnonymized && <AvatarImage src={c.avatar} />}
                            <AvatarFallback className="bg-primary/10 text-primary text-[11px]">
                              {app.isAnonymized ? "?" : initials(c.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{app.isAnonymized ? c.alias : c.name}</p>
                            <p className="text-[11px] text-muted-foreground">{c.title}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {stageConf && (
                          <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", stageConf.color)}>
                            {stageConf.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{app.job.title}</td>
                      <td className="px-4 py-3 text-right"><ScoreBadge score={app.matchScore} /></td>
                      <td className="px-4 py-3 text-right text-[12px] text-muted-foreground">{relativeTime(app.applyDate)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/candidates/${c.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
