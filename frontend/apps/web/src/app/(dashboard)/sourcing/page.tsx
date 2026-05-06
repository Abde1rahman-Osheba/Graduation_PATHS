"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Telescope,
  Loader2,
  Sparkles,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useJobs,
  useSourcingStatus,
  useSourcedCandidates,
  useSourcedMatchForJob,
  useExplainSourcedMatch,
  useShortlistSourcedCandidate,
  useRunSourcingImport,
} from "@/lib/hooks";
import type {
  BackendCandidateJobReasoning,
  BackendCandidateSourcingRunResult,
  BackendSourcedCandidate,
  BackendSourcedCandidateMatch,
} from "@/lib/api";
import { cn } from "@/lib/utils/cn";

type Mode = "browse" | "match";

export default function SourcingPage() {
  const { data: status } = useSourcingStatus();
  const { data: jobs = [] } = useJobs({ limit: 100 });

  const [mode, setMode] = useState<Mode>("browse");
  const [title, setTitle] = useState("");
  const [skills, setSkills] = useState("");
  const [location, setLocation] = useState("");
  const [workplace, setWorkplace] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [topK, setTopK] = useState(10);
  const [minScore, setMinScore] = useState(0);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [reasoningById, setReasoningById] =
    useState<Record<string, BackendCandidateJobReasoning | "loading">>({});
  const [shortlistedKeys, setShortlistedKeys] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (jobs.length && !selectedJobId) setSelectedJobId(String(jobs[0].id));
  }, [jobs, selectedJobId]);

  const skillList = useMemo(
    () => skills.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean),
    [skills],
  );

  const browseFilters = useMemo(
    () => ({
      title: title || undefined,
      skills: skillList.length ? skillList : undefined,
      location: location || undefined,
      workplace: workplace || undefined,
      employmentType: employmentType || undefined,
      limit: 50,
    }),
    [title, skillList, location, workplace, employmentType],
  );

  const matchFilters = useMemo(
    () => ({
      topK,
      location: location || undefined,
      workplace: workplace ? [workplace] : undefined,
      employmentType: employmentType ? [employmentType] : undefined,
      minScore: minScore || undefined,
    }),
    [topK, location, workplace, employmentType, minScore],
  );

  const browseQuery = useSourcedCandidates(browseFilters);
  const matchQuery = useSourcedMatchForJob(selectedJobId, matchFilters, mode === "match");
  const explain = useExplainSourcedMatch();
  const shortlist = useShortlistSourcedCandidate();
  const runImport = useRunSourcingImport();
  const [importResult, setImportResult] =
    useState<BackendCandidateSourcingRunResult | null>(null);

  async function onRunImport() {
    setActionError(null);
    try {
      const result = await runImport.mutateAsync({
        limit: 10,
        keywords: skillList.length ? skillList : undefined,
        location: location || undefined,
      });
      setImportResult(result);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Sourcing import failed.");
    }
  }

  async function onExplain(candidateId: string) {
    if (!selectedJobId) {
      setActionError("Select a job to explain a match.");
      return;
    }
    setActionError(null);
    setReasoningById((prev) => ({ ...prev, [candidateId]: "loading" }));
    try {
      const r = await explain.mutateAsync({ jobId: selectedJobId, candidateId });
      setReasoningById((prev) => ({ ...prev, [candidateId]: r }));
    } catch (e) {
      setReasoningById((prev) => {
        const copy = { ...prev };
        delete copy[candidateId];
        return copy;
      });
      setActionError(e instanceof Error ? e.message : "Could not generate reasoning.");
    }
  }

  async function onShortlist(candidateId: string) {
    if (!selectedJobId) {
      setActionError("Select a job to shortlist.");
      return;
    }
    setActionError(null);
    try {
      await shortlist.mutateAsync({ jobId: selectedJobId, candidateId, stageCode: "sourced" });
      setShortlistedKeys((prev) => ({ ...prev, [`${selectedJobId}:${candidateId}`]: true }));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not shortlist.");
    }
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <Telescope className="h-4 w-4" />
            <span className="text-[11px] font-semibold uppercase tracking-widest">
              Open-to-Work sourcing
            </span>
          </div>
          <h1 className="font-heading text-xl font-bold tracking-tight text-foreground mt-1">
            Sourced candidates
          </h1>
          <p className="text-sm text-muted-foreground">
            {status
              ? status.enabled
                ? `Provider ${status.provider} · up to ${status.max_per_run} per run · every ${status.interval_minutes}m`
                : "Sourcing is currently disabled. Existing sourced candidates are still visible below."
              : "Loading…"}
          </p>
          {importResult && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Last run · {importResult.status} · fetched {importResult.fetched_count}
              {" · inserted "}{importResult.inserted_count}
              {importResult.updated_count > 0 ? ` · updated ${importResult.updated_count}` : ""}
              {importResult.failed_count > 0 ? ` · failed ${importResult.failed_count}` : ""}
              {importResult.errors.length > 0 ? ` — ${importResult.errors[0]}` : ""}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="gap-1.5 h-9"
            disabled={runImport.isPending || (status != null && !status.enabled)}
            onClick={onRunImport}
            title={
              status && !status.enabled
                ? "CANDIDATE_SOURCING_ENABLED is false on the backend"
                : undefined
            }
          >
            {runImport.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Run import
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4 space-y-4">
        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList>
            <TabsTrigger value="browse">Browse pool</TabsTrigger>
            <TabsTrigger value="match" disabled={jobs.length === 0}>
              Match against job
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input placeholder="Title or role keyword" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input placeholder="Skills (comma separated)" value={skills} onChange={(e) => setSkills(e.target.value)} />
            <Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
            <Input placeholder="Workplace (remote/hybrid/onsite)" value={workplace} onChange={(e) => setWorkplace(e.target.value)} />
            <Input placeholder="Employment type (full_time)" value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} />
            {jobs.length > 0 && (
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                aria-label="Active job context"
              >
                <option value="">Pick job for shortlist / explain</option>
                {jobs.map((j) => (
                  <option key={String(j.id)} value={String(j.id)}>
                    {j.title}
                  </option>
                ))}
              </select>
            )}
          </TabsContent>

          <TabsContent value="match" className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              aria-label="Job"
            >
              {jobs.map((j) => (
                <option key={String(j.id)} value={String(j.id)}>
                  {j.title}
                </option>
              ))}
            </select>
            <Input type="number" min={1} max={50} placeholder="Top K" value={topK} onChange={(e) => setTopK(Number(e.target.value))} />
            <Input type="number" min={0} max={100} placeholder="Min score" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} />
            <Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
            <Input placeholder="Workplace" value={workplace} onChange={(e) => setWorkplace(e.target.value)} />
            <Input placeholder="Employment type" value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} />
          </TabsContent>
        </Tabs>

        {actionError && <p className="text-sm text-red-400">{actionError}</p>}
      </div>

      {/* Results */}
      {mode === "browse" && (
        <BrowseList
          isLoading={browseQuery.isLoading}
          isError={browseQuery.isError}
          items={browseQuery.data?.items ?? []}
          total={browseQuery.data?.total ?? 0}
          selectedJobId={selectedJobId}
          reasoningById={reasoningById}
          shortlistedKeys={shortlistedKeys}
          onExplain={onExplain}
          onShortlist={onShortlist}
        />
      )}

      {mode === "match" && (
        <MatchList
          isLoading={matchQuery.isLoading}
          isError={matchQuery.isError}
          items={matchQuery.data?.items ?? []}
          total={matchQuery.data?.total ?? 0}
          jobId={selectedJobId}
          reasoningById={reasoningById}
          shortlistedKeys={shortlistedKeys}
          onExplain={onExplain}
          onShortlist={onShortlist}
        />
      )}
    </div>
  );
}

