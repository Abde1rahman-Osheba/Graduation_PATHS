import { apiFetch } from "@/lib/api";
import type { JobRow } from "@/types/domain";

export function getOrganizationJobs(organizationId: string) {
  return apiFetch<JobRow[]>(`/api/v1/organizations/${organizationId}/jobs`);
}
