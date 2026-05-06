"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Sparkles, Mail, Send, ChevronDown, ChevronUp,
  Loader2, CheckCircle2, User, Star, Zap, X,
  Plus, Minus, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/lib/stores/auth.store";
import {
  useOrgDatabaseSearch,
  useApproveOutreach,
  useGenerateOutreachDraft,
  useSendOutreach,
} from "@/lib/hooks";
import type { BackendMatchingShortlistItem, BackendOutreachDraft } from "@/lib/api";

// ── Score chip ────────────────────────────────────────────────────────────────

function ScoreChip({ score }: { score: number | null }) {
  if (score == null) return null;
  const pct = Math.round(score * 100);
  const color = pct >= 75 ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
    : pct >= 50 ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
    : "border-rose-500/30 bg-rose-500/10 text-rose-400";
  return (
    <Badge variant="outline" className={cn("text-[11px] font-mono font-bold", color)}>
      {pct}%
    </Badge>
  );
}

// ── Candidate result card ─────────────────────────────────────────────────────

function CandidateCard({
  item,
  runId,
  orgId,
}: {
  item: BackendMatchingShortlistItem & { ranking_id?: string };
  runId: string;
  orgId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<BackendOutreachDraft | null>(null);
  const [draftBody, setDraftBody] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [approved, setApproved] = useState(item.status === "approved_for_outreach");

  const approveOutreach = useApproveOutreach();
  const generateDraft = useGenerateOutreachDraft();
  const sendOutreach = useSendOutreach();

  const rankingId = item.ranking_id ?? "";
  const score = item.score ?? item.match_score;

  const handleApprove = () => {
    if (!rankingId) return;
    approveOutreach.mutate(
      { runId, rankingId },
      { onSuccess: () => setApproved(true) },
    );
  };

  const handleGenerateDraft = () => {
    if (!rankingId) return;
    generateDraft.mutate(
      { runId, rankingId },
      {
        onSuccess: (data) => {
          setDraft(data);
          setDraftBody(data.body);
        },
      },
    );
  };

  const handleSend = () => {
    if (!draft || !recipientEmail) return;
    sendOutreach.mutate({ messageId: draft.message_id, recipientEmail });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass gradient-border rounded-2xl overflow-hidden"
    >
      {/* Card header */}
      <div className="flex items-center gap-4 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20 text-primary font-bold font-heading">
          #{item.rank}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-heading text-[14px] font-bold text-foreground">
              {item.candidate_name ?? `Candidate #${item.candidate_id.slice(0, 6)}`}
            </p>
            <ScoreChip score={score} />
            {approved && (
              <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">
                <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Approved for Outreach
              </Badge>
            )}
          </div>
          {item.matched_skills?.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {item.matched_skills.slice(0, 4).map((s) => (
                <span key={s} className="evidence-pill">{s}</span>
              ))}
              {item.matched_skills.length > 4 && (
                <span className="evidence-pill text-muted-foreground">+{item.matched_skills.length - 4}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!approved && rankingId && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={handleApprove}
              disabled={approveOutreach.isPending}
            >
              {approveOutreach.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
              Approve
            </Button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded — explanation + email draft */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border/40"
          >
            <div className="p-5 space-y-4">
              {/* Explanation */}
              {item.explanation && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">AI Explanation</p>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">{item.explanation}</p>
                </div>
              )}

              {/* Missing skills */}
              {item.missing_skills?.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-400/70 mb-1">Gaps</p>
                  <div className="flex flex-wrap gap-1">
                    {item.missing_skills.map((s) => (
                      <span key={s} className="evidence-pill border-rose-500/20 bg-rose-500/5 text-rose-400">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Outreach email draft */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3 w-3" /> Outreach Email
                  </p>
                  {!draft && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      onClick={handleGenerateDraft}
                      disabled={generateDraft.isPending || !approved}
                      title={!approved ? "Approve first" : undefined}
                    >
                      {generateDraft.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-primary" />}
                      Generate Draft
                    </Button>
                  )}
                </div>

                {!approved && !draft && (
                  <p className="text-[12px] text-muted-foreground/60 italic">Approve the candidate for outreach first.</p>
                )}

                {draft && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-1">Subject: <span className="text-foreground">{draft.subject}</span></p>
                    </div>
                    <textarea
                      rows={6}
                      value={draftBody}
                      onChange={(e) => setDraftBody(e.target.value)}
                      className="w-full rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 resize-y"
                    />
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recipient Email</label>
                      <input
                        type="email"
                        placeholder="candidate@email.com"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/40"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="gap-1.5 text-xs glow-blue"
                        onClick={handleSend}
                        disabled={sendOutreach.isPending || !recipientEmail || sendOutreach.isSuccess}
                      >
                        {sendOutreach.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                        Send Outreach
                      </Button>
                      {sendOutreach.isSuccess && (
                        <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Sent!
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function OutreachPage() {
  const { user } = useAuthStore();
  const orgId = user?.orgId ?? "";

  const [jobTitle, setJobTitle] = useState("");
  const [description, setDescription] = useState("");
  const [seniorityLevel, setSeniorityLevel] = useState("mid");
  const [workplaceType, setWorkplaceType] = useState("hybrid");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [topK, setTopK] = useState(5);
  const [runId, setRunId] = useState<string | null>(null);
  const [shortlist, setShortlist] = useState<(BackendMatchingShortlistItem & { ranking_id?: string })[]>([]);
  const [runMeta, setRunMeta] = useState<{ total?: number; relevant?: number } | null>(null);

  const search = useOrgDatabaseSearch();

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills([...skills, s]);
    setSkillInput("");
  };

  const removeSkill = (s: string) => setSkills(skills.filter((x) => x !== s));

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle || !orgId) return;
    search.mutate(
      {
        organization_id: orgId,
        top_k: topK,
        job: {
          title: jobTitle,
          description: description || undefined,
          required_skills: skills.length > 0 ? skills : undefined,
          seniority_level: seniorityLevel,
          workplace_type: workplaceType,
        },
      },
      {
        onSuccess: (data) => {
          const rid = data.matching_run_id ?? data.id ?? "";
          setRunId(rid);
          setShortlist(
            (data.shortlist ?? []).map((item, i) => ({
              ...item,
              rank: item.rank ?? i + 1,
            })),
          );
          setRunMeta({
            total: data.total_candidates,
            relevant: data.relevant_candidates,
          });
        },
      },
    );
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-6 max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="font-heading text-2xl font-bold text-foreground">Outbound Matching</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Describe a role and PATHS searches your candidate database using vector similarity — then generates personalized outreach emails.
          </p>
        </motion.div>

        {/* Search form */}
        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onSubmit={handleSearch}
          className="glass gradient-border rounded-2xl p-6 mb-6 space-y-5"
        >
          <h2 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Job Description
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Job Title *</label>
              <Input
                required
                placeholder="e.g. Senior Backend Engineer"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="mt-1 h-10"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Top K Results</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="range"
                  min={1} max={20} step={1}
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <span className="font-mono text-sm font-bold text-foreground w-6 text-center">{topK}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Description (optional)</label>
            <textarea
              rows={3}
              placeholder="We are looking for an experienced backend engineer who…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Seniority</label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["junior", "mid", "senior", "lead"].map((l) => (
                  <button
                    key={l} type="button"
                    onClick={() => setSeniorityLevel(l)}
                    className={cn(
                      "rounded-full border px-3 py-0.5 text-xs font-medium capitalize transition-all",
                      seniorityLevel === l
                        ? "border-primary/40 bg-primary/15 text-primary"
                        : "border-border/50 text-muted-foreground hover:border-border"
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Workplace</label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["remote", "hybrid", "onsite"].map((w) => (
                  <button
                    key={w} type="button"
                    onClick={() => setWorkplaceType(w)}
                    className={cn(
                      "rounded-full border px-3 py-0.5 text-xs font-medium capitalize transition-all",
                      workplaceType === w
                        ? "border-primary/40 bg-primary/15 text-primary"
                        : "border-border/50 text-muted-foreground hover:border-border"
                    )}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Skills */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Required Skills</label>
            <div className="mt-1 flex gap-2">
              <Input
                placeholder="React, PostgreSQL, Docker…"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                className="h-9 flex-1"
              />
              <Button type="button" size="sm" variant="outline" onClick={addSkill} className="gap-1">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {skills.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {skills.map((s) => (
                  <span key={s} className="flex items-center gap-1 evidence-pill">
                    {s}
                    <button type="button" onClick={() => removeSkill(s)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {search.error && (
            <p className="text-xs text-rose-400">{String((search.error as Error).message)}</p>
          )}

          <Button
            type="submit"
            className="w-full gap-2 glow-blue"
            disabled={search.isPending || !jobTitle}
          >
            {search.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Searching database…</>
              : <><Search className="h-4 w-4" /> Search Candidates</>}
          </Button>
        </motion.form>

        {/* Results */}
        <AnimatePresence>
          {shortlist.length > 0 && runId && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {/* Run meta */}
              {runMeta && (
                <div className="mb-4 flex flex-wrap items-center gap-4 text-[12px] text-muted-foreground">
                  <span>
                    <span className="font-semibold text-foreground">{runMeta.total ?? "?"}</span> candidates scanned
                  </span>
                  <span>
                    <span className="font-semibold text-foreground">{runMeta.relevant ?? "?"}</span> relevant
                  </span>
                  <span>
                    <span className="font-semibold text-primary">{shortlist.length}</span> shortlisted
                  </span>
                </div>
              )}

              <h2 className="font-heading text-base font-bold text-foreground mb-3 flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" /> Top Matches
              </h2>

              <div className="space-y-3">
                {shortlist.map((item) => (
                  <CandidateCard
                    key={item.candidate_id}
                    item={item}
                    runId={runId}
                    orgId={orgId}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty search result */}
        {search.isSuccess && shortlist.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-dashed border-border/40 py-16 text-center"
          >
            <Globe className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No matching candidates found in the database.</p>
            <p className="mt-1 text-xs text-muted-foreground/60">Try broader skills or a different seniority level.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
