"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight, CheckCircle2, Clock, Briefcase, User, FileText,
  TrendingUp, Eye, Bell, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCandidateProfile, useCandidateApplications } from "@/lib/hooks";
import type { CandidateProfile } from "@/types/candidate-profile.types";
import { createEmptyCandidateProfile } from "@/lib/candidate/portal-profile";
import { cn } from "@/lib/utils/cn";

const statusColors = {
  applied:     "border-slate-500/30 bg-slate-500/10 text-slate-400",
  screening:   "border-primary/30 bg-primary/10 text-primary",
  interview:   "border-amber-500/30 bg-amber-500/10 text-amber-400",
  offered:     "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  rejected:    "border-rose-500/30 bg-rose-500/10 text-rose-400",
  withdrawn:   "border-muted/30 bg-muted/10 text-muted-foreground",
};

const workModeColors = {
  remote: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  hybrid: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  onsite: "border-blue-500/30 bg-blue-500/10 text-blue-400",
};

function profileCompletionPct(profile: CandidateProfile) {
  let score = 0;
  if (profile.fullName)       score += 15;
  if (profile.currentTitle)   score += 10;
  if (profile.summary)        score += 10;
  if (profile.email)          score += 10;
  if (profile.education.length > 0) score += 15;
  if (profile.experiences.length > 0) score += 15;
  if (profile.skills.length > 0) score += 10;
  if (profile.cvDocument)     score += 10;
  if (profile.links.linkedin || profile.links.github) score += 5;
  return Math.min(score, 100);
}

export default function CandidateDashboard() {
  const { data: profile = createEmptyCandidateProfile(), isLoading: profileLoading } = useCandidateProfile();
  const { data: apps = [] } = useCandidateApplications();
  const completion = profileCompletionPct(profile);

  const stats = [
    { label: "Active Applications", value: apps.length,        Icon: Briefcase,  color: "text-primary"      },
    { label: "Profile Views",       value: 14,                 Icon: Eye,         color: "text-teal-400"     },
    { label: "Match Invites",       value: 3,                  Icon: Bell,        color: "text-amber-400"    },
    { label: "Profile Completion",  value: `${completion}%`,   Icon: TrendingUp,  color: "text-emerald-400"  },
  ];

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <p className="text-sm text-muted-foreground">Welcome back,</p>
          <h1 className="font-heading text-3xl font-bold text-foreground">
            {profileLoading ? "…" : profile.fullName.trim() || "Candidate"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {[profile.currentTitle, profile.locationText].filter(Boolean).join(" · ") || "—"}
          </p>
        </motion.div>

        {/* Profile completion banner */}
        {completion < 100 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="mb-6 glass gradient-border rounded-2xl p-5 flex items-center gap-4"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Your profile is {completion}% complete</p>
              <p className="text-xs text-muted-foreground mt-0.5">Complete your profile to get better match scores and more visibility.</p>
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
                <div className="h-full bg-primary transition-all duration-700" style={{ width: `${completion}%` }} />
              </div>
            </div>
            <Button size="sm" className="shrink-0 gap-1.5 glow-blue" asChild>
              <Link href="/candidate/profile/edit">Complete <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </motion.div>
        )}

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4"
        >
          {stats.map((s, i) => (
            <div key={s.label} className="glass rounded-2xl p-4 text-center">
              <s.Icon className={cn("mx-auto h-5 w-5 mb-2", s.color)} />
              <p className="font-heading text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Recent applications */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-foreground">Recent Applications</h2>
            <Link href="/candidate/applications" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {apps.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Briefcase className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">No applications yet</p>
              <Button className="mt-4 gap-2 glow-blue" size="sm" asChild>
                <Link href="/jobs">Browse Jobs <ArrowRight className="h-3.5 w-3.5" /></Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {apps.map((app) => (
                <div key={app.id} className="glass gradient-border rounded-2xl p-5 flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-heading text-sm font-bold text-foreground">{app.jobTitle}</p>
                      <Badge variant="outline" className={cn("text-[10px]", statusColors[app.status] ?? "")}>
                        {app.stage}
                      </Badge>
                      <Badge variant="outline" className={cn("text-[10px]", workModeColors[app.workMode] ?? "")}>
                        {app.workMode}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{app.companyName} · {app.location}</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Applied {new Date(app.appliedAt).toLocaleDateString()}
                    </p>
                  </div>
                  {app.matchScore && (
                    <div className="text-right shrink-0">
                      <p className="text-[11px] text-muted-foreground/60">Match Score</p>
                      <p className="font-heading text-2xl font-bold text-primary">{app.matchScore}%</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Quick links */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          {[
            { href: "/candidate/profile",      label: "View My Profile",  Icon: User,     desc: "See how recruiters see you"          },
            { href: "/candidate/documents",     label: "Manage Documents", Icon: FileText, desc: "Upload or update your CV"             },
            { href: "/jobs",                     label: "Browse Jobs",      Icon: Briefcase,desc: "Find new opportunities"              },
          ].map((item) => (
            <Link key={item.href} href={item.href}
              className="glass rounded-xl p-4 flex items-start gap-3 hover:ring-1 hover:ring-primary/20 transition-all"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <item.Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-[11px] text-muted-foreground">{item.desc}</p>
              </div>
            </Link>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
