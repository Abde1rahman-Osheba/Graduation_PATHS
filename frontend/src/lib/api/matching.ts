import { apiFetch } from "@/lib/api";
import type { MatchRunResponse } from "@/types/domain";

export type DatabaseSearchPayload = {
  organization_id: string;
  top_k: number;
  job: {
    title: string;
    summary: string | null;
    required_skills: string[];
    preferred_skills: string[];
    employment_type: string;
  };
};

export function createDatabaseMatchRun(payload: DatabaseSearchPayload) {
  return apiFetch<MatchRunResponse>("/api/v1/organization-matching/database-search", {
    method: "POST",
    json: payload,
  });
}

export function getMatchingRun(runId: string) {
  return apiFetch<Record<string, unknown>>(`/api/v1/organization-matching/runs/${runId}`);
}

export function getMatchingShortlist(runId: string) {
  return apiFetch<{ shortlist: Record<string, unknown>[] }>(`/api/v1/organization-matching/runs/${runId}/shortlist`);
}
