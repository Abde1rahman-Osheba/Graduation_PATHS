"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Upload, FileText, X, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnboardingStore } from "@/lib/stores/onboarding.store";
import { getToken } from "@/lib/api/client";
import { cn } from "@/lib/utils/cn";
import type {
  ProfileEducation,
  ProfileExperience,
  ProfileSkill,
  CareerLevel,
} from "@/types/candidate-profile.types";

const ACCEPTED = [".pdf", ".doc", ".docx"];
const MAX_MB = 10;

type CVExtractionPayload = {
  skills?: Array<string | Partial<ProfileSkill>>;
  experiences?: Array<Partial<ProfileExperience>>;
  education?: Array<Partial<ProfileEducation>>;
  currentTitle?: string;
  summary?: string;
  yearsExperience?: number;
  careerLevel?: CareerLevel;
};

type CVIngestionJobResponse = {
  job_id: string;
  candidate_id: string | null;
  document_id?: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  stage?: string;
  error_message?: string | null;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function inferSkillCategory(name: string): ProfileSkill["category"] {
  const lower = name.toLowerCase();
  if (
    ["python", "javascript", "typescript", "react", "node", "sql", "docker", "aws", "git", "java", "c++"]
      .some((token) => lower.includes(token))
  ) {
    return "technical";
  }
  return "other";
}

function normalizeExtraction(raw: unknown): CVExtractionPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const candidate = (obj.extracted_candidate ?? obj.extracted_profile ?? obj.extracted_data ?? obj) as Record<string, unknown>;
  if (!candidate || typeof candidate !== "object") return null;

  const skills = Array.isArray(candidate.skills) ? candidate.skills : undefined;
  const experiences = Array.isArray(candidate.experiences) ? candidate.experiences : undefined;
  const education = Array.isArray(candidate.education) ? candidate.education : undefined;

  return {
    skills: skills as Array<string | Partial<ProfileSkill>> | undefined,
    experiences: experiences as Array<Partial<ProfileExperience>> | undefined,
    education: education as Array<Partial<ProfileEducation>> | undefined,
    currentTitle: typeof candidate.current_title === "string" ? candidate.current_title : undefined,
    summary: typeof candidate.summary === "string" ? candidate.summary : undefined,
    yearsExperience: typeof candidate.years_experience === "number" ? candidate.years_experience : undefined,
    careerLevel: typeof candidate.career_level === "string" ? (candidate.career_level as CareerLevel) : undefined,
  };
}

function toProfileSkills(input: CVExtractionPayload["skills"]): ProfileSkill[] {
  if (!input || input.length === 0) return [];
  return input
    .map((item) => {
      if (typeof item === "string") {
        const name = item.trim();
        if (!name) return null;
        return {
          id: crypto.randomUUID(),
          name,
          category: inferSkillCategory(name),
          proficiency: "intermediate" as const,
        };
      }
      if (!item || typeof item !== "object") return null;
      const rawName = item.name;
      if (typeof rawName !== "string" || rawName.trim().length === 0) return null;
      return {
        id: item.id ?? crypto.randomUUID(),
        name: rawName.trim(),
        category: item.category ?? inferSkillCategory(rawName),
        proficiency: item.proficiency ?? "intermediate",
      };
    })
    .filter((skill): skill is ProfileSkill => Boolean(skill));
}

function toProfileExperiences(input: CVExtractionPayload["experiences"]): ProfileExperience[] {
  if (!input || input.length === 0) return [];
  return input
    .map((exp): ProfileExperience | null => {
      if (!exp || typeof exp !== "object") return null;
      if (!exp.companyName || !exp.title || !exp.startDate) return null;
      return {
        id: exp.id ?? crypto.randomUUID(),
        companyName: exp.companyName,
        title: exp.title,
        location: exp.location,
        startDate: exp.startDate,
        endDate: exp.endDate ?? null,
        isCurrent: exp.isCurrent ?? exp.endDate == null,
        description: exp.description,
        achievements: exp.achievements ?? [],
      };
    })
    .filter((exp): exp is ProfileExperience => exp !== null);
}

