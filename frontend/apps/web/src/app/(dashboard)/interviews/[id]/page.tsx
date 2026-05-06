"use client";

import { use, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft, Brain, Video, Clock, CheckCircle2, XCircle,
  Loader2, Sparkles, ChevronDown, ChevronUp, Mic,
  FileText, User, ThumbsUp, ThumbsDown, AlertCircle,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/lib/stores/auth.store";
import {
  useInterviewQuestions,
  useGenerateInterviewQuestions,
  useApproveInterviewQuestions,
  useUploadTranscript,
  useAnalyzeInterview,
  useInterviewHumanDecision,
} from "@/lib/hooks";

// ── Question pack display ─────────────────────────────────────────────────────

function QuestionPack({
  pack,
  onApprove,
  approving,
}: {
  pack: {
    id: string;
    question_pack_type: string;
    questions_json: Record<string, unknown> | null;
    approved_by_hr: boolean;
    approved_at: string | null;
  };
  onApprove: (approved: boolean) => void;
  approving: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const questions = pack.questions_json
    ? (Object.values(pack.questions_json).flat() as string[]).filter((q) => typeof q === "string")
    : [];

  return (
    <div className="rounded-xl border border-border/40 bg-muted/10 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <span className="font-heading text-[13px] font-bold text-foreground capitalize">
            {pack.question_pack_type} Questions
          </span>
          {pack.approved_by_hr && (
            <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">Approved</Badge>
          )}
        </div>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {questions.length > 0 ? (
                <ol className="space-y-2 list-decimal list-inside">
                  {questions.map((q, i) => (
                    <li key={i} className="text-[13px] text-muted-foreground leading-relaxed">{q}</li>
                  ))}
                </ol>
              ) : (
                <p className="text-[12px] text-muted-foreground italic">No questions generated yet.</p>
              )}

              {!pack.approved_by_hr && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs mt-2"
                  onClick={() => onApprove(true)}
                  disabled={approving}
                >
                  {approving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckSquare className="h-3 w-3 text-emerald-400" />}
                  Approve Questions
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Analysis section ──────────────────────────────────────────────────────────

function AnalysisSection({ analysis }: { analysis: {
  summary: { summary_json: Record<string, unknown>; created_at: string } | null;
  hr_evaluation: { score_json: Record<string, unknown> | null; recommendation: string | null; confidence: number | null } | null;
  technical_evaluation: { score_json: Record<string, unknown> | null; recommendation: string | null; confidence: number | null } | null;
  decision_packet: { recommendation: string | null; final_score: number | null; confidence: number | null } | null;
} }) {
  const { summary, hr_evaluation, technical_evaluation, decision_packet } = analysis;

  const recColor = (r: string | null) =>
    r === "proceed" || r === "hire" ? "text-emerald-400"
    : r === "reject" ? "text-rose-400"
    : "text-amber-400";

  return (
    <div className="space-y-4">
      {/* Summary */}
      {summary && (
        <div className="rounded-xl border border-border/40 bg-muted/10 p-4">
          <h4 className="font-heading text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Interview Summary</h4>
          <div className="text-[13px] text-muted-foreground space-y-1">
            {Object.entries(summary.summary_json).map(([k, v]) => (
              <div key={k}>
                <span className="font-semibold text-foreground">{k.replace(/_/g, " ")}:</span>{" "}
                {Array.isArray(v) ? v.join(", ") : String(v)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evaluations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {hr_evaluation && (
          <div className="rounded-xl border border-border/40 bg-muted/10 p-4">
            <h4 className="font-heading text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2">HR Evaluation</h4>
            <p className={cn("text-lg font-bold font-heading capitalize", recColor(hr_evaluation.recommendation))}>
              {hr_evaluation.recommendation ?? "N/A"}
            </p>
            {hr_evaluation.confidence != null && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Confidence: {Math.round(hr_evaluation.confidence * 100)}%
              </p>
            )}
          </div>
        )}
        {technical_evaluation && (
          <div className="rounded-xl border border-border/40 bg-muted/10 p-4">
            <h4 className="font-heading text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Technical Evaluation</h4>
            <p className={cn("text-lg font-bold font-heading capitalize", recColor(technical_evaluation.recommendation))}>
              {technical_evaluation.recommendation ?? "N/A"}
            </p>
            {technical_evaluation.confidence != null && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Confidence: {Math.round(technical_evaluation.confidence * 100)}%
              </p>
            )}
          </div>
        )}
      </div>

      {/* Decision packet */}
      {decision_packet && (
        <div className={cn(
          "rounded-xl border p-4",
          decision_packet.recommendation === "hire" || decision_packet.recommendation === "proceed"
            ? "border-emerald-500/30 bg-emerald-500/5"
            : decision_packet.recommendation === "reject"
            ? "border-rose-500/30 bg-rose-500/5"
            : "border-amber-500/30 bg-amber-500/5"
        )}>
          <h4 className="font-heading text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2">AI Decision Packet</h4>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[11px] text-muted-foreground">Recommendation</p>
              <p className={cn("font-heading text-base font-bold capitalize", recColor(decision_packet.recommendation))}>
                {decision_packet.recommendation ?? "N/A"}
              </p>
            </div>
            {decision_packet.final_score != null && (
              <div>
                <p className="text-[11px] text-muted-foreground">Score</p>
                <p className="font-heading text-base font-bold text-foreground">
                  {Math.round(decision_packet.final_score * 100)}%
                </p>
              </div>
            )}
            {decision_packet.confidence != null && (
              <div>
                <p className="text-[11px] text-muted-foreground">Confidence</p>
                <p className="font-heading text-base font-bold text-foreground">
                  {Math.round(decision_packet.confidence * 100)}%
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function InterviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: interviewId } = use(params);
  const { user } = useAuthStore();
  const orgId = user?.orgId ?? "";

  const [transcriptText, setTranscriptText] = useState("");
  const [hrNotes, setHrNotes] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [analysisResult, setAnalysisResult] = useState<Parameters<typeof AnalysisSection>[0]["analysis"] | null>(null);

  // Queries
  const { data: questionsData, isLoading: questionsLoading } = useInterviewQuestions(interviewId, orgId);

  // Mutations
  const generateQuestions = useGenerateInterviewQuestions();
  const approveQuestions = useApproveInterviewQuestions();
  const uploadTranscript = useUploadTranscript();
  const analyzeInterview = useAnalyzeInterview();
  const humanDecision = useInterviewHumanDecision();

  const handleGenerateQuestions = () => {
    generateQuestions.mutate({
      interviewId,
      orgId,
      includeHr: true,
      includeTechnical: true,
    });
  };

  const handleApproveQuestions = (packId: string, approved: boolean) => {
    approveQuestions.mutate({ interviewId, orgId, approved });
  };

  const handleUploadTranscript = () => {
    if (!transcriptText.trim()) return;
    uploadTranscript.mutate({
      interviewId,
      orgId,
      transcriptText,
      transcriptSource: "manual",
    });
  };

  const handleAnalyze = () => {
    analyzeInterview.mutate(
      { interviewId, orgId },
      {
        onSuccess: (data) => {
          setAnalysisResult({
            summary: data.summary
              ? { summary_json: data.summary.summary_json, created_at: data.summary.created_at }
              : null,
            hr_evaluation: data.hr_evaluation
              ? {
                  score_json: data.hr_evaluation.score_json,
                  recommendation: data.hr_evaluation.recommendation,
                  confidence: data.hr_evaluation.confidence,
                }
              : null,
            technical_evaluation: data.technical_evaluation
              ? {
                  score_json: data.technical_evaluation.score_json,
                  recommendation: data.technical_evaluation.recommendation,
                  confidence: data.technical_evaluation.confidence,
                }
              : null,
            decision_packet: data.decision_packet
              ? {
                  recommendation: data.decision_packet.recommendation,
                  final_score: data.decision_packet.final_score,
                  confidence: data.decision_packet.confidence,
                }
              : null,
          });
        },
      },
    );
  };

  const handleHumanDecision = (decision: "proceed" | "reject") => {
    humanDecision.mutate({
      interviewId,
      orgId,
      finalDecision: decision,
      hrNotes: hrNotes || undefined,
      overrideReason: overrideReason || undefined,
    });
  };

  const packs = questionsData?.packs ?? [];

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm px-6 py-3 flex items-center gap-3">
        <Link href="/interviews">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground -ml-2">
            <ArrowLeft className="h-3.5 w-3.5" /> Interviews
          </Button>
        </Link>
        <div className="h-4 w-px bg-border/60" />
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <span className="font-heading text-sm font-bold text-foreground">Interview #{interviewId.slice(0, 8)}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link href={`/interviews/${interviewId}/run`}>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5" /> AI Runtime
            </Button>
          </Link>
          <Link href={`/interviews/${interviewId}/report`}>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" /> AI Report
            </Button>
          </Link>
        </div>
      </div>

      <div className="p-6 max-w-4xl space-y-6">

        {/* ── Question Packs ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass gradient-border rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" /> AI Question Packs
            </h3>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={handleGenerateQuestions}
              disabled={generateQuestions.isPending}
            >
              {generateQuestions.isPending
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <Sparkles className="h-3 w-3 text-primary" />}
              {packs.length > 0 ? "Regenerate" : "Generate Questions"}
            </Button>
          </div>

          {questionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : packs.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              Generate AI-powered question packs tailored to this candidate&apos;s profile and the job requirements.
            </p>
          ) : (
            <div className="space-y-3">
              {packs.map((pack) => (
                <QuestionPack
                  key={pack.id}
                  pack={pack}
                  onApprove={(approved) => handleApproveQuestions(pack.id, approved)}
                  approving={approveQuestions.isPending}
                />
              ))}
            </div>
          )}

          {generateQuestions.isSuccess && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-xs text-emerald-400">
              Question packs generated successfully.
            </motion.p>
          )}
        </motion.div>

        {/* ── Transcript Upload ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass gradient-border rounded-2xl p-6"
        >
          <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2 mb-4">
            <Mic className="h-4 w-4 text-primary" /> Interview Transcript
          </h3>

          <p className="text-[13px] text-muted-foreground mb-3">
            Paste or type the interview transcript. PATHS will analyze it with AI to generate evaluations and a decision packet.
          </p>

          <textarea
            rows={8}
            placeholder="Interviewer: Tell me about your experience with distributed systems…&#10;Candidate: At my last role I designed a microservices architecture…"
            value={transcriptText}
            onChange={(e) => setTranscriptText(e.target.value)}
            className="w-full rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary/40 resize-y"
          />

          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={handleUploadTranscript}
              disabled={uploadTranscript.isPending || !transcriptText.trim()}
            >
              {uploadTranscript.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
              Save Transcript
            </Button>
            {uploadTranscript.isSuccess && (
              <span className="text-xs text-emerald-400">Transcript saved.</span>
            )}
          </div>
        </motion.div>

        {/* ── AI Analysis ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass gradient-border rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> AI Analysis
            </h3>
            <Button
              size="sm"
              className="gap-1.5 text-xs glow-blue"
              onClick={handleAnalyze}
              disabled={analyzeInterview.isPending}
            >
              {analyzeInterview.isPending
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <Brain className="h-3 w-3" />}
              Run Analysis
            </Button>
          </div>

          {analyzeInterview.isPending && (
            <div className="flex items-center gap-2 py-6 justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Analyzing transcript…</span>
            </div>
          )}

          {analyzeInterview.isError && (
            <div className="flex items-center gap-2 text-rose-400 text-sm">
              <AlertCircle className="h-4 w-4" />
              Analysis failed. Upload a transcript first, then retry.
            </div>
          )}

          {analysisResult && !analyzeInterview.isPending && (
            <AnalysisSection analysis={analysisResult} />
          )}

          {!analysisResult && !analyzeInterview.isPending && !analyzeInterview.isError && (
            <p className="text-[13px] text-muted-foreground">
              Save a transcript above, then run AI analysis to get HR evaluations, technical scores, and a final recommendation.
            </p>
          )}
        </motion.div>

        {/* ── HR Human Decision ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass gradient-border rounded-2xl p-6"
        >
          <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-primary" /> HR Human Decision (HITL)
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">HR Notes</label>
              <textarea
                rows={3}
                placeholder="Your interview notes and observations…"
                value={hrNotes}
                onChange={(e) => setHrNotes(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Override Reason (optional)</label>
              <input
                placeholder="Reason for overriding AI recommendation…"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>

            <div className="flex gap-3">
              <Button
                className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
                onClick={() => handleHumanDecision("proceed")}
                disabled={humanDecision.isPending}
              >
                {humanDecision.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                Proceed to Next Stage
              </Button>
              <Button
                className="flex-1 gap-2 bg-rose-700 hover:bg-rose-600 text-white"
                onClick={() => handleHumanDecision("reject")}
                disabled={humanDecision.isPending}
              >
                {humanDecision.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsDown className="h-4 w-4" />}
                Reject Candidate
              </Button>
            </div>

            {humanDecision.isSuccess && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-sm font-medium text-emerald-400"
              >
                Decision recorded successfully.
              </motion.p>
            )}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
