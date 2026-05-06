"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCandidateProfile, useUpdateCandidateProfile } from "@/lib/hooks";
import { createEmptyCandidateProfile } from "@/lib/candidate/portal-profile";
import type { CareerLevel } from "@/types/candidate-profile.types";
import { cn } from "@/lib/utils/cn";

type Tab = "basic" | "contact" | "links" | "preferences";

const TABS: { key: Tab; label: string }[] = [
  { key: "basic",       label: "Basic Info"   },
  { key: "contact",     label: "Contact"      },
  { key: "links",       label: "Links"        },
  { key: "preferences", label: "Preferences"  },
];

export default function EditProfilePage() {
  const { data: profile = createEmptyCandidateProfile() } = useCandidateProfile();
  const updateProfile = useUpdateCandidateProfile();
  const [tab, setTab] = useState<Tab>("basic");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    fullName:        "",
    currentTitle:    "",
    summary:         "",
    careerLevel:     "mid" as CareerLevel,
    yearsExperience: 0,
    email:           "",
    phone:           "",
    locationCity:    "",
    locationCountry: "",
    linkedin:        "",
    github:          "",
    portfolio:       "",
    website:         "",
    salaryMin:       "" as number | "",
    salaryMax:       "" as number | "",
    salaryCurrency:  "USD",
  });

  useEffect(() => {
    if (!profile.id) return;
    setForm({
      fullName:        profile.fullName,
      currentTitle:    profile.currentTitle,
      summary:         profile.summary,
      careerLevel:     profile.careerLevel,
      yearsExperience: profile.yearsExperience,
      email:           profile.email,
      phone:           profile.phone ?? "",
      locationCity:    profile.locationCity ?? "",
      locationCountry: profile.locationCountry ?? "",
      linkedin:        profile.links.linkedin ?? "",
      github:          profile.links.github ?? "",
      portfolio:       profile.links.portfolio ?? "",
      website:         profile.links.website ?? "",
      salaryMin:       profile.preferences.desiredSalaryMin ?? "",
      salaryMax:       profile.preferences.desiredSalaryMax ?? "",
      salaryCurrency:  profile.preferences.salaryCurrency,
    });
  }, [profile]);

  const update = (key: keyof typeof form, value: string | number) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile.mutateAsync({
        full_name: form.fullName,
        phone: form.phone || undefined,
        years_experience: Number(form.yearsExperience),
        career_level: form.careerLevel,
        skills: profile.skills.map((s) => s.name),
        open_to_job_types: profile.preferences.jobTypes,
        open_to_workplace_settings: profile.preferences.workplaceTypes,
        desired_job_titles: profile.preferences.desiredRoles,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // Error surfaced by mutation / toast in a follow-up if needed
    }
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-center gap-4">
          <Link href="/candidate/profile" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex-1">
            <h1 className="font-heading text-2xl font-bold text-foreground">Edit Profile</h1>
          </div>
          <Button className="gap-2 glow-blue" disabled={isSaving} onClick={handleSave}>
            {isSaving ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
            ) : saved ? (
              <><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Saved</>
            ) : (
              <><Save className="h-4 w-4" /> Save Changes</>
            )}
          </Button>
        </motion.div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl bg-muted/20 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex-1 rounded-lg py-2 text-xs font-semibold transition-all",
                tab === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <motion.div key={tab} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
          {/* Basic Info */}
          {tab === "basic" && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Full Name</Label>
                <Input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Current Title</Label>
                <Input value={form.currentTitle} onChange={(e) => update("currentTitle", e.target.value)} className="h-11" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Career Level</Label>
                  <select
                    value={form.careerLevel}
                    onChange={(e) => update("careerLevel", e.target.value)}
                    className="flex h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {["junior","mid","senior","lead","manager","director","executive"].map((l) => (
                      <option key={l} value={l} className="capitalize">{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Years of Experience</Label>
                  <Input type="number" min={0} max={50} value={form.yearsExperience} onChange={(e) => update("yearsExperience", Number(e.target.value))} className="h-11" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Professional Summary</Label>
                <textarea
                  rows={5}
                  value={form.summary}
                  onChange={(e) => update("summary", e.target.value)}
                  className="flex min-h-[120px] w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
          )}

          {/* Contact */}
          {tab === "contact" && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Email Address</Label>
                <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Phone <span className="text-muted-foreground/60">(optional)</span></Label>
                <Input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} className="h-11" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">City</Label>
                  <Input value={form.locationCity} onChange={(e) => update("locationCity", e.target.value)} className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Country</Label>
                  <Input value={form.locationCountry} onChange={(e) => update("locationCountry", e.target.value)} className="h-11" />
                </div>
              </div>
            </div>
          )}

          {/* Links */}
          {tab === "links" && (
            <div className="space-y-5">
              {[
                { key: "linkedin",  label: "LinkedIn",         placeholder: "https://linkedin.com/in/…"  },
                { key: "github",    label: "GitHub",           placeholder: "https://github.com/…"       },
                { key: "portfolio", label: "Portfolio",        placeholder: "https://yourportfolio.com"  },
                { key: "website",   label: "Personal Website", placeholder: "https://yoursite.com"       },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-sm font-medium">{label}</Label>
                  <Input
                    type="url"
                    placeholder={placeholder}
                    value={form[key as keyof typeof form] as string}
                    onChange={(e) => update(key as keyof typeof form, e.target.value)}
                    className="h-11"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Preferences */}
          {tab === "preferences" && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Desired Salary Range</Label>
                <div className="flex items-center gap-2">
                  <select
                    value={form.salaryCurrency}
                    onChange={(e) => update("salaryCurrency", e.target.value)}
                    className="h-10 rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {["USD","EGP","EUR","GBP","AED","SAR"].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <Input
                    type="number" placeholder="Min"
                    value={form.salaryMin}
                    onChange={(e) => update("salaryMin", e.target.value)}
                    className="h-10"
                  />
                  <span className="text-muted-foreground">–</span>
                  <Input
                    type="number" placeholder="Max"
                    value={form.salaryMax}
                    onChange={(e) => update("salaryMax", e.target.value)}
                    className="h-10"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground/60">Monthly gross salary</p>
              </div>
              <p className="text-sm text-muted-foreground">For detailed preference editing, visit the <Link href="/onboarding/preferences" className="text-primary hover:underline">preferences step</Link> in onboarding.</p>
            </div>
          )}
        </motion.div>

        {/* Save button (bottom) */}
        <div className="mt-8 flex justify-end">
          <Button className="gap-2 glow-blue" disabled={isSaving} onClick={handleSave}>
            {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : saved ? <><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Saved</> : <><Save className="h-4 w-4" /> Save Changes</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