function toProfileEducation(input: CVExtractionPayload["education"]): ProfileEducation[] {
  if (!input || input.length === 0) return [];
  return input
    .map((edu): ProfileEducation | null => {
      if (!edu || typeof edu !== "object") return null;
      if (!edu.institution || !edu.degree || !edu.fieldOfStudy) return null;
      return {
        id: edu.id ?? crypto.randomUUID(),
        institution: edu.institution,
        degree: edu.degree,
        fieldOfStudy: edu.fieldOfStudy,
        startYear: edu.startYear ?? null,
        endYear: edu.endYear ?? null,
        isOngoing: edu.isOngoing ?? edu.endYear == null,
        gpa: edu.gpa,
        description: edu.description,
      };
    })
    .filter((edu): edu is ProfileEducation => edu !== null);
}

async function pollIngestionJob(
  apiUrl: string,
  jobId: string,
  timeoutMs = 90000
): Promise<CVIngestionJobResponse> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const res = await fetch(`${apiUrl}/api/v1/cv-ingestion/jobs/${jobId}`, {
      credentials: "include",
    });
    if (!res.ok) {
      throw new Error("Failed to check CV ingestion status.");
    }
    const job = (await res.json()) as CVIngestionJobResponse;
    if (job.status === "completed" || job.status === "failed") {
      return job;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("CV extraction timed out. Please try again.");
}

