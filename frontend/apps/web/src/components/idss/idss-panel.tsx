"use client";

import { useMemo, useState } from "react";
import {
  Loader2,
  Download,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  RefreshCcw,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  useApprovePlan,
  useDecisionReport,
  useGenerateDevelopmentPlan,
  useManagerDecision,
  useRevisePlan,
  useSendPlanFeedback,
  useUpdateCandidateFeedback,
} from "@/lib/hooks";
import { dssApi, type BackendIdssV2 } from "@/lib/api";

const STAGE_LABELS: Record<string, string> = {
  cv_profile_fit: "CV / Profile Fit",
  job_requirement_match: "Job Requirement Match",
  vector_similarity: "Vector Similarity",
  graph_similarity: "Graph Similarity",
  outreach_engagement: "Outreach Engagement",
  technical_interview: "Technical Interview",
  hr_interview: "HR / Behavioural Interview",
  assessment: "Assessment / Practical",
  human_feedback: "Human Feedback",
};

export function IdssPanel({
  packetId,
  orgId,
  candidateId,
  jobId,
}: {
  packetId: string;
  orgId: string;
  candidateId: string;
  jobId: string;
}) {
  const { data, isLoading, isError, refetch } = useDecisionReport(packetId, orgId);
  const managerDecision = useManagerDecision();
  const generatePlan = useGenerateDevelopmentPlan();
  const approvePlan = useApprovePlan();
  const revisePlan = useRevisePlan();
  const updateMessage = useUpdateCandidateFeedback();
  const sendFeedback = useSendPlanFeedback();

  const [editing, setEditing] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const idss = data?.idss_v2 ?? null;
  const plan = data?.development_plan ?? null;

  if (isLoading) {
    return (
      <div className="glass rounded-xl p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading IDSS report…
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="glass rounded-xl p-4 text-sm text-red-400">
        Could not load IDSS report.
      </div>
    );
  }

  async function onManagerAction(decision:
    | "accepted"
    | "rejected"
    | "request_more_interview"
    | "request_more_evidence",
  ) {
    setActionError(null);
    try {
      await managerDecision.mutateAsync({
        packetId,
        orgId,
        decision,
        managerNotes: notes || undefined,
      });
      setNotes("");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Action failed.");
    }
  }

  async function onGeneratePlan() {
    setActionError(null);
    try {
      await generatePlan.mutateAsync({
        orgId,
        candidateId,
        jobId,
        decisionId: packetId,
      });
      await refetch();
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Could not generate development plan.",
      );
    }
  }

  return (
    <div className="space-y-4">
      <Header data={data} />

      {idss && <RubricTable idss={idss} />}

      {idss?.bias_guardrail_notes?.length ? (
        <BiasFlag notes={idss.bias_guardrail_notes} />
      ) : null}

      {/* Manager actions — 4 brief-mandated buttons */}
      <div className="glass rounded-xl p-4 space-y-3">
        <p className="text-[11px] uppercase tracking-widest text-primary">
          Hiring Manager Decision
        </p>
        <Textarea
          rows={2}
          placeholder="Optional manager notes (kept on record)…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => void onManagerAction("accepted")}
            disabled={managerDecision.isPending}
            className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25"
          >
            <CheckCircle2 className="h-3 w-3" /> Accept Candidate
          </Button>
          <Button
            variant="ghost"
            onClick={() => void onManagerAction("rejected")}
            disabled={managerDecision.isPending}
            className="bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/25"
          >
            Reject Candidate
          </Button>
          <Button
            variant="ghost"
            onClick={() => void onManagerAction("request_more_interview")}
            disabled={managerDecision.isPending}
          >
            <RefreshCcw className="h-3 w-3" /> Request More Interview
          </Button>
          <Button
            variant="ghost"
            onClick={() => void onManagerAction("request_more_evidence")}
            disabled={managerDecision.isPending}
          >
            <Sparkles className="h-3 w-3" /> Request More Evidence
          </Button>
          <a
            href={dssApi.reportPdfUrl(packetId, orgId)}
            target="_blank"
            rel="noreferrer"
          >
            <Button variant="ghost">
              <Download className="h-3 w-3" /> Download PDF
            </Button>
          </a>
        </div>
        {actionError && <p className="text-sm text-red-400">{actionError}</p>}
        {managerDecision.data?.development_plan_id && (
          <p className="text-xs text-emerald-300">
            Manager decision recorded. Development plan generated automatically.
          </p>
        )}
      </div>

      {/* Development plan card */}
      {plan ? (
        <DevelopmentPlanCard
          plan={plan}
          orgId={orgId}
          onApprove={() =>
            approvePlan
              .mutateAsync({ planId: plan.id, orgId })
              .then(() => refetch())
              .catch((e) =>
                setActionError(
                  e instanceof Error ? e.message : "Could not approve plan.",
                ),
              )
          }
          onRevise={() =>
            revisePlan
              .mutateAsync({ planId: plan.id, orgId })
              .then(() => refetch())
              .catch((e) =>
                setActionError(
                  e instanceof Error ? e.message : "Could not request revision.",
                ),
              )
          }
          onSend={() =>
            sendFeedback
              .mutateAsync({ planId: plan.id, orgId })
              .then(() => refetch())
              .catch((e) =>
                setActionError(
                  e instanceof Error ? e.message : "Could not send feedback.",
                ),
              )
          }
          editing={editing}
          setEditing={setEditing}
          draftMessage={draftMessage}
          setDraftMessage={setDraftMessage}
          onSaveMessage={() =>
            updateMessage
              .mutateAsync({
                planId: plan.id,
                orgId,
                candidateFacingMessage: draftMessage,
              })
              .then(() => {
                setEditing(false);
                void refetch();
              })
              .catch((e) =>
                setActionError(
                  e instanceof Error ? e.message : "Could not save message.",
                ),
              )
          }
          isWorking={
            approvePlan.isPending ||
            revisePlan.isPending ||
            updateMessage.isPending ||
            sendFeedback.isPending
          }
        />
      ) : (
        <div className="glass rounded-xl p-4 space-y-2">
          <p className="text-sm text-muted-foreground">
            No development plan generated yet. Record a manager decision (Accept
            or Reject) to auto-generate one, or generate it manually below.
          </p>
          <Button onClick={() => void onGeneratePlan()} disabled={generatePlan.isPending}>
            {generatePlan.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            Generate Development Plan
          </Button>
        </div>
      )}
    </div>
  );
}

