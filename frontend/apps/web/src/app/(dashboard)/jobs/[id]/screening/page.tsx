"use client";

import { use, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle2, XCircle, ShieldOff, Shield, Info,
  ChevronDown, ChevronRight, Star, AlertTriangle, Layers,
  CheckSquare, Eye,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useJob, useShortlist, useProposeShortlist } from "@/lib/hooks";
import { cn } from "@/lib/utils/cn";
import { initials } from "@/lib/utils/format";
import type { Application } from "@/types";

function ScoreBar({ label, raw, weighted, evidenceCount, confidence }: {
  label: string; raw: number; weighted: number; evidenceCount: number; confidence: number;
}) {
  const pct = Math.round(raw * 100);
  const confColor = confidence >= 0.75 ? "text-emerald-400" : confidence >= 0.5 ? "text-amber-400" : "text-red-400";
  const barColor = pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
        <div className="flex items-center gap-3 text-[11px]">
          <span className={cn("font-semibold", confColor)}>{Math.round(confidence * 100)}% conf.</span>
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

function EvidencePill({ text }: { text: string }) {
  return (
    <span className="evidence-pill max-w-[200px] truncate" title={text}>{text}</span>
  );
}

function CandidateShortlistRow({
  app, rank, expanded, onToggle,
}: {
  app: Application; rank: number; expanded: boolean; onToggle: () => void;
}) {
  const c = app.candidate;
  const score = app.matchScore ?? 0;
  const scoreColor = score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400";

  return (
    <div className={cn(
      "glass rounded-xl overflow-hidden transition-all",
      expanded && "ring-1 ring-primary/20 glow-blue"
    )}>
      {/* Summary row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-primary/5 transition-colors"
      >
        {/* Rank */}
        <div className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
          rank === 1 ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30" :
          rank === 2 ? "bg-slate-500/20 text-slate-300 ring-1 ring-slate-500/30" :
          rank === 3 ? "bg-orange-900/20 text-orange-400 ring-1 ring-orange-900/30" :
          "bg-muted/40 text-muted-foreground"
        )}>
          {rank === 1 ? "★" : rank}
        </div>

        {/* Avatar */}
        <Avatar className="h-10 w-10 shrink-0">
          {!app.isAnonymized && <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
            {initials(c.name)}
          </AvatarFallback>}
          <AvatarFallback className="bg-muted text-muted-foreground text-xs">?</AvatarFallback>
        </Avatar>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-semibold text-foreground truncate">
              {app.isAnonymized ? c.alias : c.name}
            </p>
            {app.isAnonymized
              ? <ShieldOff className="h-3.5 w-3.5 text-amber-400/70 shrink-0" />
              : <Shield className="h-3.5 w-3.5 text-emerald-400/70 shrink-0" />}
          </div>
          <p className="text-[12px] text-muted-foreground truncate">{c.title} · {c.location}</p>
        </div>

        {/* Sub-score bars (collapsed) */}
        <div className="hidden md:flex flex-1 max-w-xs flex-col gap-1">
          {app.matchScores?.slice(0, 2).map((s) => (
            <div key={s.dimension} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground/60 w-24 truncate shrink-0">{s.dimension}</span>
              <div className="flex-1 h-1 rounded-full bg-muted/40 overflow-hidden">
                <div
                  className={cn("h-full rounded-full", Math.round(s.raw * 100) >= 75 ? "bg-emerald-500" : "bg-amber-500")}
                  style={{ width: `${Math.round(s.raw * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Score */}
        <div className="text-right shrink-0">
          <p className={cn("font-mono text-2xl font-bold tracking-tight", scoreColor)}>{score}</p>
          <p className="text-[10px] text-muted-foreground">match score</p>
        </div>

        {/* Confidence */}
        <div className="text-right shrink-0 hidden sm:block">
          <p className={cn(
            "text-[13px] font-semibold",
            (app.matchConfidence ?? 0) >= 0.75 ? "text-emerald-400" : "text-amber-400"
          )}>
            {Math.round((app.matchConfidence ?? 0) * 100)}%
          </p>
          <p className="text-[10px] text-muted-foreground">confidence</p>
        </div>

        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")} />
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
                  <h4 className="text-[12px] font-semibold uppercase tracking-widest text-muted-foreground/60">Score Breakdown</h4>
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

              {/* Explanation */}
              {app.explanation && (
                <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/70 mb-1.5">AI Rationale</p>
                  <p className="text-[13px] text-foreground leading-relaxed">{app.explanation}</p>
                </div>
              )}

              {/* Evidence pills */}
              {c.evidenceItems.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">Evidence Used</p>
                  <div className="flex flex-wrap gap-1.5">
                    {c.evidenceItems.map((ev) => (
                      <EvidencePill key={ev.id} text={ev.extractedText.slice(0, 50) + "…"} />
                    ))}
                  </div>
                </div>
              )}

              {/* Bias flags */}
              {app.biasFlags && app.biasFlags.length > 0 && (
                <div className="rounded-lg bg-amber-500/5 border border-amber-500/15 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-400/70 mb-1.5">Bias Flags</p>
                  {app.biasFlags.map((flag) => (
                    <div key={flag.rule} className="flex items-center gap-2 text-[13px] text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      {flag.description}
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <Link href={`/candidates/${c.id}`}>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                    <Eye className="h-3.5 w-3.5" /> Full Profile
                  </Button>
                </Link>
                <Button size="sm" className="h-8 gap-1.5 text-xs bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Advance
                </Button>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10">
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

export default function ScreeningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: job } = useJob(id);
  const { data: shortlist = [] } = useShortlist(id);
  const [expandedId, setExpandedId] = useState<string | null>(shortlist[0]?.id ?? null);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [proposalSuccess, setProposalSuccess] = useState(false);
  const proposeShortlist = useProposeShortlist();

  const toggle = (appId: string) =>
    setExpandedId((cur) => (cur === appId ? null : appId));

  const handleProposeShortlist = () => {
    proposeShortlist.mutate(id, {
      onSuccess: () => setProposalSuccess(true),
    });
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/candidates">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
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
          <Badge variant="outline" className="gap-1.5 border-primary/20 text-primary text-[11px]">
            <Layers className="h-3 w-3" /> Anonymized scoring
          </Badge>
          {proposalSuccess ? (
            <Badge variant="outline" className="gap-1.5 border-emerald-500/30 text-emerald-400 h-8 px-3">
              <CheckCircle2 className="h-3.5 w-3.5" /> Submitted for Approval
            </Badge>
          ) : (
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs glow-blue"
              onClick={handleProposeShortlist}
              disabled={proposeShortlist.isPending || shortlist.length === 0}
            >
              {proposeShortlist.isPending
                ? <span className="h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
                : <CheckSquare className="h-3.5 w-3.5" />
              }
              Propose Shortlist
            </Button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-4 max-w-4xl">
        {/* Shortlist header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold text-foreground">Proposed Shortlist</h2>
            <p className="text-sm text-muted-foreground">
              Generated by Screening Agent · Click a row to expand the explanation packet
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-primary/8 px-3 py-1.5 text-[12px] font-semibold text-primary ring-1 ring-primary/15">
            <Info className="h-3.5 w-3.5" />
            Numbers from deterministic scorers · LLM provides rationale only
          </div>
        </div>

        {/* Rows */}
        <TooltipProvider>
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
                <p className="text-sm font-medium text-muted-foreground">No shortlist yet.</p>
                <p className="text-xs text-muted-foreground/60">Run a match job to generate the top-K candidates.</p>
              </div>
            )}
          </div>
        </TooltipProvider>

        {/* HITL approval banner */}
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
                <p className="font-heading text-sm font-semibold text-foreground">Ready for HITL review</p>
                <p className="text-xs text-muted-foreground">
                  This shortlist was proposed by the Screening Agent. Approve to unlock outreach for shortlisted candidates.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {proposalSuccess ? (
                <Badge variant="outline" className="gap-1.5 border-emerald-500/30 text-emerald-400 h-9 px-3">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approval Pending
                </Badge>
              ) : (
                <Button
                  size="sm"
                  className="h-9 gap-1.5 glow-blue"
                  onClick={handleProposeShortlist}
                  disabled={proposeShortlist.isPending}
                >
                  {proposeShortlist.isPending
                    ? <span className="h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
                    : <CheckCircle2 className="h-3.5 w-3.5" />
                  }
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
