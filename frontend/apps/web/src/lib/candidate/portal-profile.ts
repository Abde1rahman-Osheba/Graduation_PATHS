/**
 * Maps backend candidate portal profile (limited fields) to the full frontend
 * CandidateProfile shape without mixing in demo/mock data.
 */

import type { BackendCandidateProfileOut } from "@/lib/api";
import type { CandidateProfile, CareerLevel } from "@/types/candidate-profile.types";

const ISO_PLACEHOLDER = "1970-01-01T00:00:00.000Z";

export function createEmptyCandidateProfile(): CandidateProfile {
  return {
    id: "",
    fullName: "",
    currentTitle: "",
    summary: "",
    careerLevel: "mid",
    yearsExperience: 0,
    email: "",
    phone: "",
    locationText: "",
    education: [],
    experiences: [],
    skills: [],
    documents: [],
    links: {},
    preferences: {
      desiredRoles: [],
      jobTypes: [],
      workplaceTypes: [],
      preferredLocations: [],
      openToRelocation: false,
      salaryCurrency: "USD",
    },
    status: "draft",
    onboardingCompleted: false,
    createdAt: ISO_PLACEHOLDER,
    updatedAt: ISO_PLACEHOLDER,
  };
}

export function adaptBackendCandidateProfileOut(
  raw: BackendCandidateProfileOut,
): CandidateProfile {
  const base = createEmptyCandidateProfile();
  const level = (raw.career_level ?? base.careerLevel) as CareerLevel;
  return {
    ...base,
    id: String(raw.id),
    fullName: raw.full_name ?? "",
    currentTitle: raw.headline ?? "",
    email: raw.email ?? "",
    phone: raw.phone ?? "",
    locationText: raw.location ?? "",
    careerLevel: level,
    yearsExperience: raw.years_experience ?? 0,
    skills: (raw.skills ?? []).map((name, i) => ({
      id: `sk-${i}-${name}`,
      name,
      category: "technical" as const,
      proficiency: "intermediate" as const,
    })),
    preferences: {
      ...base.preferences,
      jobTypes: (raw.open_to_job_types ?? []) as CandidateProfile["preferences"]["jobTypes"],
      workplaceTypes: (raw.open_to_workplace_settings ??
        []) as CandidateProfile["preferences"]["workplaceTypes"],
      desiredRoles: raw.desired_job_titles ?? [],
    },
  };
}