function Header({ data }: { data: NonNullable<ReturnType<typeof useDecisionReport>["data"]> }) {
  const score = data.idss_v2?.final_score ?? data.final_score;
  const rec = data.idss_v2?.recommendation ?? data.recommendation;
  const conf = data.idss_v2?.confidence ?? "—";
  return (
    <div className="glass rounded-xl p-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Final score" value={score == null ? "—" : `${Number(score).toFixed(1)} / 100`} />
      <Stat label="Recommendation" value={rec ?? "—"} />
      <Stat label="Confidence" value={String(conf)} />
      <Stat
        label="Next action"
        value={data.idss_v2?.recommended_next_action ?? "Review evidence"}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function RubricTable({ idss }: { idss: BackendIdssV2 }) {
  const stages = useMemo(
    () =>
      Object.keys(STAGE_LABELS)
        .map((key) => ({ key, ...(idss.score_breakdown[key] ?? null) }))
        .filter((s) => s),
    [idss],
  );
  return (
    <div className="glass rounded-xl p-4 space-y-2">
      <p className="text-[11px] uppercase tracking-widest text-primary">
        9-Stage Weighted Rubric
      </p>
      {idss.overrides_applied?.length ? (
        <p className="text-[11px] text-amber-300">
          Override(s) applied: {idss.overrides_applied.join(", ")}
        </p>
      ) : null}
      <div className="space-y-1.5">
        {stages.map((s) => (
          <div
            key={s.key}
            className="grid grid-cols-12 items-center gap-2 rounded-md border border-border/40 bg-muted/10 px-3 py-2"
          >
            <span className="col-span-4 text-[12px] font-medium">
              {STAGE_LABELS[s.key]}
            </span>
            <span className="col-span-1 text-[11px] text-muted-foreground">
              {s.weight}%
            </span>
            <div className="col-span-5 h-2 overflow-hidden rounded-full bg-muted/30">
              <div
                className={
                  "h-full " +
                  (s.missing
                    ? "bg-amber-400/40"
                    : (s.score ?? 0) >= 75
                      ? "bg-emerald-400"
                      : (s.score ?? 0) >= 50
                        ? "bg-primary"
                        : "bg-red-400/80")
                }
                style={{
                  width: s.missing ? "100%" : `${Math.max(0, Math.min(100, s.score ?? 0))}%`,
                }}
              />
            </div>
            <span
              className={
                "col-span-2 text-right text-[11px] " +
                (s.missing ? "text-amber-300" : "text-foreground")
              }
            >
              {s.missing ? "missing" : `${(s.score ?? 0).toFixed(0)} / 100`}
            </span>
          </div>
        ))}
      </div>
      {idss.summary_for_hiring_manager && (
        <p className="text-[12px] text-foreground/90">{idss.summary_for_hiring_manager}</p>
      )}
      {idss.final_reasoning && (
        <p className="text-[11px] text-muted-foreground">{idss.final_reasoning}</p>
      )}
      {idss.missing_evidence?.length ? (
        <p className="text-[11px] text-amber-300">
          Missing evidence: {idss.missing_evidence.join(", ")}
        </p>
      ) : null}
    </div>
  );
}

function BiasFlag({ notes }: { notes: string[] }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[12px] text-amber-200 space-y-1">
      <p className="flex items-center gap-2 font-semibold">
        <ShieldAlert className="h-3 w-3" /> Bias guardrail flags detected
      </p>
      <ul className="ml-4 list-disc">
        {notes.map((n, i) => (
          <li key={i} className="text-amber-100/90">
            {n}
          </li>
        ))}
      </ul>
      <p className="text-amber-100/80">
        Human review is required before any decision is finalised.
      </p>
    </div>
  );
}

function DevelopmentPlanCard(props: {
  plan: NonNullable<NonNullable<ReturnType<typeof useDecisionReport>["data"]>["development_plan"]>;
  orgId: string;
  onApprove: () => void;
  onRevise: () => void;
  onSend: () => void;
  editing: boolean;
  setEditing: (v: boolean) => void;
  draftMessage: string;
  setDraftMessage: (v: string) => void;
  onSaveMessage: () => void;
  isWorking: boolean;
}) {
  const body = props.plan.plan_json as Record<string, unknown>;
  const status = (body.status as string) ?? "draft_generated";
  const candidateMessage =
    (body.candidate_facing_message as string | undefined) ??
    (body.candidate_facing_feedback_message as string | undefined) ??
    "";
  const summary = (body.executive_summary as string | undefined) ?? props.plan.summary ?? "";

  return (
    <div className="glass rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-widest text-primary">
          Development Plan · {props.plan.plan_type.replace(/_/g, " ")}
        </p>
        <Badge variant="outline" className="text-[10px]">
          {status.replace(/_/g, " ")}
        </Badge>
      </div>
      {summary && <p className="text-[13px] text-foreground/90">{summary}</p>}

      <PlanWindows body={body} />

      <div className="rounded-md border border-border/40 bg-muted/10 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Candidate-facing message
          </p>
          {!props.editing ? (
            <Button
              variant="ghost"
              onClick={() => {
                props.setDraftMessage(candidateMessage);
                props.setEditing(true);
              }}
            >
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => props.setEditing(false)}>
                Cancel
              </Button>
              <Button onClick={props.onSaveMessage} disabled={props.isWorking}>
                {props.isWorking ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Save
              </Button>
            </div>
          )}
        </div>
        {props.editing ? (
          <Textarea
            rows={6}
            value={props.draftMessage}
            onChange={(e) => props.setDraftMessage(e.target.value)}
          />
        ) : (
          <p className="text-[12px] whitespace-pre-wrap text-foreground/90">
            {candidateMessage || "—"}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={props.onApprove} disabled={props.isWorking || status === "approved" || status === "sent"}>
          <CheckCircle2 className="h-3 w-3" /> Approve plan
        </Button>
        <Button variant="ghost" onClick={props.onRevise} disabled={props.isWorking}>
          <RefreshCcw className="h-3 w-3" /> Request revision
        </Button>
        <Button
          onClick={props.onSend}
          disabled={props.isWorking || status !== "approved"}
          title={status !== "approved" ? "Approve the plan first" : undefined}
        >
          <Send className="h-3 w-3" /> Send candidate feedback
        </Button>
      </div>
      {status !== "approved" && (
        <p className="text-[11px] text-amber-300">
          <AlertTriangle className="inline h-3 w-3 mr-1" />
          Sending is locked until the plan is approved.
        </p>
      )}
    </div>
  );
}

function PlanWindows({ body }: { body: Record<string, unknown> }) {
  const windows = ["first_30_days", "first_60_days", "first_90_days"];
  const items = windows
    .map((key) => ({ key, value: body[key] as Record<string, unknown> | undefined }))
    .filter((w) => w.value && Object.keys(w.value).length);
  if (!items.length) return null;
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {items.map((w) => (
        <div
          key={w.key}
          className="rounded-md border border-border/40 bg-muted/10 p-2"
        >
          <p className="text-[10px] uppercase tracking-widest text-primary">
            {w.key.replace(/_/g, " ")}
          </p>
          <p className="text-[11px] text-foreground/90 mt-1">
            {(((w.value?.focus as string[] | undefined) ?? []).slice(0, 3)).join(" · ") || "—"}
          </p>
          {Array.isArray(w.value?.success_metrics) && (w.value!.success_metrics as string[]).length > 0 && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Metric: {(w.value!.success_metrics as string[])[0]}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
