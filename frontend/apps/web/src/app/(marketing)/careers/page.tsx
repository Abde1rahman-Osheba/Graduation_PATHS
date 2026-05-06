"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Search, MapPin, Briefcase, Users, SlidersHorizontal, X, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { usePublicJobs } from "@/lib/hooks";
import { cn } from "@/lib/utils/cn";

const workModeColors = {
  remote: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  hybrid: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  onsite: "border-blue-500/30 bg-blue-500/10 text-blue-400",
};

const levelColors = {
  Junior: "border-slate-500/30 bg-slate-500/10 text-slate-400",
  Mid:    "border-primary/30 bg-primary/10 text-primary",
  Senior: "border-violet-500/30 bg-violet-500/10 text-violet-400",
  Lead:   "border-amber-500/30 bg-amber-500/10 text-amber-400",
};

const workModes = ["All", "Remote", "Hybrid", "Onsite"];
const levels = ["All", "Junior", "Mid", "Senior", "Lead"];

export default function JobsPage() {
  const [query, setQuery] = useState("");
  const [workMode, setWorkMode] = useState("All");
  const [level, setLevel] = useState("All");
  const { data: jobs = [] } = usePublicJobs();

  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      const q = query.toLowerCase();
      const matchesQ = !q || job.title.toLowerCase().includes(q) || job.company.toLowerCase().includes(q) || job.skills.some((s) => s.toLowerCase().includes(q));
      const matchesMode = workMode === "All" || job.workMode === workMode.toLowerCase();
      const matchesLevel = level === "All" || job.level === level;
      return matchesQ && matchesMode && matchesLevel;
    });
  }, [query, workMode, level]);

  const hasFilters = query || workMode !== "All" || level !== "All";

  return (
    <div className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
          <Badge variant="outline" className="mb-4 border-primary/25 bg-primary/8 text-primary">Open Positions</Badge>
          <h1 className="font-heading text-4xl font-bold text-foreground">Find your next opportunity</h1>
          <p className="mt-3 text-muted-foreground">
            {jobs.length} open positions across MENA and globally.
            <Link href="/candidate-signup" className="ml-1 text-primary hover:underline">Create a profile to apply.</Link>
          </p>
        </motion.div>

        {/* Search + filters */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by title, company, or skill…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-12 pl-10 pr-4 text-sm"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Work Mode</span>
            </div>
            {workModes.map((m) => (
              <button
                key={m}
                onClick={() => setWorkMode(m)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                  workMode === m
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                {m}
              </button>
            ))}
            <div className="ml-4 flex items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Level</span>
            </div>
            {levels.map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                  level === l
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                {l}
              </button>
            ))}
            {hasFilters && (
              <button onClick={() => { setQuery(""); setWorkMode("All"); setLevel("All"); }} className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <X className="h-3 w-3" /> Clear all
              </button>
            )}
          </div>
        </div>

        {/* Results count */}
        <p className="mb-5 text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "position" : "positions"} found
        </p>

        {/* Job cards */}
        <div className="space-y-4">
          {filtered.map((job, i) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass gradient-border rounded-2xl p-6 hover:ring-1 hover:ring-primary/20 transition-all"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="font-heading text-[16px] font-bold text-foreground">{job.title}</h2>
                    <Badge variant="outline" className={cn("text-[10px]", levelColors[job.level as keyof typeof levelColors] ?? "")}>
                      {job.level}
                    </Badge>
                    <Badge variant="outline" className={cn("text-[10px]", workModeColors[job.workMode as keyof typeof workModeColors] ?? "")}>
                      {job.workMode}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-[12px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="h-3 w-3" />
                      {job.company}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" />
                      {job.location}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3 w-3" />
                      {job.applicants} applicants
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {job.postedAt}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {job.skills.map((s) => (
                      <span key={s} className="evidence-pill">{s}</span>
                    ))}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-[13px] font-semibold text-foreground">{job.salary}</p>
                  <Button size="sm" className="mt-3 gap-1.5 glow-blue" asChild>
                    <Link href="/candidate-signup">Apply <ArrowRight className="h-3.5 w-3.5" /></Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}

          {filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/40 p-16 text-center">
              <Search className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">No jobs match your filters</p>
              <button onClick={() => { setQuery(""); setWorkMode("All"); setLevel("All"); }} className="mt-3 text-xs text-primary hover:underline">
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="mt-16 glass gradient-border rounded-2xl p-8 text-center">
          <h3 className="font-heading text-xl font-bold text-foreground">Don't see the right role?</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create a profile and we'll match you automatically when new roles appear.
          </p>
          <Button className="mt-5 gap-2 glow-blue" asChild>
            <Link href="/candidate-signup">Create Profile <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