// ── Browse list ───────────────────────────────────────────────────────────

function BrowseList(props: {
  isLoading: boolean;
  isError: boolean;
  items: BackendSourcedCandidate[];
  total: number;
  selectedJobId: string;
  reasoningById: Record<string, BackendCandidateJobReasoning | "loading">;
  shortlistedKeys: Record<string, boolean>;
  onExplain: (candidateId: string) => void;
  onShortlist: (candidateId: string) => void;
}) {
  const { isLoading, isError, items, total, selectedJobId } = props;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading sourced candidates…
      </div>
    );
  }
  if (isError) {
    return <p className="text-sm text-red-400">Could not load sourced candidates.</p>;
  }
  if (items.length === 0) {
    return (
      <div className="glass rounded-xl p-6 text-sm text-muted-foreground">
        No sourced candidates match these filters yet. Trigger an admin run via{" "}
        <code className="text-xs">POST /api/v1/admin/candidate-sourcing/run-once</code>.
      </div>
    );
  }
  return (
    <>
      <p className="text-xs text-muted-foreground">{total} total · showing {items.length}</p>
      <div className="space-y-2">
        {items.map((c) => (
          <CandidateCard
            key={c.candidate_id}
            candidate={c}
            selectedJobId={selectedJobId}
            reasoning={props.reasoningById[c.candidate_id]}
            shortlisted={!!props.shortlistedKeys[`${selectedJobId}:${c.candidate_id}`]}
            onExplain={() => props.onExplain(c.candidate_id)}
            onShortlist={() => props.onShortlist(c.candidate_id)}
          />
        ))}
      </div>
    </>
  );
}

