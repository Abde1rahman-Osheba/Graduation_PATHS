"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Check, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useCreateJob, useUpdateFairnessRubric } from "@/lib/hooks";

// ── Step schemas ────────────────────────────────────────────────────────────

const step1Schema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  location: z.string().optional(),
  employment_type: z.string().optional(),
  workplace_type: z.string().optional(),
  seniority_level: z.string().optional(),
});

const step2Schema = z.object({
  salary_min: z.string().optional(),
  salary_max: z.string().optional(),
  min_years_experience: z.string().optional(),
  max_years_experience: z.string().optional(),
  company_name: z.string().optional(),
});

type Step1Values = z.infer<typeof step1Schema>;
type Step2Values = z.infer<typeof step2Schema>;

interface FairnessConfig {
  enabled: boolean;
  disparate_impact_threshold: number;
  protected_attrs: Record<string, boolean>;
}

const PROTECTED_ATTRS = ["gender", "race_ethnicity", "age", "disability", "veteran_status"];

const STEPS = ["Basic Info", "Requirements", "Fairness Rubric"];

// ── Sub-forms ────────────────────────────────────────────────────────────────

function Step1Form({
  defaultValues,
  onNext,
}: {
  defaultValues: Partial<Step1Values>;
  onNext: (v: Step1Values) => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Step1Values>({ resolver: zodResolver(step1Schema), defaultValues });

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="title">Job title *</Label>
        <Input id="title" {...register("title")} placeholder="e.g. Senior Software Engineer" />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="employment_type">Employment type</Label>
          <Select
            value={watch("employment_type") ?? ""}
            onValueChange={(v) => setValue("employment_type", v ?? undefined)}
          >
            <SelectTrigger id="employment_type">
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full_time">Full-time</SelectItem>
              <SelectItem value="part_time">Part-time</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="internship">Internship</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="workplace_type">Work mode</Label>
          <Select
            value={watch("workplace_type") ?? ""}
            onValueChange={(v) => setValue("workplace_type", v ?? undefined)}
          >
            <SelectTrigger id="workplace_type">
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="remote">Remote</SelectItem>
              <SelectItem value="onsite">On-site</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="location">Location</Label>
          <Input id="location" {...register("location")} placeholder="City, Country" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="seniority_level">Seniority</Label>
          <Select
            value={watch("seniority_level") ?? ""}
            onValueChange={(v) => setValue("seniority_level", v ?? undefined)}
          >
            <SelectTrigger id="seniority_level">
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="entry">Entry</SelectItem>
              <SelectItem value="mid">Mid</SelectItem>
              <SelectItem value="senior">Senior</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="principal">Principal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="Describe the role, responsibilities, and team…"
          rows={5}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" className="gap-2">
          Next <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

function Step2Form({
  defaultValues,
  onBack,
  onNext,
}: {
  defaultValues: Partial<Step2Values>;
  onBack: () => void;
  onNext: (v: Step2Values) => void;
}) {
  const { register, handleSubmit } = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="company_name">Company name</Label>
        <Input id="company_name" {...register("company_name")} placeholder="Acme Corp" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="salary_min">Salary min (USD)</Label>
          <Input
            id="salary_min"
            type="number"
            min={0}
            {...register("salary_min")}
            placeholder="60000"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="salary_max">Salary max (USD)</Label>
          <Input
            id="salary_max"
            type="number"
            min={0}
            {...register("salary_max")}
            placeholder="90000"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="min_years_experience">Min years experience</Label>
          <Input
            id="min_years_experience"
            type="number"
            min={0}
            {...register("min_years_experience")}
            placeholder="2"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="max_years_experience">Max years experience</Label>
          <Input
            id="max_years_experience"
            type="number"
            min={0}
            {...register("max_years_experience")}
            placeholder="8"
          />
        </div>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button type="submit" className="gap-2">
          Next <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

function Step3Form({
  config,
  onChange,
  onBack,
  onSubmit,
  isSubmitting,
}: {
  config: FairnessConfig;
  onChange: (c: FairnessConfig) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  function toggleAttr(attr: string) {
    onChange({
      ...config,
      protected_attrs: {
        ...config.protected_attrs,
        [attr]: !config.protected_attrs[attr],
      },
    });
  }

  return (
    <div className="space-y-6">
      {/* Enable toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
        <div>
          <p className="text-sm font-medium">Enable fairness monitoring</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Flags candidates if selection rates across protected groups diverge beyond the threshold.
          </p>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(v) => onChange({ ...config, enabled: v })}
        />
      </div>

      {config.enabled && (
        <>
          {/* Threshold */}
          <div className="space-y-2">
            <Label htmlFor="threshold">
              4/5ths threshold (disparate impact ratio)
              <span className="ml-2 font-normal text-muted-foreground text-xs">
                {(config.disparate_impact_threshold * 100).toFixed(0)}%
              </span>
            </Label>
            <input
              id="threshold"
              type="range"
              min={60}
              max={95}
              step={5}
              value={config.disparate_impact_threshold * 100}
              onChange={(e) =>
                onChange({
                  ...config,
                  disparate_impact_threshold: Number(e.target.value) / 100,
                })
              }
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>60% (lenient)</span>
              <span>80% (standard)</span>
              <span>95% (strict)</span>
            </div>
            <p className="text-xs text-muted-foreground">
              EEOC recommends 80%. Any group&apos;s selection rate must be ≥{" "}
              {(config.disparate_impact_threshold * 100).toFixed(0)}% of the highest-rate group.
            </p>
          </div>

          {/* Protected attributes */}
          <div className="space-y-2">
            <Label>Protected attributes to monitor</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {PROTECTED_ATTRS.map((attr) => (
                <label
                  key={attr}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                    config.protected_attrs[attr]
                      ? "border-primary/50 bg-primary/5"
                      : "border-border bg-transparent",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={!!config.protected_attrs[attr]}
                    onChange={() => toggleAttr(attr)}
                    className="rounded border-border accent-primary"
                  />
                  <span className="capitalize">{attr.replace(/_/g, " ")}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button onClick={onSubmit} disabled={isSubmitting} className="gap-2">
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Create Job
        </Button>
      </div>
    </div>
  );
}

// ── Main wizard page ─────────────────────────────────────────────────────────

export default function NewJobPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [step1Data, setStep1Data] = useState<Partial<Step1Values>>({});
  const [step2Data, setStep2Data] = useState<Partial<Step2Values>>({});
  const [fairness, setFairness] = useState<FairnessConfig>({
    enabled: true,
    disparate_impact_threshold: 0.8,
    protected_attrs: Object.fromEntries(PROTECTED_ATTRS.map((a) => [a, true])),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { mutateAsync: createJob } = useCreateJob();

  async function handleFinalSubmit() {
    setIsSubmitting(true);
    try {
      const body = {
        title: step1Data.title!,
        description: step1Data.description || undefined,
        location_text: step1Data.location || undefined,
        employment_type: step1Data.employment_type || undefined,
        workplace_type: step1Data.workplace_type || undefined,
        seniority_level: step1Data.seniority_level || undefined,
        company_name: step2Data.company_name || undefined,
        salary_min: step2Data.salary_min ? Number(step2Data.salary_min) : undefined,
        salary_max: step2Data.salary_max ? Number(step2Data.salary_max) : undefined,
        min_years_experience: step2Data.min_years_experience
          ? Number(step2Data.min_years_experience)
          : undefined,
        max_years_experience: step2Data.max_years_experience
          ? Number(step2Data.max_years_experience)
          : undefined,
        status: "draft",
        application_mode: "inbound",
        source_type: "manual",
        visibility: "internal",
        is_active: true,
        applicant_count: 0,
      };

      const job = await createJob(body);

      // Apply fairness rubric if enabled
      if (fairness.enabled) {
        try {
          const { putFairnessRubric: applyRubric } = await import("@/lib/api/index");
          await applyRubric(job.id, {
            protected_attrs: fairness.protected_attrs,
            disparate_impact_threshold: fairness.disparate_impact_threshold,
            enabled: true,
          });
        } catch {
          // Non-fatal: rubric can be set later from the job detail page
          toast.warning("Job created but fairness rubric could not be saved. Set it from job settings.");
        }
      }

      toast.success("Job created successfully!");
      router.push(`/jobs/${job.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create job.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-bold">Create New Job</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Fill in the details to create a new job posting.
        </p>
      </div>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-0">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                  i < step
                    ? "border-primary bg-primary text-primary-foreground"
                    : i === step
                      ? "border-primary bg-background text-primary"
                      : "border-border bg-background text-muted-foreground",
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "mt-1 text-[10px] font-medium whitespace-nowrap",
                  i === step ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "mb-5 h-px w-16 transition-colors",
                  i < step ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="rounded-xl border border-border bg-card p-6">
        {step === 0 && (
          <Step1Form
            defaultValues={step1Data}
            onNext={(v) => { setStep1Data(v); setStep(1); }}
          />
        )}
        {step === 1 && (
          <Step2Form
            defaultValues={step2Data}
            onBack={() => setStep(0)}
            onNext={(v) => { setStep2Data(v); setStep(2); }}
          />
        )}
        {step === 2 && (
          <>
            <div className="mb-5 flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              <h2 className="text-base font-semibold">Fairness Rubric</h2>
            </div>
            <Step3Form
              config={fairness}
              onChange={setFairness}
              onBack={() => setStep(1)}
              onSubmit={handleFinalSubmit}
              isSubmitting={isSubmitting}
            />
          </>
        )}
      </div>
    </div>
  );
}