export default function CVUploadPage() {
  const router = useRouter();
  const { draft, updateDraft, markStepComplete, saveDraft } = useOnboardingStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [uploadedDoc, setUploadedDoc] = useState(draft.cvDocument ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFile = useCallback(async (f: File) => {
    setError(null);
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File too large. Max size is ${MAX_MB} MB.`);
      return;
    }
    setFile(f);
    setUploadState("uploading");

    // Try real upload, fall back to mock
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (apiUrl) {
        const fd = new FormData();
        fd.append("file", f);
        const res = await fetch(`${apiUrl}/api/v1/cv-ingestion/upload`, {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        if (res.ok) {
          const upload = (await res.json()) as CVIngestionJobResponse;
          const job = await pollIngestionJob(apiUrl, upload.job_id);
          if (job.status === "failed") {
            throw new Error(job.error_message || "CV extraction failed on backend.");
          }

          if (job.candidate_id) {
            const token = getToken();
            const profileRes = await fetch(`${apiUrl}/api/v1/candidates/${job.candidate_id}`, {
              credentials: "include",
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            if (profileRes.ok) {
              const profile = (await profileRes.json()) as {
                candidate?: {
                  full_name?: string;
                  summary?: string;
                  years_experience?: number;
                  career_level?: CareerLevel;
                };
                skills?: Array<{ name?: string; skill?: string }>;
                experiences?: Array<{ company?: string; title?: string }>;
                education?: Array<{ institution?: string; degree?: string }>;
              };

              const extractedSkills = (profile.skills ?? [])
                .map((s) => s.name ?? s.skill)
                .filter((name): name is string => Boolean(name))
                .map((name) => ({
                  id: crypto.randomUUID(),
                  name,
                  category: inferSkillCategory(name),
                  proficiency: "intermediate" as const,
                }));

              const extractedExperiences = (profile.experiences ?? [])
                .filter((e) => e.company && e.title)
                .map((e) => ({
                  id: crypto.randomUUID(),
                  companyName: e.company!,
                  title: e.title!,
                  location: "",
                  startDate: "",
                  endDate: null,
                  isCurrent: false,
                  description: "",
                  achievements: [],
                }));

              const extractedEducation = (profile.education ?? [])
                .filter((e) => e.institution && e.degree)
                .map((e) => ({
                  id: crypto.randomUUID(),
                  institution: e.institution!,
                  degree: e.degree!,
                  fieldOfStudy: "",
                  startYear: null,
                  endYear: null,
                  isOngoing: false,
                  gpa: "",
                  description: "",
                }));

              updateDraft({
                ...(profile.candidate?.full_name ? { fullName: profile.candidate.full_name } : {}),
                ...(profile.candidate?.summary ? { summary: profile.candidate.summary } : {}),
                ...(typeof profile.candidate?.years_experience === "number"
                  ? { yearsExperience: profile.candidate.years_experience }
                  : {}),
                ...(profile.candidate?.career_level ? { careerLevel: profile.candidate.career_level } : {}),
                ...(extractedSkills.length > 0 ? { skills: extractedSkills } : {}),
                ...(extractedExperiences.length > 0 ? { experiences: extractedExperiences } : {}),
                ...(extractedEducation.length > 0 ? { education: extractedEducation } : {}),
              });
            }
          }

          const doc = {
            id: job.document_id ?? crypto.randomUUID(),
            fileName: f.name,
            fileSize: f.size,
            mimeType: f.type,
            uploadedAt: new Date().toISOString(),
            status: "processed" as const,
          };
          setUploadedDoc(doc);
          setUploadState("done");
          return;
        }
        throw new Error("Upload failed. Please check backend and try again.");
      }
    } catch (e) {
      setUploadState("error");
      setError(e instanceof Error ? e.message : "CV upload failed.");
      return;
    }

    // Mock upload — simulate 1.5s processing
    await new Promise((r) => setTimeout(r, 1500));
    const mockDoc = {
      id: crypto.randomUUID(),
      fileName: f.name,
      fileSize: f.size,
      mimeType: f.type,
      uploadedAt: new Date().toISOString(),
      status: "processing" as const,
    };
    setUploadedDoc(mockDoc);
    setUploadState("done");
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const clearFile = () => {
    setFile(null);
    setUploadedDoc(null);
    setUploadState("idle");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onSubmit = async () => {
    setIsSubmitting(true);
    if (uploadedDoc) updateDraft({ cvDocument: uploadedDoc });
    markStepComplete("cv-upload");
    await saveDraft();
    router.push("/onboarding/skills");
  };

  const canContinue = uploadState === "done" || !!draft.cvDocument;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mx-auto max-w-2xl px-6 py-10"
    >
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Step 3 of 9</p>
        <h1 className="mt-1 font-heading text-3xl font-bold text-foreground">Upload Your CV</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your resume or CV. Our AI will extract skills, experience, and education automatically.
        </p>
      </div>

      <div className="space-y-6">
        {/* Drop zone */}
        {uploadState !== "done" && (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-12 text-center transition-all",
              isDragging
                ? "border-primary/60 bg-primary/5"
                : "border-border/50 hover:border-primary/40 hover:bg-muted/10"
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED.join(",")}
              className="sr-only"
              onChange={onFileChange}
            />
            <div className={cn(
              "flex h-16 w-16 items-center justify-center rounded-2xl transition-colors",
              isDragging ? "bg-primary/15" : "bg-muted/30"
            )}>
              <Upload className={cn("h-7 w-7", isDragging ? "text-primary" : "text-muted-foreground")} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {isDragging ? "Drop it here" : "Drag & drop your CV here"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">or click to browse — PDF, DOC, DOCX · Max {MAX_MB} MB</p>
            </div>
          </div>
        )}

        {/* Uploading */}
        {uploadState === "uploading" && file && (
          <div className="glass rounded-xl p-4 flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(file.size)} · Uploading…</p>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted/30">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: "0%" }}
                  animate={{ width: "90%" }}
                  transition={{ duration: 1.2 }}
                />
              </div>
            </div>
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
          </div>
        )}

        {/* Done */}
        {uploadState === "done" && uploadedDoc && (
          <div className="glass gradient-border rounded-xl p-4 flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{uploadedDoc.fileName}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(uploadedDoc.fileSize)} · Uploaded successfully</p>
              <p className="mt-0.5 text-[10px] text-primary/70">AI is extracting skills and experience in the background</p>
            </div>
            <button type="button" onClick={clearFile} className="text-muted-foreground/50 hover:text-destructive transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Prior upload from draft */}
        {uploadState === "idle" && draft.cvDocument && (
          <div className="glass rounded-xl p-4 flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
              <FileText className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{draft.cvDocument.fileName}</p>
              <p className="text-xs text-muted-foreground">Previously uploaded · {formatBytes(draft.cvDocument.fileSize)}</p>
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">{error}</p>
        )}

        <p className="text-[11px] text-muted-foreground/60">
          Your CV is stored securely. It is only used to pre-fill your profile and match you to roles. It is never shared without your consent.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="ghost" className="gap-2" onClick={() => router.push("/onboarding/contact")}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex items-center gap-3">
            {!canContinue && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground underline"
                onClick={onSubmit}
              >
                Skip for now
              </button>
            )}
            <Button
              type="button"
              className="gap-2 glow-blue"
              disabled={isSubmitting || uploadState === "uploading"}
              onClick={onSubmit}
            >
              {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <>Save &amp; Continue <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