// ── Match list ────────────────────────────────────────────────────────────

function MatchList(props: {
  isLoading: boolean;
  isError: boolean;
  items: BackendSourcedCandidateMatch[];
  total: number;
  jobId: string;
  reasoningById: Record<string, BackendCandidateJobReasoning | "loading">;
  shortlistedKeys: Record<string, boolean>;
  onExplain: (candidateId: string) => void;
  onShortlist: (candidateId: string) => void;
}) {
  const { isLoading, isError, items, total, jobId } = props;
  if (!jobId) {
    return <p className="text-sm text-muted-foreground">Pick a job to run a match.</p>;
  }
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Ranking candidates…
      </div>
    );
  }
  if (isError) {
    return <p className="text-sm text-red-400">Could not run match.</p>;
  }
  if (items.length === 0) {
    return (
      <div className="glass rounded-xl p-6 text-sm text-muted-foreground">
        No candidates passed the filters for this job. Add more sourced candidates or relax the
        filters.
      </div>
    );
  }
  return (
    <>
      <p className="text-xs text-muted-foreground">{total} ranked candidates</p>
      <div className="space-y-2">
        {items.map((m) => (
          <MatchCard
            key={m.candidate_id}
            match={m}
            jobId={jobId}
            reasoning={props.reasoningById[m.candidate_id]}
            shortlisted={!!props.shortlistedKeys[`${jobId}:${m.candidate_id}`]}
            onExplain={() => props.onExplain(m.candidate_id)}
            onShortlist={() => props.onShortlist(m.candidate_id)}
          />
        ))}
      </div>
    </>
  );
}

// ── Cards ─────────────────────────────────────────────────────────────────

