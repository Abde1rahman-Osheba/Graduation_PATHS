import { apiFetch, apiUrl } from "@/lib/api";
import { getSessionToken } from "@/lib/auth/session";
import type { IngestionJob } from "@/types/domain";

export type CandidateProfilePayload = {
  full_name?: string;
  phone?: string;
  years_experience?: number;
  career_level?: string;
  skills: string[];
  open_to_job_types: string[];
  open_to_workplace_settings: string[];
  desired_job_titles: string[];
  desired_job_categories: string[];
};

export async function uploadCandidateCv(candidateId: string, file: File): Promise<{ job_id: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const url = `${apiUrl("/api/v1/cv-ingestion/upload")}?${new URLSearchParams({ candidate_id: candidateId }).toString()}`;
  const token = getSessionToken();

  const res = await fetch(url, {
    method: "POST",
    body: fd,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Upload failed");
  }
  return (await res.json()) as { job_id: string };
}

export function getIngestionJob(jobId: string) {
  return apiFetch<IngestionJob>(`/api/v1/cv-ingestion/jobs/${jobId}`);
}

export function getMyCandidateProfile() {
  return apiFetch("/api/v1/candidates/me/profile");
}

export function updateMyCandidateProfile(payload: CandidateProfilePayload) {
  return apiFetch("/api/v1/candidates/me/profile", {
    method: "PUT",
    json: payload,
  });
}
