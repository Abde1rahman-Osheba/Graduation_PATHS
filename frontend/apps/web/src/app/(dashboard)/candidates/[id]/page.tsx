"use client";

import { use, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Shield, ShieldOff, GitFork, Link2, Globe,
  Star, CheckCircle2, AlertCircle, Clock, MapPin, Briefcase,
  BookOpen, ExternalLink, ChevronRight, Brain, Send,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCandidate, useApplications, useEvidenceItems, useCandidateSources, useDeanonStatus, useRequestDeanon, useCreateInterviewSession, useBiasFlags, useContactEnrichmentStatus } from "@/lib/hooks";
import { OutreachModal } from "@/components/outreach/outreach-modal";
import { useAuthStore } from "@/lib/stores/auth.store";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { shortDate, initials, confidenceLabel, confidenceColor, relativeTime } from "@/lib/utils/format";
import type { EvidenceType, SkillProficiency } from "@/types";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Tooltip,
} from "recharts";

const proficiencyLevel: Record<SkillProficiency, number> = {
  beginner: 25, intermediate: 50, advanced: 75, expert: 100,
};

const proficiencyColor: Record<SkillProficiency, string> = {
  beginner:     "bg-slate-500/20 text-slate-400 border-slate-500/30",
  intermediate: "bg-primary/10 text-primary/80 border-primary/20",
  advanced:     "bg-teal-500/10 text-teal-400 border-teal-500/20",
  expert:       "bg-violet-500/10 text-violet-400 border-violet-500/20",
};

const evidenceIcon: Record<EvidenceType, typeof Star> = {
  cv_claim:           BookOpen,
  github_repo:        GitFork,
  portfolio_artifact: Globe,
  assessment:         CheckCircle2,
  interview:          Star,
};

