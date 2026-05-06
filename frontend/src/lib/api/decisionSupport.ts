import { apiFetch, withQuery } from "@/lib/api";
import type { DecisionSupportGenerateResponse, DecisionSupportLatestResponse } from "@/types/domain";

export function generateDecisionPacket(
  orgId: string,
  payload: { application_id: string; candidate_id: string; job_id: string },
) {
  return apiFetch<DecisionSupportGenerateResponse>(withQuery("/api/v1/decision-support/generate", { org_id: orgId }), {
    method: "POST",
    json: payload,
  });
}

export function getLatestDecisionPacket(applicationId: string, orgId: string) {
  return apiFetch<DecisionSupportLatestResponse>(
    withQuery(`/api/v1/decision-support/applications/${applicationId}/latest`, { org_id: orgId }),
  );
}
