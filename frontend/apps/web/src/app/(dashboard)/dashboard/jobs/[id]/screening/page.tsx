"use client";

import { use, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  BarChart2,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  Eye,
  Info,
  Layers,
  Loader2,
  Play,
  RefreshCw,
  Scale,
  Shield,
  ShieldOff,
  Star,
  TrendingDown,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  useJobDetail,
  useShortlist,
  useProposeShortlist,
  useRunScreening,
  useScreeningRun,
  useBiasReport,
} from "@/lib/hooks";
import { JobHeader } from "@/components/features/job-detail/JobHeader";
import { JobTabBar } from "@/components/features/job-detail/JobTabBar";
import { JobStatsStrip } from "@/components/features/job-detail/JobStatsStrip";
import { cn } from "@/lib/utils/cn";
import { initials } from "@/lib/utils/format";
import type { Application } from "@/types";

// ── Run Status Card ──────────────────────────────────────────────────────────

const RUN_STATUS_STYLES: Record<
  string,
  { bar: string; badge: string; label: string }
> = {
  pending:   { bar: "bg-amber-500 animate-pulse w-1/3",  badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",  label: "Pending"   },
  running:   { bar: "bg-blue-500 animate-pulse w-2/3",   badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",       label: "Running"   },
  completed: { bar: "bg-green-500 w-full",               badge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",   label: "Completed" },
  failed:    { bar: "bg-red-500 w-1/4",                  badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",           label: "Failed"    },
};

function ScreeningRunCard({
  runId,
  onRefresh,
  refreshing,
}: {
  runId: string;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const { data: run, isLoading } = useScreeningRun(runId);

  if (isLoading) return <Skeleton className="h-20 w-full rounded-xl" />;
  if (!run) return null;

  const style =
    RUN_STATUS_STYLES[run.status?.toLowerCase() ?? "pending"] ??
    RUN_STATUS_STYLES.pending;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Screening Run</span>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
              style.badge,
            )}
          >
            {style.label}
          </span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 text-xs text-muted-foreground"
          onClick={onRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-700", style.bar)} />
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">Run ID: </span>
          {run.screening_run_id?.slice(0, 8)}…
        </span>
        {run.top_k && (
          <span>
            <span className="font-medium text-foreground">Top-K: </span>
            {run.top_k}
          </span>
        )}
        {run.results && (
          <span>
            <span className="font-medium text-foreground">Results: </span>
            {run.results.length}
          </span>
        )}
        {run.status === "failed" && run.error_message && (
          <span className="text-red-500">{run.error_message}</span>
        )}
      </div>
    </div>
  );
}

// ── Bias Report Panel ─────────────────────────────────────────────────────────

function BiasReportPanel({ runId }: { runId: string }) {
  const { data: report, isLoading } = useBiasReport(runId);
  const [expanded, setExpanded] = useState(false);

  if (isLoading) return <Skeleton className="h-32 w-full rounded-xl" />;
  if (!report) return null;

  const { entries = [], has_flags, flagged_attributes = [] } = report;

  // Group entries by attribute
  const byAttr: Record<string, typeof entries> = {};
  for (const e of entries) {
    if (!byAttr[e.attribute_name]) byAttr[e.attribute_name] = [];
    byAttr[e.attribute_name].push(e);
  }
  const attrNames = Object.keys(byAttr);

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden",
        has_flags
          ? "border-amber-300 dark:border-amber-700"
          : "border-green-300 dark:border-green-800",
      )}
    >
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Bias Guardrail Report</span>
          {has_flags ? (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 gap-1">
              <AlertTriangle className="h-3 w-3" />
              {flagged_attributes.length} flag{flagged_attributes.length !== 1 ? "s" : ""}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 gap-1">
              <CheckCircle2 className="h-3 w-3" />
              All checks passed
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/40 p-4 space-y-4">
              {attrNames.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No attribute data available for this run.
                </p>
              )}
              {attrNames.map((attr) => (
                <div key={attr} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 capitalize">
                    {attr.replace(/_/g, " ")}
                  </p>
                  <div className="space-y-1.5">
                    {byAttr[attr].map((entry, i) => {
                      const isNoData = entry.group_label === "__no_data__";
                      if (isNoData) {
                        return (
                          <div
                            key={i}
                            className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2"
                          >
                            <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs text-muted-foreground">
                              No {attr.replace(/_/g, " ")} data stored (privacy-preserving)
                            </span>
                          </div>
                        );
                      }
                      const pct = Math.round(entry.selection_rate * 100);
                      const dir =
                        entry.disparate_impact_ratio != null
                          ? entry.disparate_impact_ratio.toFixed(2)
                          : null;
                      const flagged = !entry.passed;
                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-xs",
                            flagged
                              ? "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800"
                              : "bg-muted/20",
                          )}
                        >
                          <span
                            className={cn(
                              "shrink-0 font-medium w-28 truncate capitalize",
                              flagged ? "text-amber-700 dark:text-amber-400" : "text-foreground",
                            )}
                          >
                            {entry.group_label}
                          </span>
                          <div className="flex-1 flex items-center gap-2">
                            <div className="flex-1 h-1 rounded-full bg-muted/40 overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  flagged ? "bg-amber-500" : "bg-green-500",
                                )}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                            <span
                              className={cn(
                                "tabular-nums font-semibold w-8 text-right",
                                flagged
                                  ? "text-amber-700 dark:text-amber-400"
                                  : "text-green-700 dark:text-green-400",
                              )}
                            >
                              {pct}%
                            </span>
                          </div>
                          {dir && (
                            <span className="text-muted-foreground w-16 text-right">
                              DIR {dir}
                            </span>
                          )}
                          {flagged ? (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <p className="text-[10px] text-muted-foreground">
                DIR = Disparate Impact Ratio (EEOC 4/5ths rule). A group fails
                if its selection rate is less than {" "}
                <span className="font-semibold">threshold%</span> of the highest-rate group.
                Attributes without stored data are flagged for transparency.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Shortlist sub-components (unchanged from Phase 1) ────────────────────────

function ScoreBar({
  label, raw, weighted, evidenceCount, confidence,
}: {
  label: string; raw: number; weighted: number; evidenceCount: number; confidence: number;
}) {
  const pct = Math.round(raw * 100);
  const confColor =
    confidence >= 0.75 ? "text-emerald-400"
    : confidence >= 0.5 ? "text-amber-400"
    : "text-red-400";
  const barColor =
    pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
        <div className="flex items-center gap-3 text-[11px]">
          <span className={cn("font-semibold", confColor)}>
            {Math.round(confidence * 100)}% conf.
          </span>
          <span className="text-muted-foreground/60">{evidenceCount} ev.</span>
          <span className="font-mono font-bold text-foreground">{pct}%</span>
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className={cn("h-full rounded-full", barColor)}
        />
      </div>
    </div>
  );
}

function CandidateShortlistRow({
  app, rank, expanded, onToggle,
}: {
  app: Application; rank: number; expanded: boolean; onToggle: () => void;
}) {
  const c = app.candidate;
  const score = app.matchScore ?? 0;
  const scoreColor =
    score >= 80 ? "text-emerald-400"
    : score >= 60 ? "text-amber-400"
    : "text-red-400";

  return (
    <div
      className={cn(
        "glass rounded-xl overflow-hidden transition-all",
        expanded && "ring-1 ring-primary/20 glow-blue",
      )}
    >
      {/* Summary row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-primary/5 transition-colors"
      >
        {/* Rank badge */}
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
            rank === 1
              ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30"
              : rank === 2
              ? "bg-slate-500/20 text-slate-300 ring-1 ring-slate-500/30"
              : rank === 3
              ? "bg-orange-900/20 text-orange-400 ring-1 ring-orange-900/30"
              : "bg-muted/40 text-muted-foreground",
          )}
        >
          {rank === 1 ? "★" : rank}
        </div>

        {/* Avatar */}
        <Avatar className="h-10 w-10 shrink-0">
          {!app.isAnonymized && (
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials(c.name)}
            </AvatarFallback>
          )}
          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
            ?
          </AvatarFallback>
        </Avatar>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-semibold text-foreground truncate">
              {app.isAnonymized ? c.alias : c.name}
            </p>
            {app.isAnonymized ? (
              <ShieldOff className="h-3.5 w-3.5 text-amber-400/70 shrink-0" />
            ) : (
              <Shield className="h-3.5 w-3.5 text-emerald-400/70 shrink-0" />
            )}
          </div>
          <p className="text-[12px] text-muted-foreground truncate">
            {c.title} · {c.location}
          </p>
        </div>

        {/* Mini score bars (collapsed) */}
        <div className="hidden md:flex flex-1 max-w-xs flex-col gap-1">
          {app.matchScores?.slice(0, 2).map((s) => (
            <div key={s.dimension} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground/60 w-24 truncate shrink-0">
                {s.dimension}
              </span>
              <div className="flex-1 h-1 rounded-full bg-muted/40 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full",
                    Math.round(s.raw * 100) >= 75 ? "bg-emerald-500" : "bg-amber-500",
                  )}
                  style={{ width: `${Math.round(s.raw * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Score */}
        <div className="text-right shrink-0">
          <p className={cn("font-mono text-2xl font-bold tracking-tight", scoreColor)}>
            {score}
          </p>
          <p className="text-[10px] text-muted-foreground">match score</p>
        </div>

        {/* Confidence */}
        <div className="text-right shrink-0 hidden sm:block">
          <p
            className={cn(
              "text-[13px] font-semibold",
              (app.matchConfidence ?? 0) >= 0.75 ? "text-emerald-400" : "text-amber-400",
            )}
          >
            {Math.round((app.matchConfidence ?? 0) * 100)}%
          </p>
          <p className="text-[10px] text-muted-foreground">confidence</p>
        </div>

        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>

      {/* Expanded explanation panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/40 p-5 space-y-5">
              {/* Score breakdown */}
              {app.matchScores && (
                <div className="space-y-3">
                  <h4 className="text-[12px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    Score Breakdown
                  </h4>
                  {app.matchScores.map((s) => (
                    <ScoreBar
                      key={s.dimension}
                      label={s.dimension}
                      raw={s.raw}
                      weighted={s.weighted}
                      evidenceCount={s.evidenceCount}
                      confidence={s.confidence}
                    />
                  ))}
                </div>
              )}

              {/* AI rationale */}
              {app.explanation && (
                <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/70 mb-1.5">
                    AI Rationale
                  </p>
                  <p className="text-[13px] text-foreground leading-relaxed">
                    {app.explanation}
                  </p>
                </div>
              )}

              {/* Evidence pills */}
              {c.evidenceItems.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
                    Evidence Used
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {c.evidenceItems.map((ev) => (
                      <span
                        key={ev.id}
                        className="evidence-pill max-w-[200px] truncate"
                        title={ev.extractedText}
                      >
                        {ev.extractedText.slice(0, 50)}…
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Bias flags */}
              {app.biasFlags && app.biasFlags.length > 0 && (
                <div className="rounded-lg bg-amber-500/5 border border-amber-500/15 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-400/70 mb-1.5">
                    Bias Flags
                  </p>
                  {app.biasFlags.map((flag) => (
                    <div
                      key={flag.rule}
                      className="flex items-center gap-2 text-[13px] text-amber-400"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      {flag.description}
                    </div>
                  ))}
                </div>
              )}

              {/* Row actions */}
              <div className="flex items-center gap-2 pt-1">
                <Link href={`/candidates/${c.id}`}>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                    <Eye className="h-3.5 w-3.5" /> Full Profile
                  </Button>
                </Link>
                <Button
                  size="sm"
                  className="h-8 gap-1.5 text-xs bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Advance
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="h-3.5 w-3.5" /> Remove
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ScreeningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const orgCtx =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("paths_org") ?? "{}")
      : {};
  const orgId: string = orgCtx?.organization_id ?? "";

  // ── Data ────────────────────────────────────────────────────────────────
  const { data: job, isLoading: jobLoading } = useJobDetail(id);
  const { data: shortlist = [] } = useShortlist(id);

  // Phase 2: run trigger + run state
  const { mutateAsync: runScreening, isPending: runPending } = useRunScreening(id);
  const [latestRunId, setLatestRunId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Propose shortlist (existing HITL flow)
  const [proposalSuccess, setProposalSuccess] = useState(false);
  const proposeShortlist = useProposeShortlist();

  const [expandedId, setExpandedId] = useState<string | null>(
    shortlist[0]?.id ?? null,
  );

  const toggle = (appId: string) =>
    setExpandedId((cur) => (cur === appId ? null : appId));

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handleRunScreening() {
    if (!orgId) {
      toast.error("Organization not found — please log in again.");
      return;
    }
    try {
      const result = await runScreening({ organization_id: orgId, top_k: 10 });
      const runId =
        (result as Record<string, unknown>)?.screening_run_id as string | undefined;
      if (runId) {
        setLatestRunId(runId);
        toast.success("Screening started — check status below.");
      } else {
        toast.success("Screening triggered.");
      }
    } catch {
      toast.error("Failed to start screening run");
    }
  }

  function handleRefreshRun() {
    setRefreshKey((k) => k + 1);
  }

  const handleProposeShortlist = () => {
    proposeShortlist.mutate(id, {
      onSuccess: () => setProposalSuccess(true),
    });
  };

  // ── Loading ────────────────────────────────────────────────────────────
  if (jobLoading) {
    return (
      <div className="flex flex-col gap-5 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* ── Sticky top bar ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/candidates">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2"
            >
              ← Back
            </Button>
          </Link>
          <div className="h-5 w-px bg-border/50" />
          <div>
            <h1 className="font-heading text-base font-bold text-foreground">
              Screening — {job?.title ?? "…"}
            </h1>
            <p className="text-[12px] text-muted-foreground">
              Top-{shortlist.length} shortlist · Evidence-ranked
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="gap-1.5 border-primary/20 text-primary text-[11px]"
          >
            <Layers className="h-3 w-3" /> Anonymized scoring
          </Badge>

          {/* Run Screening button */}
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            onClick={handleRunScreening}
            disabled={runPending || !orgId}
            title={!orgId ? "Organisation ID missing" : "Run AI screening on all applicants"}
          >
            {runPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            {runPending ? "Running…" : "Run Screening"}
          </Button>

          {proposalSuccess ? (
            <Badge
              variant="outline"
              className="gap-1.5 border-emerald-500/30 text-emerald-400 h-8 px-3"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Submitted for Approval
            </Badge>
          ) : (
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs glow-blue"
              onClick={handleProposeShortlist}
              disabled={proposeShortlist.isPending || shortlist.length === 0}
            >
              {proposeShortlist.isPending ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
              ) : (
                <CheckSquare className="h-3.5 w-3.5" />
              )}
              Propose Shortlist
            </Button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-5 max-w-4xl">
        {/* Job Header / Tabs / Stats */}
        {job && (
          <>
            <JobHeader job={job} />
            <JobTabBar jobId={id} />
            <JobStatsStrip stats={job.stats} />
          </>
        )}

        {/* ── Screening Run Status ───────────────────────────────────────── */}
        {latestRunId && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Latest Screening Run</h2>
            </div>
            <ScreeningRunCard
              key={refreshKey}
              runId={latestRunId}
              onRefresh={handleRefreshRun}
              refreshing={false}
            />
          </div>
        )}

        {/* ── Bias Report ───────────────────────────────────────────────── */}
        {latestRunId && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Bias Guardrail</h2>
              <span className="text-xs text-muted-foreground">
                · EEOC 4/5ths Disparate Impact check
              </span>
            </div>
            <BiasReportPanel runId={latestRunId} />
          </div>
        )}

        {/* ── Shortlist header ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold text-foreground">
              Proposed Shortlist
            </h2>
            <p className="text-sm text-muted-foreground">
              Generated by Screening Agent · Click a row to expand the
              explanation packet
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-primary/8 px-3 py-1.5 text-[12px] font-semibold text-primary ring-1 ring-primary/15">
            <Info className="h-3.5 w-3.5" />
            Numbers from deterministic scorers · LLM provides rationale only
          </div>
        </div>

        {/* ── Shortlist rows ────────────────────────────────────────────── */}
        <div className="space-y-3">
          {shortlist.map((app, i) => (
            <CandidateShortlistRow
              key={app.id}
              app={app}
              rank={i + 1}
              expanded={expandedId === app.id}
              onToggle={() => toggle(app.id)}
            />
          ))}
          {shortlist.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/40 p-16 text-center">
              <Star className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                No shortlist yet.
              </p>
              <p className="text-xs text-muted-foreground/60">
                Click &ldquo;Run Screening&rdquo; to generate the top-K
                candidates.
              </p>
            </div>
          )}
        </div>

        {/* ── HITL approval banner ──────────────────────────────────────── */}
        {shortlist.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass gradient-border rounded-xl p-4 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                <CheckSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-heading text-sm font-semibold text-foreground">
                  Ready for HITL review
                </p>
                <p className="text-xs text-muted-foreground">
                  This shortlist was proposed by the Screening Agent. Approve
                  to unlock outreach for shortlisted candidates.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {proposalSuccess ? (
                <Badge
                  variant="outline"
                  className="gap-1.5 border-emerald-500/30 text-emerald-400 h-9 px-3"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approval Pending
                </Badge>
              ) : (
                <Button
                  size="sm"
                  className="h-9 gap-1.5 glow-blue"
                  onClick={handleProposeShortlist}
                  disabled={proposeShortlist.isPending}
                >
                  {proposeShortlist.isPending ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  Propose Shortlist
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
