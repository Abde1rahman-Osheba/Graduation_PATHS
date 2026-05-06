import { apiFetch } from "@/lib/api";

// ── Types ───────────────────────────────────────────────────────────────

export interface ScreeningResultItem {
  result_id: string;
  blind_label: string;
  rank_position: number | null;
  agent_score: number;
  vector_similarity_score: number;
  final_score: number;
  relevance_score: number | null;
  recommendation: string | null;
  match_classification: string | null;
  status: string;
}

export interface ScreeningResultDetail extends ScreeningResultItem {
  criteria_breakdown: Record<string, { score: number; max_score: number; reason: string }> | null;
  matched_skills: string[];
  missing_required_skills: string[];
  missing_preferred_skills: string[];
  strengths: string[];
  weaknesses: string[];
  explanation: string | null;
}

export interface ScreeningRunResponse {
  screening_run_id: string;
  organization_id: string;
  job_id: string;
  source: string;
  top_k: number;
  status: string;
  total_candidates_scanned: number;
  candidates_passed_filter: number;
  candidates_scored: number;
  candidates_failed: number;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  results?: ScreeningResultItem[];
}

// ── API functions ───────────────────────────────────────────────────────

export function screenJobFromDatabase(payload: {
  job_id: string;
  organization_id: string;
  top_k: number;
  force_rescore?: boolean;
}) {
  return apiFetch<ScreeningRunResponse>(
    `/api/v1/screening/jobs/${payload.job_id}/screen`,
    {
      method: "POST",
      json: {
        organization_id: payload.organization_id,
        top_k: payload.top_k,
        force_rescore: payload.force_rescore ?? false,
      },
    }
  );
}

export function screenJobFromCSV(payload: {
  job_id: string;
  organization_id: string;
  top_k: number;
  csvFile: File;
}) {
  const formData = new FormData();
  formData.append("organization_id", payload.organization_id);
  formData.append("top_k", String(payload.top_k));
  formData.append("csv_file", payload.csvFile);

  return apiFetch<ScreeningRunResponse>(
    `/api/v1/screening/jobs/${payload.job_id}/screen-csv`,
    {
      method: "POST",
      body: formData,
    }
  );
}

export function getScreeningRun(runId: string) {
  return apiFetch<ScreeningRunResponse>(`/api/v1/screening/runs/${runId}`);
}

export function getScreeningResults(runId: string) {
  return apiFetch<{ screening_run_id: string; job_id: string; results: ScreeningResultItem[] }>(
    `/api/v1/screening/runs/${runId}/results`
  );
}

export function getScreeningResultDetail(runId: string, resultId: string) {
  return apiFetch<ScreeningResultDetail>(
    `/api/v1/screening/runs/${runId}/results/${resultId}`
  );
}