export default function CandidateProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: candidate, isLoading } = useCandidate(id);
  const { data: apps = [] } = useApplications();
  const candidateApps = apps.filter((a) => a.candidateId === id);

  // Phase 2 — real evidence & sources
  const { data: evidenceItems = [] } = useEvidenceItems(id);
  const { data: candidateSources = [] } = useCandidateSources(id);
  const { data: deanonStatus } = useDeanonStatus(id);
  const requestDeanon = useRequestDeanon();

  const handleRequestDeanon = () => {
    requestDeanon.mutate({ candidateId: id, purpose: "outreach" });
  };

  const router = useRouter();
  const [outreachOpen, setOutreachOpen] = useState(false);
  const startInterview = useCreateInterviewSession();
  const [interviewError, setInterviewError] = useState<string | null>(null);
  const { user: authUser } = useAuthStore();
  const role = String(authUser?.role ?? authUser?.accountType ?? "").toLowerCase();
  const isHrUser =
    role === "admin" ||
    role === "hr" ||
    role === "hr_manager" ||
    role === "recruiter" ||
    role === "hiring_manager" ||
    role === "manager" ||
    role === "lead";

  const deanonPending = deanonStatus?.granted_at == null && deanonStatus?.denied_at == null && deanonStatus != null;
  const { data: allFlags = [] } = useBiasFlags({ scope: "candidate" });
  const candidateBiasFlags = allFlags.filter((f) => f.scope_id === id);
  const { data: enrichmentStatus } = useContactEnrichmentStatus();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="space-y-2 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Candidate not found.</p>
      </div>
    );
  }

  const radarData = candidate.skills.slice(0, 5).map((s) => ({
    skill: s.skill,
    value: proficiencyLevel[s.proficiency],
  }));

  const topApp = candidateApps[0];

  return (
    <div className="h-full overflow-y-auto">
      {/* Header strip */}
      <div className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
        <Link href="/candidates">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Pipeline
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Link href={`/candidates/${id}/decision`}>
            <Button size="sm" className="h-8 gap-1.5 text-xs glow-blue">
              <Brain className="h-3 w-3" /> Decision Support
            </Button>
          </Link>
          {isHrUser && topApp?.jobId && (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 gap-1.5 text-xs"
              disabled={startInterview.isPending}
              onClick={async () => {
                setInterviewError(null);
                try {
                  const r = await startInterview.mutateAsync({
                    candidate_id: id,
                    job_id: topApp.jobId,
                    interview_type: "mixed",
                    interview_mode: "text",
                    follow_ups_enabled: true,
                  });
                  router.push(`/interviews/${r.session_id}/run`);
                } catch (e) {
                  setInterviewError(
                    e instanceof Error ? e.message : "Could not start AI interview.",
                  );
                }
              }}
              title={interviewError ?? undefined}
            >
              {startInterview.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              Start AI Interview
            </Button>
          )}
          {isHrUser && (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setOutreachOpen(true)}
            >
              <Send className="h-3 w-3" /> Outreach
            </Button>
          )}
          {candidate.isAnonymized ? (
            <Badge variant="outline" className="gap-1.5 border-amber-500/30 text-amber-400">
              <ShieldOff className="h-3 w-3" /> Anonymized
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1.5 border-emerald-500/30 text-emerald-400">
              <Shield className="h-3 w-3" /> Full Profile
            </Badge>
          )}
          {deanonStatus?.granted_at ? (
            <Badge variant="outline" className="gap-1.5 border-emerald-500/30 text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> De-anon Granted
            </Badge>
          ) : deanonPending ? (
            <Badge variant="outline" className="gap-1.5 border-amber-500/30 text-amber-400">
              <Clock className="h-3 w-3" /> Approval Pending
            </Badge>
          ) : (
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleRequestDeanon}
              disabled={requestDeanon.isPending}
            >
              {requestDeanon.isPending ? (
                <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
              ) : (
                <ShieldOff className="h-3 w-3" />
              )}
              Request De-anonymize <ChevronRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-5xl">
        {/* Profile hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass gradient-border rounded-2xl p-6"
        >
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <div className="flex items-start gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20 ring-2 ring-primary/20">
                  {!candidate.isAnonymized && <AvatarImage src={candidate.avatar} alt={candidate.name} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                    {candidate.isAnonymized ? "?" : initials(candidate.name)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="space-y-1 min-w-0">
                <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                  {candidate.isAnonymized ? candidate.alias : candidate.name}
                </h1>
                <p className="text-base text-muted-foreground">{candidate.title}</p>
                <div className="flex flex-wrap items-center gap-3 text-[13px] text-muted-foreground">
                  <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{candidate.location}</span>
                  <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" />{candidate.experienceYears}y experience</span>
                  <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Updated {relativeTime(candidate.updatedAt)}</span>
                </div>
              </div>
            </div>

            {/* External links */}
            {!candidate.isAnonymized && (
              <div className="flex flex-wrap items-center gap-2 md:ml-auto md:flex-col md:items-end">
                {candidate.githubLogin && (
                  <a href={`https://github.com/${candidate.githubLogin}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <GitFork className="h-3.5 w-3.5" /> GitHub <ExternalLink className="h-3 w-3 opacity-50" />
                  </a>
                )}
                {candidate.linkedinUrl && (
                  <a href={candidate.linkedinUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <Link2 className="h-3.5 w-3.5" /> LinkedIn <ExternalLink className="h-3 w-3 opacity-50" />
                  </a>
                )}
                {candidate.portfolioUrl && (
                  <a href={candidate.portfolioUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <Globe className="h-3.5 w-3.5" /> Portfolio <ExternalLink className="h-3 w-3 opacity-50" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Source tags — real sources from Phase 2 API, fallback to mock */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mr-1">Sources</span>
            {candidateSources.length > 0
              ? candidateSources.map((src) => (
                  <span key={src.id} className="evidence-pill" title={src.url ?? undefined}>{src.source}</span>
                ))
              : candidate.sources.map((src) => (
                  <span key={src} className="evidence-pill">{src}</span>
                ))
            }
          </div>

          {/* Bias flags */}
          {candidateBiasFlags.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {candidateBiasFlags.map((flag) => (
                <div key={flag.id} className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-1.5 text-xs text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{flag.rule.replace(/_/g, " ")}</span>
                  <span className="text-[10px] text-amber-500/70 ml-auto">{flag.severity}</span>
                </div>
              ))}
            </div>
          )}

          {/* Contact enrichment status */}
          {enrichmentStatus && enrichmentStatus.total > 0 && (
            <div className="mt-3 flex items-center gap-2">
              {enrichmentStatus.pending > 0 && (
                <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-1 text-[11px] font-medium text-amber-400">
                  <Clock className="h-3 w-3" />
                  {enrichmentStatus.pending} pending contact{enrichmentStatus.pending !== 1 ? "s" : ""}
                </span>
              )}
              {enrichmentStatus.approved > 0 && (
                <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  {enrichmentStatus.approved} approved contact{enrichmentStatus.approved !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}
        </motion.div>

        {/* Main content tabs */}
        <Tabs defaultValue="skills">
          <TabsList className="bg-muted/30 border border-border/40">
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
          </TabsList>

          {/* Skills */}
          <TabsContent value="skills" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Radar */}
              <div className="glass rounded-xl p-5">
                <h3 className="font-heading text-sm font-semibold text-foreground mb-4">Skill Radar</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <Radar
                      name="Proficiency" dataKey="value"
                      stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.18}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Skill list */}
              <div className="glass rounded-xl p-5 space-y-3">
                <h3 className="font-heading text-sm font-semibold text-foreground">All Skills</h3>
                {candidate.skills.map((skill) => (
                  <div key={skill.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-foreground">{skill.skill}</span>
                        {skill.verified && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                        <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px] font-semibold", proficiencyColor[skill.proficiency])}>
                          {skill.proficiency}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">{skill.evidenceCount} evidence</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${proficiencyLevel[skill.proficiency]}%` }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                        className="h-full rounded-full bg-primary/70"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Evidence — Phase 2: real evidence items from API */}
          <TabsContent value="evidence" className="mt-4">
            <div className="space-y-2">
              {evidenceItems.length > 0
                ? evidenceItems.map((ev) => {
                    const typeKey = ev.type as EvidenceType;
                    const Icon = evidenceIcon[typeKey] ?? BookOpen;
                    const conf = (ev.confidence ?? 0);
                    return (
                      <motion.div
                        key={ev.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass rounded-xl p-4 flex items-start gap-4"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 ring-1 ring-primary/15">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-semibold uppercase tracking-wide text-primary/70">{ev.type}</span>
                              {ev.field_ref && (
                                <span className="evidence-pill text-[10px]">{ev.field_ref}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {ev.confidence != null && (
                                <span className={cn("text-[11px] font-semibold", confidenceColor(conf))}>
                                  {Math.round(conf * 100)}% conf.
                                </span>
                              )}
                              <span className="text-[11px] text-muted-foreground">{shortDate(ev.created_at)}</span>
                            </div>
                          </div>
                          <p className="mt-1 text-[13px] text-foreground leading-relaxed">
                            {ev.extracted_text ?? "—"}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })
                : candidate.evidenceItems.map((ev) => {
                    const Icon = evidenceIcon[ev.type] ?? BookOpen;
                    const conf = confidenceLabel(ev.confidence);
                    return (
                      <motion.div
                        key={ev.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass rounded-xl p-4 flex items-start gap-4"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 ring-1 ring-primary/15">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-primary/70">{ev.source}</span>
                            <div className="flex items-center gap-2">
                              <span className={cn("text-[11px] font-semibold", confidenceColor(ev.confidence))}>
                                {Math.round(ev.confidence * 100)}% confidence
                              </span>
                              <span className="text-[11px] text-muted-foreground">{shortDate(ev.timestamp)}</span>
                            </div>
                          </div>
                          <p className="mt-1 text-[13px] text-foreground leading-relaxed">{ev.extractedText}</p>
                        </div>
                      </motion.div>
                    );
                  })
              }
              {evidenceItems.length === 0 && candidate.evidenceItems.length === 0 && (
                <div className="rounded-xl border border-dashed border-border/40 p-12 text-center">
                  <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No evidence items yet.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Evidence is created automatically when a CV is ingested.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Applications */}
          <TabsContent value="applications" className="mt-4">
            <div className="space-y-3">
              {candidateApps.map((app) => {
                const stageOrder = ["sourced", "applied", "screened", "interview", "decision", "offer"];
                const currentStageIdx = app.status ? stageOrder.indexOf(app.status.toLowerCase()) : -1;
                return (
                  <div key={app.id} className="glass rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">{app.job.title}</p>
                          <Badge variant="outline" className="text-[10px]">{app.job.level}</Badge>
                        </div>
                        <p className="text-[12px] text-muted-foreground mt-0.5">
                          Applied {shortDate(app.applyDate)} · via {app.sourcePlatform}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        {app.matchScore && (
                          <div className="text-right">
                            <p className={cn(
                              "font-mono text-lg font-bold",
                              app.matchScore >= 80 ? "text-emerald-400" :
                              app.matchScore >= 60 ? "text-amber-400" : "text-red-400"
                            )}>{app.matchScore}%</p>
                            <p className="text-[10px] text-muted-foreground">match score</p>
                          </div>
                        )}
                        <Link href={`/dashboard/jobs/${app.jobId}/screening`}>
                          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                            View in Job <ChevronRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                    {/* Stage pipeline */}
                    <div className="flex items-center gap-1.5">
                      {stageOrder.map((stage, i) => (
                        <div key={stage} className="flex items-center gap-1.5 flex-1">
                          <div className={cn(
                            "flex h-6 w-full items-center justify-center rounded text-[9px] font-semibold uppercase tracking-wider",
                            i <= currentStageIdx
                              ? "bg-primary/15 text-primary"
                              : "bg-muted/30 text-muted-foreground/40",
                          )}>
                            {stage}
                          </div>
                          {i < stageOrder.length - 1 && (
                            <div className={cn(
                              "h-px w-2 shrink-0",
                              i < currentStageIdx ? "bg-primary/30" : "bg-border/30",
                            )} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {candidateApps.length === 0 && (
                <div className="rounded-xl border border-dashed border-border/40 p-12 text-center">
                  <p className="text-sm text-muted-foreground">No applications found for this candidate.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {isHrUser && (
        <OutreachModal
          open={outreachOpen}
          onOpenChange={setOutreachOpen}
          candidate={{
            id,
            name: candidate.name ?? candidate.alias ?? null,
            email: (candidate as { email?: string | null }).email ?? null,
            title: candidate.title ?? null,
          }}
          job={
            topApp?.jobId
              ? { id: topApp.jobId, title: topApp.job?.title ?? "Open role" }
              : null
          }
        />
      )}
    </div>
  );
}
