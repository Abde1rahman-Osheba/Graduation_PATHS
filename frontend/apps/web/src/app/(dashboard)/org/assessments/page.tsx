"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardCheck, Loader2, Plus, X, Clock, CheckCircle2,
  AlertCircle, User, Briefcase, FileText, AlertTriangle,
  HelpCircle, Code, ThumbsUp, ThumbsDown, XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import {
  useAssessments,
  useCreateAssessment,
  useUpdateAssessment,
  useDeleteAssessment,
} from "@/lib/hooks";
import type { BackendAssessmentOut } from "@/lib/api";

const statusColor: Record<string, string> = {
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  submitted: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  reviewed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
};

const statusIcon: Record<string, typeof Clock> = {
  pending: Clock,
  submitted: CheckCircle2,
  reviewed: AlertCircle,
};

const typeIcon: Record<string, typeof FileText> = {
  coding: Code,
  quiz: HelpCircle,
  essay: FileText,
  mcq: HelpCircle,
  problem_solving: Code,
  take_home: FileText,
  portfolio: FileText,
  phone_screen: Briefcase,
};

const typeLabel: Record<string, string> = {
  coding: "Coding",
  quiz: "Quiz",
  essay: "Essay",
  mcq: "Multiple Choice",
  problem_solving: "Problem Solving",
  take_home: "Take Home",
  portfolio: "Portfolio Review",
  phone_screen: "Phone Screen",
};

function AiWarningBanner() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
      <p className="text-[11px] text-amber-300/90 leading-relaxed">
        Candidates must complete all assessments without AI assistance. Violations may result in disqualification.
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const Icon = statusIcon[s] ?? Clock;
  return (
    <Badge variant="outline" className={cn("text-[10px] gap-1", statusColor[s] ?? statusColor.pending)}>
      <Icon className="h-3 w-3" />
      {s}
    </Badge>
  );
}

function HitlBadge({ decision }: { decision: string | null | undefined }) {
  if (!decision) return null;
  const isPass = decision === "pass";
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] gap-1",
        isPass
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : "border-red-500/30 bg-red-500/10 text-red-400",
      )}
    >
      {isPass ? <ThumbsUp className="h-3 w-3" /> : <ThumbsDown className="h-3 w-3" />}
      {isPass ? "Pass" : "Fail"}
    </Badge>
  );
}

function ScoreDisplay({ score, maxScore, scorePercent }: { score: number | null; maxScore: number | null; scorePercent: number | null }) {
  if (scorePercent !== null) {
    const color = scorePercent >= 80 ? "text-emerald-400" : scorePercent >= 60 ? "text-amber-400" : "text-red-400";
    return (
      <span className={cn("text-sm font-bold tabular-nums", color)}>
        {Math.round(scorePercent)}%
      </span>
    );
  }
  if (score !== null) {
    return <span className="text-sm text-muted-foreground">{score} / {maxScore ?? "?"}</span>;
  }
  return <span className="text-xs text-muted-foreground">&mdash;</span>;
}

function getCriteriaValue(cb: Record<string, unknown> | null, key: string): unknown {
  return cb && typeof cb === "object" ? (cb as Record<string, unknown>)[key] : undefined;
}

function TypePreview({ assessment }: { assessment: BackendAssessmentOut }) {
  const cb = assessment.criteria_breakdown;
  const at = assessment.assessment_type;

  if (at === "mcq" || at === "quiz") {
    const options = getCriteriaValue(cb, "options");
    if (Array.isArray(options) && options.length > 0) {
      return (
        <div className="space-y-1">
          {options.slice(0, 3).map((opt: unknown, i: number) => (
            <div key={i} className="flex items-center gap-2 text-[11px] text-muted-foreground/70">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
              {String(opt)}
            </div>
          ))}
          {options.length > 3 && (
            <p className="text-[10px] text-muted-foreground/50">+{options.length - 3} more</p>
          )}
        </div>
      );
    }
  }

  if (at === "essay") {
    const text = assessment.submission_text;
    if (text) {
      return (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground/70 line-clamp-2">{text}</p>
          <p className="text-[10px] text-muted-foreground/50">{text.length} characters</p>
        </div>
      );
    }
  }

  if (at === "problem_solving" || at === "coding") {
    const problem = getCriteriaValue(cb, "problem");
    const codeBlock = getCriteriaValue(cb, "code");
    if (problem) {
      return (
        <p className="text-xs text-muted-foreground/70 line-clamp-2 font-mono">{String(problem)}</p>
      );
    }
    if (codeBlock) {
      return (
        <pre className="text-[10px] text-muted-foreground/70 line-clamp-2 font-mono bg-black/20 rounded p-1.5 overflow-hidden">
          {String(codeBlock)}
        </pre>
      );
    }
  }

  return null;
}

