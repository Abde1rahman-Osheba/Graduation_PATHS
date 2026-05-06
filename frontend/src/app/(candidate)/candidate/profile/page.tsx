"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GlossCard } from "@/components/ui/gloss-card";
import { useMe } from "@/components/auth/me-provider";
import { LoadingState } from "@/components/states/loading-state";
import { ErrorState } from "@/components/states/error-state";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { getMyCandidateProfile, updateMyCandidateProfile } from "@/lib/api/candidate";

const JOB_TYPES = ["Full Time", "Part Time", "Freelance / Project", "Internship", "Shift Based", "Volunteering", "Student Activity"];
const WORKPLACE_SETTINGS = ["On-site", "Remote", "Hybrid"];
const CAREER_LEVELS = ["Student", "Entry", "Junior", "Mid-level", "Senior", "Lead", "Manager"];

export default function CandidateProfilePage() {
  const router = useRouter();
  const { user, loading, error, refresh } = useMe();
  const [phone, setPhone] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [careerLevel, setCareerLevel] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [jobTitlesText, setJobTitlesText] = useState("");
  const [jobCategoriesText, setJobCategoriesText] = useState("");
  const [jobTypes, setJobTypes] = useState<string[]>([]);
  const [workplaceSettings, setWorkplaceSettings] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (user && user.account_type !== "candidate") router.replace("/org");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || user.account_type !== "candidate") return;
    getMyCandidateProfile()
      .then((profile: any) => {
        setPhone(profile.phone ?? "");
        setYearsExperience(profile.years_experience != null ? String(profile.years_experience) : "");
        setCareerLevel(profile.career_level ?? "");
        setSkillsText((profile.skills ?? []).join(", "));
        setJobTitlesText((profile.desired_job_titles ?? []).join(", "));
        setJobCategoriesText((profile.desired_job_categories ?? []).join(", "));
        setJobTypes(profile.open_to_job_types ?? []);
        setWorkplaceSettings(profile.open_to_workplace_settings ?? []);
      })
      .catch(() => {
        // /auth/me still renders base identity data; profile editor can continue
      });
  }, [user]);

  const parsedTitles = useMemo(
    () =>
      jobTitlesText
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 10),
    [jobTitlesText],
  );

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      await updateMyCandidateProfile({
        full_name: user.full_name,
        phone: phone.trim(),
        years_experience: yearsExperience ? Number(yearsExperience) : 0,
        career_level: careerLevel,
        skills: skillsText.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean),
        open_to_job_types: jobTypes,
        open_to_workplace_settings: workplaceSettings,
        desired_job_titles: parsedTitles,
        desired_job_categories: jobCategoriesText.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean),
      });
      setSaveMsg("Profile saved.");
      await refresh();
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading profile…" />;
  if (error) return <ErrorState title="Could not load profile" message={error} onRetry={() => refresh()} />;
  if (!user) return <LoadingState label="Loading session…" />;
  if (user.account_type !== "candidate") return <LoadingState label="Redirecting…" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-2 text-sm text-zinc-400">This page reflects what the backend exposes on `/auth/me` today.</p>
      </div>

      <GlossCard glow>
        <form className="space-y-4" onSubmit={onSave}>
          <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Name</p>
            <p className="mt-2 text-sm text-zinc-100">{user.full_name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Email</p>
            <p className="mt-2 text-sm text-zinc-100">{user.email}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Candidate profile id</p>
            <p className="mt-2 font-mono text-xs text-zinc-200">{user.candidate_profile?.id ?? "—"}</p>
          </div>
          </div>

          <Input label="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input
            label="How many years of experience do you have?"
            type="number"
            min={0}
            max={80}
            value={yearsExperience}
            onChange={(e) => setYearsExperience(e.target.value)}
          />
          <label className="space-y-2 text-sm">
            <span className="text-zinc-300">Current career level</span>
            <select
              className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              value={careerLevel}
              onChange={(e) => setCareerLevel(e.target.value)}
            >
              <option value="">Select level</option>
              {CAREER_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>

          <Textarea
            label="All skills (comma-separated)"
            value={skillsText}
            onChange={(e) => setSkillsText(e.target.value)}
            placeholder="Python, FastAPI, PostgreSQL, React"
          />

          <div className="space-y-2">
            <p className="text-sm text-zinc-300">What type(s) of job are you open to?</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {JOB_TYPES.map((item) => (
                <label key={item} className="flex items-center gap-2 text-sm text-zinc-200">
                  <input
                    type="checkbox"
                    checked={jobTypes.includes(item)}
                    onChange={() =>
                      setJobTypes((prev) => (prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]))
                    }
                  />
                  {item}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-zinc-300">Preferred workplace settings</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {WORKPLACE_SETTINGS.map((item) => (
                <label key={item} className="flex items-center gap-2 text-sm text-zinc-200">
                  <input
                    type="checkbox"
                    checked={workplaceSettings.includes(item)}
                    onChange={() =>
                      setWorkplaceSettings((prev) =>
                        prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item],
                      )
                    }
                  />
                  {item}
                </label>
              ))}
            </div>
          </div>

          <Textarea
            label="Job titles you are looking for (up to 10)"
            value={jobTitlesText}
            onChange={(e) => setJobTitlesText(e.target.value)}
            placeholder="Android Developer, Backend Engineer"
          />
          <Textarea
            label="Job categories you are interested in"
            value={jobCategoriesText}
            onChange={(e) => setJobCategoriesText(e.target.value)}
            placeholder="Software Development, Data, Product"
          />

          {saveMsg && <p className="text-sm text-zinc-300">{saveMsg}</p>}
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save profile"}
          </Button>
        </form>
      </GlossCard>
    </div>
  );
}
