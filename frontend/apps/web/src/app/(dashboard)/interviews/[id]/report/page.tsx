"use client";

import { use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEvaluateInterviewSession, useInterviewReport } from "@/lib/hooks";
import { interviewRuntimeApi } from "@/lib/api";

export default function InterviewReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, isError, refetch } = useInterviewReport(id);
  const evaluate = useEvaluateInterviewSession();

  if (isLoading) {
    return (
      <Centered>
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <p className="mt-2 text-sm text-muted-foreground">Loading report…</p>
      </Centered>
    );
  }
  if (isError || !data) {
    return (
      <Centered>
        <p className="text-sm text-red-400">Could not load report.</p>
      </Centered>
    );
  }

  const dp = data.decision_packet ?? {};
  const score = (dp as { final_score?: number }).final_score;
  const recommendation = (dp as { recommendation?: string }).recommendation;
  const confidence = (dp as { confidence?: number }).confidence;
  const humanReview = (dp as { human_review_required?: boolean }).human_review_required;

  return (
    <div className="h-full overflow-y-auto p-6 max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <Link href={`/candidates/${data.candidate.id ?? ""}`}>
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground -ml-2">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to candidate
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              evaluate.mutate(id, {
                onSuccess: () => void refetch(),
              });
            }}
            disabled={evaluate.isPending}
          >
            {evaluate.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            Re-evaluate
          </Button>
          <a
            href={interviewRuntimeApi.reportPdfUrl(id)}
            target="_blank"
            rel="noreferrer"
            download
          >
            <Button>
              <Download className="h-3 w-3" /> Download PDF
            </Button>
          </a>
        </div>
      </div>

      <div className="glass rounded-xl p-4 space-y-2">
        <p className="text-[11px] uppercase tracking-widest text-primary">AI Interview Report</p>
        <h1 className="text-2xl font-semibold">{data.candidate.full_name ?? "Candidate"}</h1>
        <p className="text-[13px] text-muted-foreground">
          {data.job.title ?? "—"}
          {data.job.seniority_level ? ` · ${data.job.seniority_level}` : ""}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Overall" value={score == null ? "—" : `${(score as number).toFixed(0)}/100`} />
          <Stat label="Recommendation" value={recommendation ?? "needs_human_review"} />
          <Stat
            label="Confidence"
            value={confidence == null ? "—" : `${Math.round((Number(confidence) <= 1 ? Number(confidence) * 100 : Number(confidence)))}%`}
          />
          <Stat
            label="Human review"
            value={humanReview ? "Required" : "Optional"}
          />
        </div>
        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[12px] text-emerald-300 mt-2">
          <CheckCircle2 className="inline h-3 w-3 mr-1" />
          Decision support only — final hiring decisions are made by humans.
        </div>
      </div>

      {/* Summary */}
      {data.summary && Object.keys(data.summary).length > 0 && (
        <Section title="Interview summary">
          <SummaryView summary={data.summary as Record<string, unknown>} />
        </Section>
      )}

      {/* Evaluations */}
      {data.evaluations.length > 0 && (
        <Section title="Question-by-question evaluation">
          <div className="space-y-3">
            {data.evaluations.map((ev, i) => (
              <EvaluationItem key={i} evaluation={ev as Record<string, unknown>} index={i} />
            ))}
          </div>
        </Section>
      )}

      {/* Transcript */}
      {data.turns.length > 0 && (
        <Section title="Transcript">
          <div className="space-y-2">
            {data.turns.map((t) => (
              <div key={t.index} className="rounded-xl border border-border/40 bg-muted/20 p-3">
                <p className="text-[11px] text-muted-foreground">
                  Q{t.index}
                  {t.is_followup ? ` (follow-up of Q${t.parent_index})` : ""}
                </p>
                <p className="text-sm font-medium">{t.question}</p>
                <p className="text-[13px] text-foreground/90 whitespace-pre-wrap mt-1">
                  {t.answer}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {!data.completed && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-200">
          <AlertTriangle className="inline h-3 w-3 mr-1" />
          The interview is not finalized. Run the interview to completion or click <strong>Re-evaluate</strong> above.
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function SummaryView({ summary }: { summary: Record<string, unknown> }) {
  const text =
    (summary.summary as string | undefined) ||
    (summary.candidate_summary as string | undefined) ||
    (summary.interview_summary as string | undefined);
  return (
    <div className="space-y-2 rounded-xl border border-border/40 bg-muted/10 p-4">
      {text && <p className="text-[13px] leading-relaxed">{String(text)}</p>}
      <BulletGroup label="Strengths" items={summary.strengths} positive />
      <BulletGroup label="Weaknesses" items={summary.weaknesses} />
      <BulletGroup label="Risks" items={summary.risks} negative />
      <BulletGroup label="Missing skills" items={summary.missing_skills} />
      <BulletGroup label="Development plan" items={summary.development_plan} positive />
    </div>
  );
}

function BulletGroup({
  label,
  items,
  positive,
  negative,
}: {
  label: string;
  items: unknown;
  positive?: boolean;
  negative?: boolean;
}) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const color = positive
    ? "text-emerald-300"
    : negative
      ? "text-red-300"
      : "text-amber-200";
  return (
    <div>
      <p className={`text-[10px] uppercase tracking-widest ${color}`}>{label}</p>
      <ul className="ml-4 list-disc text-[12px] text-foreground/90">
        {items.map((s, i) => (
          <li key={i}>{String(s)}</li>
        ))}
      </ul>
    </div>
  );
}

function EvaluationItem({
  evaluation,
  index,
}: {
  evaluation: Record<string, unknown>;
  index: number;
}) {
  const q = (evaluation.question as string) ?? `Question ${index + 1}`;
  const a = (evaluation.answer as string) ?? null;
  const score = evaluation.score as number | undefined;
  const reasoning = evaluation.reasoning as string | undefined;
  const evidence = evaluation.evidence as string | undefined;
  const skills = evaluation.skills_tested as unknown[] | undefined;
  const strengths = evaluation.strengths as unknown[] | undefined;
  const weaknesses = evaluation.weaknesses as unknown[] | undefined;
  return (
    <div className="rounded-xl border border-border/40 bg-muted/10 p-3 space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">{q}</p>
        {score != null && (
          <Badge variant="outline" className="text-[10px]">
            {Number(score).toFixed(1)}/10
          </Badge>
        )}
      </div>
      {a && <p className="text-[12px] text-foreground/80 whitespace-pre-wrap">{a}</p>}
      {reasoning && <p className="text-[12px] text-muted-foreground"><strong>Reasoning:</strong> {reasoning}</p>}
      {evidence && <p className="text-[12px] text-muted-foreground"><strong>Evidence:</strong> {evidence}</p>}
      {Array.isArray(skills) && skills.length > 0 && (
        <p className="text-[11px] text-primary">Skills tested · {skills.map(String).join(", ")}</p>
      )}
      {Array.isArray(strengths) && strengths.length > 0 && (
        <p className="text-[11px] text-emerald-400/90">+ {strengths.map(String).join(" · ")}</p>
      )}
      {Array.isArray(weaknesses) && weaknesses.length > 0 && (
        <p className="text-[11px] text-amber-400/90">– {weaknesses.map(String).join(" · ")}</p>
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">{children}</div>
    </div>
  );
}
