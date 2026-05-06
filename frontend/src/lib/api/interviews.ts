import { apiFetch, withQuery } from "@/lib/api";
import type { InterviewAvailabilityResponse, InterviewSummaryResponse } from "@/types/domain";

export function getInterviewAvailability(payload: {
  organization_id: string;
  from_date?: string;
  to_date?: string;
  slot_minutes?: number;
}) {
  return apiFetch<InterviewAvailabilityResponse>("/api/v1/interviews/availability", {
    method: "POST",
    json: payload,
  });
}

export function getInterviewSummary(interviewId: string, orgId: string) {
  return apiFetch<InterviewSummaryResponse>(
    withQuery(`/api/v1/interviews/${interviewId}/summary`, { org_id: orgId }),
  );
}
