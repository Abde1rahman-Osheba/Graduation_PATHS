"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Edit2, Eye, EyeOff, MapPin, Mail, Phone, ExternalLink,
  Globe, GraduationCap, Briefcase, Code2, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCandidateProfile } from "@/lib/hooks";
import { createEmptyCandidateProfile } from "@/lib/candidate/portal-profile";
import { cn } from "@/lib/utils/cn";

const proficiencyColors: Record<string, string> = {
  beginner:     "border-slate-500/30 bg-slate-500/8 text-slate-400",
  intermediate: "border-primary/30 bg-primary/8 text-primary",
  advanced:     "border-violet-500/30 bg-violet-500/8 text-violet-400",
  expert:       "border-amber-500/30 bg-amber-500/8 text-amber-400",
};

export default function CandidateProfilePage() {
  const [showAnonymized, setShowAnonymized] = useState(false);
  const { data: profile = createEmptyCandidateProfile() } = useCandidateProfile();

  const anon = useMemo(() => {
    const shortId = profile.id ? String(profile.id).slice(0, 8) : "";
    return {
      alias: shortId ? `Candidate ${shortId}` : "Candidate",
      currentTitle: profile.currentTitle || "—",
      careerLevel: profile.careerLevel,
      yearsExperience: profile.yearsExperience,
      locationGeneral: profile.locationText || profile.locationCity || "—",
      summary: profile.summary || "—",
      skills: profile.skills.map((s) => ({ name: s.name, proficiency: s.proficiency })),
      experiences: profile.experiences.map((e) => ({
        title: e.title,
        durationMonths: null as number | null,
        description: e.description ?? "",
        isCurrent: e.isCurrent,
      })),
      education: profile.education.map((e) => ({
        degree: e.degree,
        fieldOfStudy: e.fieldOfStudy,
        graduationYear: e.endYear,
      })),
    };
  }, [profile]);

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">My Profile</h1>
            <p className="mt-1 text-sm text-muted-foreground">This is how your profile appears to recruiters.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowAnonymized((v) => !v)}
            >
              {showAnonymized ? <><Eye className="h-3.5 w-3.5" /> Show Full</> : <><EyeOff className="h-3.5 w-3.5" /> Preview Anonymized</>}
            </Button>
            <Button size="sm" className="gap-2 glow-blue" asChild>
              <Link href="/candidate/profile/edit"><Edit2 className="h-3.5 w-3.5" /> Edit Profile</Link>
            </Button>
          </div>
        </motion.div>

        {showAnonymized && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/8 px-5 py-3 text-sm text-amber-400"
          >
            <strong>Anonymized Preview</strong> — this is what recruiters see during initial screening. Your name, photo, and contact details are hidden.
          </motion.div>
        )}

        <div className="space-y-5">
          {/* Identity card */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="glass gradient-border rounded-2xl p-7"
          >
            <div className="flex items-start gap-5 flex-wrap">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/20 font-heading text-2xl font-bold text-primary">
                {showAnonymized ? anon.alias.charAt(anon.alias.length - 1) : profile.fullName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-heading text-xl font-bold text-foreground">
                  {showAnonymized ? anon.alias : profile.fullName}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {showAnonymized ? anon.currentTitle : profile.currentTitle}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-[11px] capitalize">
                    {showAnonymized ? anon.careerLevel : profile.careerLevel}
                  </Badge>
                  <Badge variant="outline" className="text-[11px] text-muted-foreground">
                    {showAnonymized ? anon.yearsExperience : profile.yearsExperience} yrs experience
                  </Badge>
                  <Badge variant="outline" className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {showAnonymized ? anon.locationGeneral : profile.locationText}
                  </Badge>
                </div>
              </div>
            </div>

            <p className="mt-5 text-[13px] leading-relaxed text-muted-foreground">
              {showAnonymized ? anon.summary : profile.summary}
            </p>

            {/* Contact (hidden in anon view) */}
            {!showAnonymized && (
              <div className="mt-5 flex flex-wrap gap-4 text-xs text-muted-foreground">
                {profile.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{profile.email}</span>}
                {profile.phone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{profile.phone}</span>}
                {profile.links.linkedin && <a href={profile.links.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline"><ExternalLink className="h-3.5 w-3.5" />LinkedIn</a>}
                {profile.links.github   && <a href={profile.links.github}   target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline"><ExternalLink className="h-3.5 w-3.5" />GitHub</a>}
                {profile.links.portfolio && <a href={profile.links.portfolio} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline"><Globe className="h-3.5 w-3.5" />Portfolio</a>}
              </div>
            )}
          </motion.div>

          {/* Skills */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Code2 className="h-4 w-4 text-primary" />
              <h3 className="font-heading text-sm font-bold text-foreground">Skills</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {(showAnonymized ? anon.skills : profile.skills).map((sk) => (
                <span key={sk.name} className={cn("rounded-full border px-3 py-1 text-[11px] font-medium", proficiencyColors[sk.proficiency] ?? "text-muted-foreground border-border/40")}>
                  {sk.name} · {sk.proficiency}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Experience */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="h-4 w-4 text-primary" />
              <h3 className="font-heading text-sm font-bold text-foreground">Experience</h3>
            </div>
            <div className="space-y-4">
              {(showAnonymized
                ? anon.experiences.map((e, i) => ({ id: `anon-${i}`, title: e.title, companyName: "[Anonymized]", location: undefined, startDate: "", endDate: null, isCurrent: e.isCurrent, description: e.description }))
                : profile.experiences
              ).map((exp) => (
                <div key={exp.id} className="border-l-2 border-primary/20 pl-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{exp.title}</p>
                    {exp.isCurrent && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">Current</span>}
                  </div>
                  {!showAnonymized && <p className="text-xs text-muted-foreground">{(exp as typeof profile.experiences[0]).companyName} · {(exp as typeof profile.experiences[0]).location}</p>}
                  {!showAnonymized && <p className="text-xs text-muted-foreground/60">{(exp as typeof profile.experiences[0]).startDate} – {exp.isCurrent ? "Present" : exp.endDate ?? "—"}</p>}
                  {exp.description && <p className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed">{exp.description}</p>}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Education */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="h-4 w-4 text-primary" />
              <h3 className="font-heading text-sm font-bold text-foreground">Education</h3>
            </div>
            <div className="space-y-3">
              {(showAnonymized
                ? anon.education.map((e, i) => ({ id: `edu-${i}`, degree: e.degree, fieldOfStudy: e.fieldOfStudy, institution: "[Anonymized]", endYear: e.graduationYear, isOngoing: false }))
                : profile.education
              ).map((edu) => (
                <div key={edu.id} className="border-l-2 border-primary/20 pl-4">
                  <p className="text-sm font-semibold text-foreground">{edu.degree} · {edu.fieldOfStudy}</p>
                  {!showAnonymized && <p className="text-xs text-muted-foreground">{(edu as typeof profile.education[0]).institution} · {(edu as typeof profile.education[0]).startYear}–{edu.isOngoing ? "Present" : edu.endYear}</p>}
                  {showAnonymized && edu.endYear && <p className="text-xs text-muted-foreground">Graduated {edu.endYear}</p>}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Preferences */}
          {!showAnonymized && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="glass rounded-2xl p-6"
            >
              <h3 className="font-heading text-sm font-bold text-foreground mb-4">Job Preferences</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex flex-wrap gap-1.5">
                  {profile.preferences.jobTypes.map((t) => <span key={t} className="evidence-pill capitalize">{t.replace("_", " ")}</span>)}
                  {profile.preferences.workplaceTypes.map((t) => <span key={t} className="evidence-pill capitalize">{t}</span>)}
                </div>
                <p>{profile.preferences.salaryCurrency} {profile.preferences.desiredSalaryMin?.toLocaleString()} – {profile.preferences.desiredSalaryMax?.toLocaleString()} / mo</p>
                {profile.preferences.noticePeriodWeeks != null && (
                  <p>Notice period: {profile.preferences.noticePeriodWeeks === 0 ? "Available immediately" : `${profile.preferences.noticePeriodWeeks} weeks`}</p>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