function AssessmentCard({
  assessment,
  onEdit,
  onDelete,
}: {
  assessment: BackendAssessmentOut;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const Icon = typeIcon[assessment.assessment_type] ?? FileText;
  const hitlDecision = getCriteriaValue(assessment.criteria_breakdown, "hitl_decision") as string | null | undefined;

  return (
    <div className="glass rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {assessment.title}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {typeLabel[assessment.assessment_type] ?? assessment.assessment_type.replace(/_/g, " ")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <HitlBadge decision={hitlDecision} />
          <ScoreDisplay
            score={assessment.score}
            maxScore={assessment.max_score}
            scorePercent={assessment.score_percent}
          />
          <StatusBadge status={assessment.status} />
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <User className="h-3 w-3" />
          {assessment.candidate_id.slice(0, 12)}...
        </span>
        <span className="flex items-center gap-1">
          <Briefcase className="h-3 w-3" />
          {assessment.job_id.slice(0, 12)}...
        </span>
      </div>

      {assessment.instructions && (
        <p className="text-xs text-muted-foreground/70 line-clamp-2">
          {assessment.instructions}
        </p>
      )}

      <TypePreview assessment={assessment} />

      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground/50">
          {assessment.assigned_at
            ? `Assigned ${new Date(assessment.assigned_at).toLocaleDateString()}`
            : ""}
          {assessment.reviewed_at
            ? ` \u00b7 Reviewed ${new Date(assessment.reviewed_at).toLocaleDateString()}`
            : ""}
        </p>
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/10 rounded-md transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="px-2 py-1 text-[10px] font-medium text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function TypeSpecificDetails({ assessment }: { assessment: BackendAssessmentOut }) {
  const cb = assessment.criteria_breakdown;
  const at = assessment.assessment_type;

  if (at === "mcq" || at === "quiz") {
    const options = getCriteriaValue(cb, "options");
    const selected = getCriteriaValue(cb, "selected");
    if (Array.isArray(options) && options.length > 0) {
      return (
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-muted-foreground">Options / Choices</label>
          <div className="space-y-1">
            {options.map((opt: unknown, i: number) => {
              const isSelected = selected !== undefined && String(opt) === String(selected);
              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[11px]",
                    isSelected
                      ? "border-primary/30 bg-primary/5 text-foreground"
                      : "border-border/50 text-muted-foreground",
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", isSelected ? "bg-primary" : "bg-muted-foreground/30")} />
                  {String(opt)}
                  {isSelected && <CheckCircle2 className="h-3 w-3 ml-auto text-primary" />}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
  }

  if (at === "essay") {
    const text = assessment.submission_text;
    if (text) {
      return (
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-muted-foreground">
            Submission Text <span className="text-muted-foreground/50">({text.length} chars)</span>
          </label>
          <div className="rounded-md border border-border/50 bg-black/10 p-2.5">
            <p className="text-[11px] text-foreground/80 whitespace-pre-wrap leading-relaxed">{text}</p>
          </div>
        </div>
      );
    }
    return (
      <p className="text-[11px] text-muted-foreground/50 italic">No submission text provided.</p>
    );
  }

  if (at === "problem_solving" || at === "coding") {
    const problem = getCriteriaValue(cb, "problem");
    const codeBlock = getCriteriaValue(cb, "code");
    const language = getCriteriaValue(cb, "language");
    return (
      <div className="space-y-1.5">
        {!!problem && (
          <>
            <label className="text-[11px] font-medium text-muted-foreground">Problem</label>
            <div className="rounded-md border border-border/50 bg-black/10 p-2.5">
              <p className="text-[11px] text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed">{String(problem)}</p>
            </div>
          </>
        )}
        {!!codeBlock && (
          <>
            <label className="text-[11px] font-medium text-muted-foreground">
              Code {language ? `(${String(language)})` : ""}
            </label>
            <pre className="rounded-md border border-border/50 bg-black/20 p-2.5 text-[10px] text-foreground/80 font-mono overflow-x-auto leading-relaxed">
              {String(codeBlock)}
            </pre>
          </>
        )}
      </div>
    );
  }

  return null;
}

function CreateAssessmentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateAssessment();
  const [applicationId, setApplicationId] = useState("");
  const [candidateId, setCandidateId] = useState("");
  const [jobId, setJobId] = useState("");
  const [title, setTitle] = useState("Skills Assessment");
  const [assessmentType, setAssessmentType] = useState("coding");
  const [instructions, setInstructions] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicationId || !candidateId || !jobId) return;
    await create.mutateAsync({
      application_id: applicationId,
      candidate_id: candidateId,
      job_id: jobId,
      title: title || undefined,
      assessment_type: assessmentType,
      instructions: instructions || null,
    });
    setApplicationId("");
    setCandidateId("");
    setJobId("");
    setTitle("Skills Assessment");
    setAssessmentType("coding");
    setInstructions("");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="glass gradient-border rounded-2xl p-6 w-full max-w-lg mx-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Create Assessment</h2>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <AiWarningBanner />

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Application ID *</label>
                <Input
                  required
                  value={applicationId}
                  onChange={(e) => setApplicationId(e.target.value)}
                  placeholder="UUID"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Candidate ID *</label>
                <Input
                  required
                  value={candidateId}
                  onChange={(e) => setCandidateId(e.target.value)}
                  placeholder="UUID"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Job ID *</label>
                <Input
                  required
                  value={jobId}
                  onChange={(e) => setJobId(e.target.value)}
                  placeholder="UUID"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Assessment Type</label>
                <select
                  value={assessmentType}
                  onChange={(e) => setAssessmentType(e.target.value)}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                >
                  <option value="coding">Coding</option>
                  <option value="quiz">Quiz</option>
                  <option value="essay">Essay</option>
                  <option value="mcq">Multiple Choice</option>
                  <option value="problem_solving">Problem Solving</option>
                  <option value="portfolio">Portfolio Review</option>
                  <option value="phone_screen">Phone Screen</option>
                  <option value="take_home">Take Home</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Instructions</label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                  className="mt-1 flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors resize-none"
                  placeholder="Optional instructions for the assessment..."
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={create.isPending} className="text-xs ml-auto">
                  {create.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                  Create
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function EditAssessmentModal({
  assessment,
  open,
  onClose,
}: {
  assessment: BackendAssessmentOut;
  open: boolean;
  onClose: () => void;
}) {
  const update = useUpdateAssessment();
  const [status, setStatus] = useState(assessment.status);
  const [score, setScore] = useState(assessment.score?.toString() ?? "");
  const [maxScore, setMaxScore] = useState(assessment.max_score?.toString() ?? "");
  const [reviewerNotes, setReviewerNotes] = useState(assessment.reviewer_notes ?? "");
  const [submissionText, setSubmissionText] = useState(assessment.submission_text ?? "");
  const [reviewedBy, setReviewedBy] = useState(
    (getCriteriaValue(assessment.criteria_breakdown, "reviewed_by") as string) ?? "",
  );

  const currentHitl = getCriteriaValue(assessment.criteria_breakdown, "hitl_decision") as string | null | undefined;
  const [hitlDecision, setHitlDecision] = useState<string | null>(currentHitl ?? null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cb: Record<string, unknown> = { ...(assessment.criteria_breakdown ?? {}) };
    if (reviewedBy) cb.reviewed_by = reviewedBy;
    else delete cb.reviewed_by;
    if (hitlDecision) cb.hitl_decision = hitlDecision;
    else delete cb.hitl_decision;

    await update.mutateAsync({
      id: assessment.id,
      status: status !== assessment.status ? status : undefined,
      score: score ? parseFloat(score) : null,
      max_score: maxScore ? parseFloat(maxScore) : null,
      reviewer_notes: reviewerNotes || null,
      submission_text: submissionText || null,
      criteria_breakdown: cb,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="glass gradient-border rounded-2xl p-6 w-full max-w-lg mx-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Edit Assessment</h2>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <AiWarningBanner />

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Status</label>
                <div className="flex items-center gap-2 mt-1">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                  >
                    <option value="pending">Pending</option>
                    <option value="submitted">Submitted</option>
                    <option value="reviewed">Reviewed</option>
                  </select>
                  <StatusBadge status={status} />
                </div>
              </div>

              <TypeSpecificDetails assessment={assessment} />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Score</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    placeholder="e.g. 85"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Max Score</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={maxScore}
                    onChange={(e) => setMaxScore(e.target.value)}
                    placeholder="e.g. 100"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Submission Text</label>
                <textarea
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  rows={3}
                  className="mt-1 flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors resize-none"
                  placeholder="Candidate's submission..."
                />
                {submissionText && (
                  <p className="text-[10px] text-muted-foreground/50 mt-1">{submissionText.length} characters</p>
                )}
              </div>

              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-emerald-400">Human Review</label>
                  <StatusBadge status={status} />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground">Reviewer Notes</label>
                  <textarea
                    value={reviewerNotes}
                    onChange={(e) => setReviewerNotes(e.target.value)}
                    rows={3}
                    className="mt-1 flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors resize-none"
                    placeholder="Detailed reviewer notes..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground">Reviewed By</label>
                  <Input
                    value={reviewedBy}
                    onChange={(e) => setReviewedBy(e.target.value)}
                    placeholder="Reviewer name"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-purple-400">Human-in-the-Loop Decision</label>
                  {hitlDecision && <HitlBadge decision={hitlDecision} />}
                </div>
                <p className="text-[10px] text-muted-foreground/70">Record a pass/fail decision for this assessment.</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={hitlDecision === "pass" ? "default" : "outline"}
                    className={cn(
                      "text-xs flex-1",
                      hitlDecision === "pass" && "bg-emerald-600 hover:bg-emerald-700 text-white",
                    )}
                    onClick={() => setHitlDecision(hitlDecision === "pass" ? null : "pass")}
                  >
                    <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                    Pass
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={hitlDecision === "fail" ? "default" : "outline"}
                    className={cn(
                      "text-xs flex-1",
                      hitlDecision === "fail" && "bg-red-600 hover:bg-red-700 text-white",
                    )}
                    onClick={() => setHitlDecision(hitlDecision === "fail" ? null : "fail")}
                  >
                    <ThumbsDown className="h-3.5 w-3.5 mr-1" />
                    Fail
                  </Button>
                </div>
                {!hitlDecision && (
                  <p className="text-[10px] text-muted-foreground/50 italic">No decision recorded yet.</p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={update.isPending} className="text-xs ml-auto">
                  {update.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Save
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DeleteConfirmModal({
  assessmentId,
  open,
  onClose,
  onConfirm,
  isPending,
}: {
  assessmentId: string;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="glass gradient-border rounded-2xl p-6 w-full max-w-sm mx-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Delete Assessment</h2>
                <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Are you sure you want to delete assessment <span className="font-mono">{assessmentId.slice(0, 12)}...</span>?
            </p>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs">
                Cancel
              </Button>
              <Button type="button" size="sm" variant="destructive" disabled={isPending} onClick={onConfirm} className="text-xs">
                {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Delete
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function OrgAssessmentsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<BackendAssessmentOut | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const { data: assessments = [], isLoading } = useAssessments(
    statusFilter ? { status: statusFilter } : undefined,
  );
  const deleteAssessment = useDeleteAssessment();

  const pendingCount = assessments.filter((a) => a.status === "pending").length;
  const submittedCount = assessments.filter((a) => a.status === "submitted").length;
  const reviewedCount = assessments.filter((a) => a.status === "reviewed").length;

  const handleDelete = async () => {
    if (!deleting) return;
    await deleteAssessment.mutateAsync(deleting);
    setDeleting(null);
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-8 max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <ClipboardCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
              Assessments
            </h1>
            <p className="text-sm text-muted-foreground">
              AI-powered candidate assessments and scoring agent.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="text-xs shrink-0">
          <Plus className="h-3.5 w-3.5 mr-1" />
          New Assessment
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass rounded-xl p-5 space-y-1"
        >
          <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">Pending review</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="glass rounded-xl p-5 space-y-1"
        >
          <p className="text-2xl font-bold text-blue-400">{submittedCount}</p>
          <p className="text-xs text-muted-foreground">Submitted (awaiting review)</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.11 }}
          className="glass rounded-xl p-5 space-y-1"
        >
          <p className="text-2xl font-bold text-emerald-400">{reviewedCount}</p>
          <p className="text-xs text-muted-foreground">Reviewed</p>
        </motion.div>
      </div>

      <div className="flex items-center gap-2">
        {["", "pending", "submitted", "reviewed"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors",
              statusFilter === s
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
            )}
          >
            {s || "all"}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading assessments&hellip;
        </div>
      )}

      {!isLoading && assessments.length === 0 && (
        <div className="glass rounded-xl p-10 text-center space-y-2">
          <ClipboardCheck className="h-8 w-8 text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-muted-foreground">No assessments found</p>
          <p className="text-xs text-muted-foreground/60">
            Create an assessment to evaluate a candidate&apos;s skills.
          </p>
        </div>
      )}

      {!isLoading && assessments.length > 0 && (
        <div className="space-y-3">
          {assessments.map((a) => (
            <AssessmentCard
              key={a.id}
              assessment={a}
              onEdit={() => setEditing(a)}
              onDelete={() => setDeleting(a.id)}
            />
          ))}
        </div>
      )}

      <CreateAssessmentModal open={showCreate} onClose={() => setShowCreate(false)} />
      {editing && (
        <EditAssessmentModal
          assessment={editing}
          open={!!editing}
          onClose={() => setEditing(null)}
        />
      )}
      <DeleteConfirmModal
        assessmentId={deleting ?? ""}
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        isPending={deleteAssessment.isPending}
      />
    </div>
  );
}
