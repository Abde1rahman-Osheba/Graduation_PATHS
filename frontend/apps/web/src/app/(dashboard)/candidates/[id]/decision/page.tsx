"use client";

import { use, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft, Brain, CheckCircle2, XCircle, AlertCircle,
  ChevronDown, ChevronUp, Sparkles, Mail, Send,
  ThumbsUp, ThumbsDown, FileText, Loader2, RefreshCw,
  TrendingUp, Shield, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/lib/stores/auth.store";
import {
  useDSSLatestPacket,
  useGenerateDSSPacket,
  useHrDecision,
  useGenerateDevPlan,
  useDSSDevPlan,
  useGenerateDSSEmail,
  useDSSEmail,
  useApproveDSSEmail,
  useSendDSSEmail,
  useApplications,
} from "@/lib/hooks";
import { IdssPanel } from "@/components/idss/idss-panel";

// ── Helpers ─────────────────────────────────────────────────────────────────

const RECOMMENDATION_CONFIG = {
  hire: {
    label: "Recommend Hire",
    color: "text-emerald-400",
    border: "border-emerald-500/30 bg-emerald-500/10",
    icon: CheckCircle2,
    glow: "shadow-emerald-500/20",
  },
  reject: {
    label: "Recommend Reject",
    color: "text-rose-400",
    border: "border-rose-500/30 bg-rose-500/10",
    icon: XCircle,
    glow: "shadow-rose-500/20",
  },
  consider: {
    label: "Consider (Manual Review)",
    color: "text-amber-400",
    border: "border-amber-500/30 bg-amber-500/10",
    icon: AlertCircle,
    glow: "shadow-amber-500/20",
  },
} as const;

function ScoreRing({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 75 ? "#34d399" : pct >= 50 ? "#fbbf24" : "#f87171";
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);

  return (
    <div className="relative flex h-28 w-28 items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="112" height="112">
        <circle cx="56" cy="56" r={r} fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="8" />
        <circle
          cx="56" cy="56" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div className="text-center">
        <p className="font-heading text-2xl font-bold text-foreground">{pct}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Score</p>
      </div>
    </div>
  );
}

function CriteriaBreakdown({ criteria }: { criteria: Record<string, unknown> }) {
  const entries = Object.entries(criteria).filter(([, v]) => typeof v === "number" || (v && typeof (v as Record<string, unknown>).score === "number"));

  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground">No criteria data available.</p>;
  }

  return (
    <div className="space-y-3">
      {entries.map(([key, val]) => {
        const score = typeof val === "number" ? val : (val as Record<string, unknown>).score as number;
        const pct = Math.round(score * 100);
        const barColor = pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500";
        const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        return (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-[12px]">
              <span className="font-medium text-muted-foreground">{label}</span>
              <span className="font-mono font-bold text-foreground">{pct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className={cn("h-full rounded-full", barColor)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function DecisionSupportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: candidateId } = use(params);
  const { user } = useAuthStore();
  const orgId = user?.orgId ?? "";

  const [hrNotes, setHrNotes] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [showOverride, setShowOverride] = useState(false);
  const [emailBody, setEmailBody] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailEditing, setEmailEditing] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");

  // Get candidate's application
  const { data: allApps = [] } = useApplications();
  const candidateApp = allApps.find((a) => a.candidateId === candidateId);
  const applicationId = candidateApp?.id ?? "";
  const jobId = candidateApp?.jobId ?? "";

  // DSS queries
  const { data: packet, isLoading: packetLoading, error: packetError } =
    useDSSLatestPacket(applicationId, orgId);

  const packetId = (packet?.id ?? packet?.packet_id) ?? "";

  const { data: devPlan, isLoading: devPlanLoading } = useDSSDevPlan(packetId, orgId, !!packetId);
  const { data: dssEmail, isLoading: emailLoading } = useDSSEmail(packetId, orgId, !!packetId);

  // Mutations
  const generatePacket = useGenerateDSSPacket();
  const hrDecision = useHrDecision();
  const generateDevPlan = useGenerateDevPlan();
  const generateEmail = useGenerateDSSEmail();
  const approveEmail = useApproveDSSEmail();
  const sendEmail = useSendDSSEmail();

  // Recommendation config
  const recKey = (packet?.recommendation ?? "consider") as keyof typeof RECOMMENDATION_CONFIG;
  const rec = RECOMMENDATION_CONFIG[recKey] ?? RECOMMENDATION_CONFIG.consider;
  const RecIcon = rec.icon;

  const handleGenerate = () => {
    if (!applicationId || !orgId) return;
    generatePacket.mutate({
      orgId,
      applicationId,
      candidateId,
      jobId,
    });
  };

  const handleHireDecision = (decision: "hire" | "reject") => {
    if (!packetId || !orgId) return;
    hrDecision.mutate({
      packetId,
      orgId,
      finalDecision: decision,
      hrNotes: hrNotes || undefined,
      overrideReason: showOverride ? overrideReason : undefined,
    });
  };

  const handleGenerateDevPlan = () => {
    if (!packetId || !orgId) return;
    generateDevPlan.mutate({ packetId, orgId });
  };

  const handleGenerateEmail = (type: "acceptance" | "rejection") => {
    if (!packetId || !orgId) return;
    generateEmail.mutate({ packetId, orgId, emailType: type });
  };

  const handleApproveEmail = () => {
    if (!packetId || !orgId) return;
    approveEmail.mutate({ packetId, orgId });
  };

  const handleSendEmail = () => {
    if (!packetId || !orgId || !recipientEmail) return;
    sendEmail.mutate({ packetId, orgId });
  };

  // Sync email body from query data
  if (dssEmail && !emailEditing) {
    if (dssEmail.subject !== emailSubject) setEmailSubject(dssEmail.subject);
    if (dssEmail.body !== emailBody) setEmailBody(dssEmail.body);
  }

  const packetJson = packet?.packet_json ?? {};
  const criteria = (packetJson as Record<string, unknown>).criteria_breakdown as Record<string, unknown> | undefined;
  const strengths = (packetJson as Record<string, unknown>).strengths as string[] | undefined;
  const gaps = (packetJson as Record<string, unknown>).gaps as string[] | undefined;
  const devPlanJson = devPlan?.plan_json as Record<string, unknown> | undefined;

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm px-6 py-3 flex items-center gap-3">
        <Link href={`/candidates/${candidateId}`}>
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground -ml-2">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Profile
          </Button>
        </Link>
        <div className="h-4 w-px bg-border/60" />
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h1 className="font-heading text-sm font-bold text-foreground">Decision Support</h1>
        </div>
        <Badge variant="outline" className="ml-auto border-primary/30 bg-primary/10 text-primary text-[10px]">
          AI-Assisted · HR Final Say
        </Badge>
      </div>

      <div className="p-6 max-w-4xl space-y-6">

        {/* Generate button (no packet yet) */}
        {!packetLoading && !packet && !packetError && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass gradient-border rounded-2xl p-8 text-center"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h2 className="font-heading text-lg font-bold text-foreground mb-2">Generate AI Decision Packet</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              PATHS will analyze the full candidate journey — CV, scoring, interview, compliance — and generate an explainable recommendation packet.
            </p>
            <Button
              className="glow-blue gap-2"
              onClick={handleGenerate}
              disabled={generatePacket.isPending || !applicationId}
            >
              {generatePacket.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                : <><Sparkles className="h-4 w-4" /> Generate Packet</>}
            </Button>
            {!applicationId && (
              <p className="mt-3 text-xs text-rose-400">No application found for this candidate.</p>
            )}
          </motion.div>
        )}

        {/* Loading state */}
        {packetLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error (no packet, 404 after app load) */}
        {packetError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass gradient-border rounded-2xl p-8 text-center"
          >
            <AlertCircle className="mx-auto mb-3 h-10 w-10 text-amber-400" />
            <p className="text-sm text-muted-foreground mb-4">No decision packet found for this application yet.</p>
            <Button className="glow-blue gap-2" onClick={handleGenerate} disabled={generatePacket.isPending || !applicationId}>
              {generatePacket.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                : <><Sparkles className="h-4 w-4" /> Generate Packet</>}
            </Button>
          </motion.div>
        )}

        {/* Packet loaded */}
        {packet && (
          <>
            {/* IDSS v2 panel (9-stage rubric, manager actions, dev plan, PDF) */}
            {packetId && applicationId && candidateApp?.jobId && (
              <IdssPanel
                packetId={packetId}
                orgId={orgId}
                candidateId={candidateId}
                jobId={candidateApp.jobId}
              />
            )}
            {/* Recommendation card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("glass rounded-2xl p-6 border", rec.border)}
            >
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <ScoreRing score={packet.final_journey_score ?? 0} />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <RecIcon className={cn("h-5 w-5", rec.color)} />
                    <h2 className={cn("font-heading text-xl font-bold", rec.color)}>{rec.label}</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {packet.confidence != null && (
                      <Badge variant="outline" className="border-muted/30 text-muted-foreground text-[10px]">
                        Confidence {Math.round((packet.confidence) * 100)}%
                      </Badge>
                    )}
                    {packet.compliance_status && (
                      <Badge
                        variant="outline"
                        className={cn("text-[10px]",
                          packet.compliance_status === "pass"
                            ? "border-emerald-500/30 text-emerald-400"
                            : "border-rose-500/30 text-rose-400"
                        )}
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        Compliance: {packet.compliance_status}
                      </Badge>
                    )}
                    {packet.human_review_required && (
                      <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-[10px]">
                        Human Review Required
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs text-muted-foreground"
                    onClick={handleGenerate}
                    disabled={generatePacket.isPending}
                  >
                    <RefreshCw className={cn("h-3 w-3", generatePacket.isPending && "animate-spin")} />
                    Regenerate
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Criteria breakdown */}
            {criteria && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass gradient-border rounded-2xl p-6"
              >
                <h3 className="font-heading text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Criteria Breakdown
                </h3>
                <CriteriaBreakdown criteria={criteria} />
              </motion.div>
            )}

            {/* Strengths & Gaps */}
            {(strengths?.length || gaps?.length) && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2"
              >
                {strengths?.length ? (
                  <div className="glass gradient-border rounded-2xl p-5">
                    <h4 className="font-heading text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">Strengths</h4>
                    <ul className="space-y-2">
                      {strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-[13px] text-muted-foreground">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {gaps?.length ? (
                  <div className="glass gradient-border rounded-2xl p-5">
                    <h4 className="font-heading text-xs font-bold text-rose-400 uppercase tracking-wider mb-3">Gaps</h4>
                    <ul className="space-y-2">
                      {gaps.map((g, i) => (
                        <li key={i} className="flex items-start gap-2 text-[13px] text-muted-foreground">
                          <XCircle className="h-3.5 w-3.5 text-rose-400 mt-0.5 shrink-0" />
                          {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </motion.div>
            )}

            {/* Development Plan */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass gradient-border rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Development Plan
                </h3>
                {!devPlan && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={handleGenerateDevPlan}
                    disabled={generateDevPlan.isPending || devPlanLoading}
                  >
                    {generateDevPlan.isPending || devPlanLoading
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Sparkles className="h-3 w-3" />}
                    Generate Plan
                  </Button>
                )}
              </div>

              {devPlan ? (
                <div className="space-y-3">
                  {devPlan.summary && (
                    <p className="text-[13px] text-muted-foreground leading-relaxed">{devPlan.summary}</p>
                  )}
                  {devPlanJson && Object.keys(devPlanJson).length > 0 && (
                    <div className="rounded-xl bg-muted/20 border border-border/40 p-4 text-[12px] text-muted-foreground space-y-2">
                      {Object.entries(devPlanJson).map(([k, v]) => (
                        <div key={k}>
                          <span className="font-semibold text-foreground">{k.replace(/_/g, " ")}:</span>{" "}
                          {Array.isArray(v) ? v.join(", ") : String(v)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[13px] text-muted-foreground">
                  Generate a personalized development plan for this candidate — whether hired or for future re-engagement.
                </p>
              )}
            </motion.div>

            {/* Decision Email */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="glass gradient-border rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" /> Decision Email
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={() => handleGenerateEmail("acceptance")}
                    disabled={generateEmail.isPending}
                  >
                    {generateEmail.isPending
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Sparkles className="h-3 w-3 text-emerald-400" />}
                    Acceptance
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={() => handleGenerateEmail("rejection")}
                    disabled={generateEmail.isPending}
                  >
                    {generateEmail.isPending
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Sparkles className="h-3 w-3 text-rose-400" />}
                    Rejection
                  </Button>
                </div>
              </div>

              {dssEmail ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]",
                        dssEmail.status === "approved"
                          ? "border-emerald-500/30 text-emerald-400"
                          : dssEmail.status === "sent"
                          ? "border-primary/30 text-primary"
                          : "border-amber-500/30 text-amber-400"
                      )}
                    >
                      {dssEmail.status}
                    </Badge>
                    {dssEmail.email_type && (
                      <Badge variant="outline" className="text-[10px] border-muted/30 text-muted-foreground">
                        {dssEmail.email_type}
                      </Badge>
                    )}
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Subject</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                      value={emailSubject}
                      onChange={(e) => { setEmailSubject(e.target.value); setEmailEditing(true); }}
                    />
                  </div>

                  {/* Body */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Body</label>
                    <textarea
                      rows={8}
                      className="mt-1 w-full rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 resize-y"
                      value={emailBody}
                      onChange={(e) => { setEmailBody(e.target.value); setEmailEditing(true); }}
                    />
                  </div>

                  {/* Recipient */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recipient Email</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                      placeholder="candidate@email.com"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      onClick={handleApproveEmail}
                      disabled={approveEmail.isPending || dssEmail.status === "approved"}
                    >
                      {approveEmail.isPending
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5 text-xs glow-blue"
                      onClick={handleSendEmail}
                      disabled={sendEmail.isPending || !recipientEmail || dssEmail.status === "sent"}
                    >
                      {sendEmail.isPending
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <Send className="h-3 w-3" />}
                      Send
                    </Button>
                    {sendEmail.isSuccess && (
                      <span className="text-[11px] text-emerald-400">Email sent!</span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-[13px] text-muted-foreground">
                  Generate an AI-drafted acceptance or rejection email to send to the candidate.
                </p>
              )}
            </motion.div>

            {/* HR Final Decision */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass gradient-border rounded-2xl p-6"
            >
              <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2 mb-4">
                <User className="h-4 w-4 text-primary" /> HR Final Decision (HITL)
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Notes (optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Add your review notes here…"
                    value={hrNotes}
                    onChange={(e) => setHrNotes(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none"
                  />
                </div>

                <button
                  onClick={() => setShowOverride(!showOverride)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showOverride ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  Override AI recommendation
                </button>

                <AnimatePresence>
                  {showOverride && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <textarea
                        rows={2}
                        placeholder="Reason for overriding AI recommendation…"
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        className="w-full rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-400/40 resize-none"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center gap-3">
                  <Button
                    className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
                    onClick={() => handleHireDecision("hire")}
                    disabled={hrDecision.isPending}
                  >
                    {hrDecision.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <ThumbsUp className="h-4 w-4" />}
                    Confirm Hire
                  </Button>
                  <Button
                    className="flex-1 gap-2 bg-rose-700 hover:bg-rose-600 text-white"
                    onClick={() => handleHireDecision("reject")}
                    disabled={hrDecision.isPending}
                  >
                    {hrDecision.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <ThumbsDown className="h-4 w-4" />}
                    Confirm Reject
                  </Button>
                </div>

                {hrDecision.isSuccess && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-sm font-medium text-emerald-400"
                  >
                    Decision recorded. The candidate journey is complete.
                  </motion.p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
