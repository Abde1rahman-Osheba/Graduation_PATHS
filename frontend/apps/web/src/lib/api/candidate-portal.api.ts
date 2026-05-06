/**
 * PATHS — Candidate Portal API wrappers (auth signup, profile helpers).
 * Prefer `candidatePortalApi` in `@/lib/api` for GET/PUT profile and applications.
 */

import { api } from "./client";
import type { CandidateProfile, OnboardingDraft } from "@/types/candidate-profile.types";
import type { BackendCandidateAppOut, BackendCandidateProfileOut } from "@/lib/api";
import { adaptBackendCandidateProfileOut } from "@/lib/candidate/portal-profile";

// ── Candidate auth ────────────────────────────────────────────────────────────

export interface CandidateSignupPayload {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  location?: string;
  headline?: string;
}

export interface CandidateRegisterResponse {
  user_id: string;
  candidate_profile_id: string;
  account_type: string;
  message: string;
}

export const candidatePortalLegacyApi = {
  /**
   * Candidate sign-up — creates user + candidate record.
   * Backend: POST /api/v1/auth/register/candidate
   */
  signup: (payload: CandidateSignupPayload) =>
    api.post<CandidateRegisterResponse>("/api/v1/auth/register/candidate", payload),

  /**
   * Full profile shape (merges backend portal fields into empty template).
   */
  getMyProfile: async (): Promise<CandidateProfile> => {
    const raw = await api.get<BackendCandidateProfileOut>("/api/v1/candidates/me/profile");
    return adaptBackendCandidateProfileOut(raw);
  },

  /**
   * Partial update using camelCase draft fields → backend PUT body.
   */
  updateProfileFromDraft: async (patch: Partial<OnboardingDraft>): Promise<CandidateProfile> => {
    const body = draftToUpdateBody(patch);
    const raw = await api.put<BackendCandidateProfileOut>("/api/v1/candidates/me/profile", body);
    return adaptBackendCandidateProfileOut(raw);
  },

  getApplications: () => api.get<BackendCandidateAppOut[]>("/api/v1/candidates/me/applications"),

  /**
   * Upload CV for ingestion (ties to candidate when `candidateId` is set).
   */
  uploadCV: async (file: File, candidateId?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (candidateId) form.append("candidate_id", candidateId);
    return api.postForm<{
      job_id: string;
      candidate_id: string | null;
      status: string;
    }>("/api/v1/cv-ingestion/upload", form);
  },
};

function draftToUpdateBody(patch: Partial<OnboardingDraft>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (patch.fullName !== undefined) body.full_name = patch.fullName.trim() || undefined;
  if (patch.phone !== undefined) body.phone = patch.phone?.trim() || undefined;
  if (patch.yearsExperience !== undefined) body.years_experience = patch.yearsExperience;
  if (patch.careerLevel !== undefined) body.career_level = patch.careerLevel;
  if (patch.skills !== undefined) {
    body.skills = patch.skills.map((s) => s.name).filter(Boolean);
  }
  if (patch.preferences !== undefined) {
    const p = patch.preferences;
    if (p.jobTypes !== undefined) body.open_to_job_types = p.jobTypes;
    if (p.workplaceTypes !== undefined) body.open_to_workplace_settings = p.workplaceTypes;
    if (p.desiredRoles !== undefined) body.desired_job_titles = p.desiredRoles;
  }
  return body;
}

/** Same module paths as before (`@/lib/api/candidate-portal.api`). */
export const candidatePortalApi = {
  signup: candidatePortalLegacyApi.signup,
  getMyProfile: candidatePortalLegacyApi.getMyProfile,
  updateProfile: candidatePortalLegacyApi.updateProfileFromDraft,
  submitOnboarding: candidatePortalLegacyApi.updateProfileFromDraft,
  uploadCV: candidatePortalLegacyApi.uploadCV,
  getApplications: candidatePortalLegacyApi.getApplications,
};
