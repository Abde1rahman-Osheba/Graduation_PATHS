import { apiFetch } from "@/lib/api";
import type { ScoreList } from "@/types/domain";

export type ScoreRunResponse = {
  status: string;
  scored_jobs: number;
  candidate_id: string;
};

export function runCandidateScoring(candidateId: string) {
  return apiFetch<ScoreRunResponse>(`/api/v1/scoring/candidates/${candidateId}/score`, {
    method: "POST",
    json: { max_jobs: 20, force_rescore: false },
  });
}

export function getCandidateScores(candidateId: string) {
  return apiFetch<ScoreList>(`/api/v1/scoring/candidates/${candidateId}/scores`);
}