function CandidateCard(props: {
  candidate: BackendSourcedCandidate;
  selectedJobId: string;
  reasoning: BackendCandidateJobReasoning | "loading" | undefined;
  shortlisted: boolean;
  onExplain: () => void;
  onShortlist: () => void;
}) {
  const c = props.candidate;
  return (
    <motion.div layout className="glass rounded-xl p-4 space-y-2">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <div>
          <p className="font-semibold text-sm text-foreground">{c.full_name}</p>
          <p className="text-[12px] text-muted-foreground">
            {c.current_title || c.headline || "—"}
            {c.location_text ? ` · ${c.location_text}` : ""}
            {typeof c.years_experience === "number" ? ` · ${c.years_experience} yrs` : ""}
          </p>
        </div>
        {c.source?.url && (
          <a
            href={c.source.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            {c.source.source}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      {c.summary && <p className="text-[13px] text-foreground/80">{c.summary}</p>}
      <SkillsRow skills={c.skills} />
      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        {c.open_to_workplace_settings.length > 0 && (
          <span>Workplace · {c.open_to_workplace_settings.join(", ")}</span>
        )}
        {c.open_to_job_types.length > 0 && (
          <span>Type · {c.open_to_job_types.join(", ")}</span>
        )}
      </div>
      <Actions
        canAct={Boolean(props.selectedJobId)}
        shortlisted={props.shortlisted}
        onExplain={props.onExplain}
        onShortlist={props.onShortlist}
      />
      <ReasoningBlock state={props.reasoning} />
    </motion.div>
  );
}

function MatchCard(props: {
  match: BackendSourcedCandidateMatch;
  jobId: string;
  reasoning: BackendCandidateJobReasoning | "loading" | undefined;
  shortlisted: boolean;
  onExplain: () => void;
  onShortlist: () => void;
}) {
  const m = props.match;
  const c = m.candidate;
  return (
    <motion.div layout className="glass rounded-xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-semibold text-sm text-foreground">{c.full_name}</p>
          <p className="text-[12px] text-muted-foreground">
            {c.current_title || c.headline || "—"}
            {c.location_text ? ` · ${c.location_text}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className={cn("font-mono text-lg font-bold",
            m.score >= 80 ? "text-emerald-400" : m.score >= 60 ? "text-amber-400" : "text-red-400")}>
            {m.score.toFixed(0)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            vec {m.vector_score.toFixed(0)} · skills {m.skill_overlap_score.toFixed(0)}
          </p>
        </div>
      </div>
      {m.matched_skills.length > 0 && (
        <p className="text-[11px] text-emerald-400/90">
          Matched · {m.matched_skills.join(", ")}
        </p>
      )}
      {m.missing_required_skills.length > 0 && (
        <p className="text-[11px] text-amber-400/90">
          Missing · {m.missing_required_skills.join(", ")}
        </p>
      )}
      <Actions
        canAct={true}
        shortlisted={props.shortlisted}
        onExplain={props.onExplain}
        onShortlist={props.onShortlist}
      />
      <ReasoningBlock state={props.reasoning} />
    </motion.div>
  );
}

function SkillsRow({ skills }: { skills: string[] }) {
  if (!skills.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {skills.slice(0, 12).map((s) => (
        <Badge key={s} variant="outline" className="text-[10px]">
          {s}
        </Badge>
      ))}
    </div>
  );
}

function Actions(props: {
  canAct: boolean;
  shortlisted: boolean;
  onExplain: () => void;
  onShortlist: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      <Button size="sm" variant="ghost" disabled={!props.canAct} onClick={props.onExplain}>
        <Sparkles className="h-3 w-3" /> Explain
      </Button>
      <Button size="sm" disabled={!props.canAct || props.shortlisted} onClick={props.onShortlist}>
        {props.shortlisted ? (
          <>
            <CheckCircle2 className="h-3 w-3" /> Shortlisted
          </>
        ) : (
          <>
            <ChevronRight className="h-3 w-3" /> Shortlist
          </>
        )}
      </Button>
    </div>
  );
}

function ReasoningBlock({
  state,
}: {
  state: BackendCandidateJobReasoning | "loading" | undefined;
}) {
  if (!state) return null;
  if (state === "loading") {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Generating reasoning…
      </div>
    );
  }
  return (
    <div className="mt-2 space-y-1 rounded-lg border border-border/60 bg-muted/30 p-3 text-[12px]">
      <p className="text-[10px] uppercase tracking-widest text-primary/80">
        {state.decision.replace("_", " ")}
        {state.fallback ? " · offline" : ""}
      </p>
      <p className="text-foreground/90">{state.summary}</p>
      {state.strengths.length > 0 && (
        <p className="text-emerald-400/90">+ {state.strengths.join(" · ")}</p>
      )}
      {state.gaps.length > 0 && <p className="text-amber-400/90">– {state.gaps.join(" · ")}</p>}
      {state.red_flags.length > 0 && (
        <p className="text-red-400/90">! {state.red_flags.join(" · ")}</p>
      )}
      <p className="text-muted-foreground">Next · {state.recommended_next_step}</p>
    </div>
  );
}
