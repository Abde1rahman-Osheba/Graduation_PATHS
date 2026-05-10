"use client";

/**
 * Candidate Sources page (/candidate-sources).
 *
 * The single place where a company controls *where its candidates come from*
 * across the platform. The toggles on this page set the **organization
 * defaults** — every new job inherits these values into its own
 * `JobCandidatePoolConfig`, which can then be overridden per-job from the
 * Job detail Candidate Sources tab (deferred to a follow-up).
 *
 * Each toggle, count, and number is read from a real backend endpoint:
 *
 *   GET  /api/v1/organization/candidate-source-settings   → toggles + numerics
 *   PUT  /api/v1/organization/candidate-source-settings   → save
 *   GET  /api/v1/organization/candidate-source-counts     → counts per source
 *   GET  /api/v1/candidate-source-catalog                 → label + description
 *
 * All three are tenant-isolated: the backend uses the JWT-derived
 * organization_id, so this page never sends one and another org's data
 * cannot leak into the response.
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Globe2, Telescope, Upload, Calendar as JobFairIcon, Database,
  UserPlus2, Loader2, AlertTriangle, Info, ArrowRight, Save,
  CheckCircle2, GitMerge, FileSearch, Settings2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  useSourceCatalog,
  useOrgSourceSettings,
  useUpdateOrgSourceSettings,
  useSourceCounts,
} from "@/lib/hooks";
import type {
  OrgSourceSettings,
  OrgSourceSettingsUpdate,
  SourceTypeKey,
} from "@/lib/api";
import { cn } from "@/lib/utils/cn";

// Maps each toggleable source to (a) the settings flag column name, (b) an
// icon, and (c) the recommended workspace action when this source is the
// company's primary intake. The order here is the order shown to the user.
const SOURCES: {
  key: SourceTypeKey;
  flag: keyof OrgSourceSettings;
  icon: React.ElementType;
  action?: { label: string; href: string };
}[] = [
  {
    key: "paths_profile",
    flag: "use_paths_profiles_default",
    icon: Globe2,
    action: { label: "Browse PATHS candidates", href: "/candidates" },
  },
  {
    key: "sourced",
    flag: "use_sourced_candidates_default",
    icon: Telescope,
    action: { label: "Open sourcing agent", href: "/sourcing" },
  },
  {
    key: "company_uploaded",
    flag: "use_uploaded_candidates_default",
    icon: Upload,
    action: { label: "Upload CVs", href: "/org/cv-ingestion" },
  },
  {
    key: "job_fair",
    flag: "use_job_fair_candidates_default",
    icon: JobFairIcon,
    // No dedicated import surface yet — link to Members until a job-fair
    // import page exists. Honest placeholder.
    action: undefined,
  },
  {
    key: "ats_import",
    flag: "use_ats_candidates_default",
    icon: Database,
    action: undefined,
  },
];

type FormState = Pick<
  OrgSourceSettings,
  | "use_paths_profiles_default"
  | "use_sourced_candidates_default"
  | "use_uploaded_candidates_default"
  | "use_job_fair_candidates_default"
  | "use_ats_candidates_default"
  | "default_top_k"
  | "default_min_profile_completeness"
  | "default_min_evidence_confidence"
>;

export default function CandidateSourcesPage() {
  const catalog = useSourceCatalog();
  const settings = useOrgSourceSettings();
  const counts = useSourceCounts();
  const update = useUpdateOrgSourceSettings();

  // Server-derived "ground truth" — recomputed whenever settings.data changes
  // without an effect-based copy.
  const initial: FormState | null = useMemo(() => {
    if (!settings.data) return null;
    const s = settings.data;
    return {
      use_paths_profiles_default: s.use_paths_profiles_default,
      use_sourced_candidates_default: s.use_sourced_candidates_default,
      use_uploaded_candidates_default: s.use_uploaded_candidates_default,
      use_job_fair_candidates_default: s.use_job_fair_candidates_default,
      use_ats_candidates_default: s.use_ats_candidates_default,
      default_top_k: s.default_top_k,
      default_min_profile_completeness: s.default_min_profile_completeness,
      default_min_evidence_confidence: s.default_min_evidence_confidence,
    };
  }, [settings.data]);

  // User edits live in a draft; until the user touches a control, draft is
  // null and the form falls back to `initial`. After save we clear the draft
  // so the next render shows the freshly-fetched server values.
  const [draft, setDraft] = useState<FormState | null>(null);
  const [savedTick, setSavedTick] = useState(false);
  const form = draft ?? initial;

  const dirty = useMemo(() => {
    if (!draft || !initial) return false;
    return (
      draft.use_paths_profiles_default !== initial.use_paths_profiles_default ||
      draft.use_sourced_candidates_default !== initial.use_sourced_candidates_default ||
      draft.use_uploaded_candidates_default !== initial.use_uploaded_candidates_default ||
      draft.use_job_fair_candidates_default !== initial.use_job_fair_candidates_default ||
      draft.use_ats_candidates_default !== initial.use_ats_candidates_default ||
      draft.default_top_k !== initial.default_top_k ||
      draft.default_min_profile_completeness !== initial.default_min_profile_completeness ||
      draft.default_min_evidence_confidence !== initial.default_min_evidence_confidence
    );
  }, [draft, initial]);

  const onToggle = (flag: keyof FormState, value: boolean) => {
    const base = draft ?? initial;
    if (!base) return;
    setDraft({ ...base, [flag]: value });
  };
  const onNumber = (flag: keyof FormState, value: number) => {
    const base = draft ?? initial;
    if (!base) return;
    setDraft({ ...base, [flag]: value });
  };

  const onSave = async () => {
    if (!form) return;
    const payload: OrgSourceSettingsUpdate = { ...form };
    await update.mutateAsync(payload);
    setDraft(null); // server refresh becomes the new ground truth
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 2000);
  };

  // ── Loading / error states ─────────────────────────────────────────
  const loading =
    catalog.isLoading || settings.isLoading || counts.isLoading || form === null;
  const fatal = settings.isError;

  // Build per-source-card view model
  const cards = useMemo(() => {
    if (!form || !catalog.data) return [];
    const labels = Object.fromEntries(
      catalog.data.sources.map((s) => [s.source_type, s.label]),
    );
    const descs = Object.fromEntries(
      catalog.data.sources.map((s) => [s.source_type, s.description]),
    );
    const countMap = Object.fromEntries(
      counts.data?.counts.map((c) => [c.source_type, c.count]) ?? [],
    );
    return SOURCES.map((s) => ({
      ...s,
      label: labels[s.key] ?? s.key,
      description: descs[s.key] ?? "",
      count: countMap[s.key] ?? 0,
      enabled: !!form[s.flag as keyof FormState],
    }));
  }, [form, catalog.data, counts.data]);

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4"
      >
        <div>
          <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
            Candidate Sources
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Control where the candidates in your jobs come from. Toggles set
            the <span className="font-semibold text-foreground">defaults</span>{" "}
            applied to new jobs — each job can override these later from its
            own Candidate Sources tab.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">
              Unsaved changes
            </Badge>
          )}
          {savedTick && (
            <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 gap-1">
              <CheckCircle2 className="h-3 w-3" /> Saved
            </Badge>
          )}
          <Button size="sm" onClick={onSave} disabled={!dirty || update.isPending} className="gap-2">
            {update.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save defaults
          </Button>
        </div>
      </motion.div>

      {/* Loading */}
      {loading && !fatal && (
        <div className="glass rounded-xl p-6 flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading source settings…
        </div>
      )}

      {/* Backend error */}
      {fatal && (
        <div className="glass rounded-2xl p-6 space-y-3 border border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <h2 className="text-base font-semibold text-foreground">
              Source settings backend not reachable
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            The endpoint{" "}
            <code className="font-mono text-xs bg-muted/50 px-1 rounded">
              /api/v1/organization/candidate-source-settings
            </code>{" "}
            did not respond. Toggles are disabled until the backend is
            available.
          </p>
        </div>
      )}

      {/* Source cards */}
      {!loading && !fatal && form && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cards.map((c, i) => {
              const Icon = c.icon;
              return (
                <motion.div
                  key={c.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i }}
                  className={cn(
                    "glass rounded-xl p-5 space-y-3 transition-colors",
                    !c.enabled && "opacity-70",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                          c.enabled
                            ? "bg-primary/10 text-primary"
                            : "bg-muted/30 text-muted-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading text-[14px] font-semibold text-foreground">
                            {c.label}
                          </h3>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono"
                          >
                            {c.count} candidate{c.count === 1 ? "" : "s"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-[12px] text-muted-foreground">
                          {c.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={c.enabled}
                      onCheckedChange={(v) =>
                        onToggle(c.flag as keyof FormState, v)
                      }
                    />
                  </div>
                  {c.action && (
                    <Link
                      href={c.action.href}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                    >
                      {c.action.label} <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Default matching parameters */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass rounded-xl p-5 space-y-4"
          >
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              <h2 className="font-heading text-[15px] font-semibold text-foreground">
                Default matching parameters
              </h2>
            </div>
            <p className="text-[12px] text-muted-foreground">
              Applied to every new job&apos;s candidate pool. Each job can
              override these in its own settings.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Top K candidates
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={form.default_top_k}
                  onChange={(e) =>
                    onNumber(
                      "default_top_k",
                      Math.max(1, Math.min(500, +e.target.value || 1)),
                    )
                  }
                  className="h-9"
                />
                <p className="text-[10px] text-muted-foreground">
                  How many candidates the screening agent returns per job.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Min profile completeness
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.default_min_profile_completeness}
                  onChange={(e) =>
                    onNumber(
                      "default_min_profile_completeness",
                      Math.max(0, Math.min(100, +e.target.value || 0)),
                    )
                  }
                  className="h-9"
                />
                <p className="text-[10px] text-muted-foreground">
                  0–100. Candidates below this score are excluded from the
                  pool.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Min evidence confidence
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.default_min_evidence_confidence}
                  onChange={(e) =>
                    onNumber(
                      "default_min_evidence_confidence",
                      Math.max(0, Math.min(100, +e.target.value || 0)),
                    )
                  }
                  className="h-9"
                />
                <p className="text-[10px] text-muted-foreground">
                  0–100. Candidates below this confidence are excluded.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Quick actions */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-xl p-5 space-y-3"
          >
            <div className="flex items-center gap-2">
              <UserPlus2 className="h-4 w-4 text-primary" />
              <h2 className="font-heading text-[15px] font-semibold text-foreground">
                Bring in more candidates
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <ActionTile
                href="/org/cv-ingestion"
                icon={Upload}
                title="Upload CVs"
                detail="Parse uploaded resumes into structured profiles."
              />
              <ActionTile
                href="/sourcing"
                icon={Telescope}
                title="Run sourcing"
                detail="Outbound sourcing from external platforms."
              />
              <ActionTile
                href="/org/identity-resolution"
                icon={GitMerge}
                title="Review duplicates"
                detail="Merge candidate profiles flagged as duplicates."
              />
              <ActionTile
                href="/candidates?completeness=low"
                icon={FileSearch}
                title="Incomplete profiles"
                detail="Candidates that need more data before screening."
              />
            </div>
          </motion.div>

          {/* Info footer */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="glass rounded-xl p-5 space-y-2 border border-primary/15 bg-primary/5"
          >
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              <h2 className="text-[13px] font-semibold text-foreground">
                How candidate pools are built
              </h2>
            </div>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              When you create a job, the platform copies these defaults into
              the job&apos;s pool config. The Candidate Pool Builder fetches
              candidates only from sources you have enabled, applies tenant
              isolation (your uploaded/sourced/job-fair/ATS candidates stay
              private; PATHS profiles are visible to every active org),
              deduplicates by email/phone, and excludes candidates whose
              profile completeness or evidence confidence is below the
              minimums above. The matching agent then ranks the eligible pool.
            </p>
          </motion.div>
        </>
      )}
    </div>
  );
}

function ActionTile({
  href,
  icon: Icon,
  title,
  detail,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-lg border border-border/40 bg-background/40 px-3.5 py-3 transition-all hover:border-primary/40 hover:bg-primary/5"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground">{detail}</p>
      </div>
      <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-primary" />
    </Link>
  );
}
