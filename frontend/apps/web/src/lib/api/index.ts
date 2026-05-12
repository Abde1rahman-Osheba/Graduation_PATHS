/**
 * PATHS Backend API — typed wrappers for every endpoint.
 * Each function corresponds 1-to-1 with a backend route.
 * Import from here in hooks; never call `api.*` directly in components.
 */

import { api } from "./client";

// ── Types matching backend response shapes ──────────────────────────────

export interface BackendJob {
  id: string;
  title: string;
  status: string;
  source_type: string | null;
  source_platform?: string | null;
  application_mode: string;
  external_apply_url: string | null;
  visibility: string;
  employment_type: string | null;
  seniority_level: string | null;
  workplace_type: string | null;
  location_text: string | null;
  location_mode: string | null;
  role_family: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  min_years_experience: number | null;
  max_years_experience: number | null;
  is_active: boolean;
  applicant_count: number;
  summary?: string | null;
  description_text?: string | null;
  description?: string | null;
  requirements?: string | null;
  company_name?: string | null;
  company?: string | null;
  source?: string | null;
  job_url?: string | null;
  source_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/** Query params for GET /api/v1/jobs */
export interface JobsListFilters {
  activeOnly?: boolean;
  keyword?: string;
  location?: string;
  source?: string;
  company?: string;
  status?: string;
  remote?: boolean;
  employmentType?: string;
  limit?: number;
  offset?: number;
}

export interface JobImportRunResponse {
  success: boolean;
  found: number;
  inserted: number;
  duplicates: number;
  failed: number;
  errors: string[];
}

export interface JobImportPipelineStatus {
  last_run_at: string | null;
  last_success: boolean | null;
  last_inserted_count: number | null;
  last_error: string | null;
}

export interface BackendApplication {
  id: string;
  candidate_id: string;
  job_id: string;
  application_type: string;
  source_channel: string | null;
  current_stage_code: string;
  overall_status: string;
  created_at: string;
  updated_at: string | null;
  candidate_name: string | null;
  candidate_email: string | null;
  candidate_current_title?: string | null;
  candidate_skills?: string[];
  job_title: string | null;
  match_final_score?: number | null;
  match_confidence?: number | null;
}

export interface BackendShortlistItem {
  application_id: string;
  candidate_id: string;
  candidate_name: string | null;
  current_stage_code: string;
  final_score: number | null;
  agent_score: number | null;
  vector_similarity_score: number | null;
  confidence: number | null;
  explanation: string | null;
  strengths: string[];
  weaknesses: string[];
  matched_skills: string[];
  missing_required_skills: string[];
  criteria_breakdown: Record<string, unknown> | null;
  rank: number;
}

export interface BackendApproval {
  id: string;
  organization_id: string;
  action_type: string;
  status: string;
  priority: string;
  entity_type: string;
  entity_id: string;
  entity_label: string;
  requested_by_name: string;
  requested_at: string;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  decision: string | null;
  reason: string | null;
  expires_at: string | null;
  meta_json: Record<string, string> | null;
  created_at: string;
}

export interface BackendMember {
  id: string;
  user_id: string;
  organization_id: string;
  role_code: string;
  is_active: boolean;
  joined_at: string;
  full_name: string | null;
  email: string | null;
}

export interface BackendAuditEvent {
  id: number;
  actor_type: string;
  actor_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  before_jsonb: Record<string, unknown> | null;
  after_jsonb: Record<string, unknown> | null;
  created_at: string;
}

export interface BackendDashboardStats {
  active_jobs: number;
  total_candidates: number;
  pending_approvals: number;
  applications_this_week: number;
  shortlisted_today: number;
  interviews_scheduled: number;
  hired_this_month: number;
  avg_time_to_hire_days: number;
}

export interface BackendAgentStatus {
  id: string;
  name: string;
  status: string;
  progress: number;
  current_task: string | null;
  jobs_processed: number;
  last_run: string | null;
}

export interface BackendFunnelItem {
  stage: string;
  count: number;
  conversionRate: number;
}

// ── Jobs ──────────────────────────────────────────────────────────────────

function jobsListQuery(filters: JobsListFilters = {}): string {
  const sp = new URLSearchParams();
  if (filters.activeOnly) sp.set("active_only", "true");
  if (filters.keyword?.trim()) sp.set("keyword", filters.keyword.trim());
  if (filters.location?.trim()) sp.set("location", filters.location.trim());
  if (filters.source?.trim()) sp.set("source", filters.source.trim());
  if (filters.company?.trim()) sp.set("company", filters.company.trim());
  if (filters.status?.trim()) sp.set("status", filters.status.trim());
  if (filters.remote === true) sp.set("remote", "true");
  if (filters.remote === false) sp.set("remote", "false");
  if (filters.employmentType?.trim()) {
    sp.set("employment_type", filters.employmentType.trim());
  }
  if (filters.limit != null) sp.set("limit", String(filters.limit));
  if (filters.offset != null) sp.set("offset", String(filters.offset));
  const q = sp.toString();
  return q ? `?${q}` : "";
}

export const jobsApi = {
  list: (filters: JobsListFilters = {}) =>
    api.get<BackendJob[]>(`/api/v1/jobs${jobsListQuery(filters)}`),
  get: (jobId: string) =>
    api.get<BackendJob>(`/api/v1/jobs/${jobId}`),
  create: (body: Partial<BackendJob>) =>
    api.post<BackendJob>("/api/v1/jobs", body),
  update: (jobId: string, body: Partial<BackendJob>) =>
    api.patch<BackendJob>(`/api/v1/jobs/${jobId}`, body),
  runImport: (body: {
    keyword?: string;
    location?: string;
    limit?: number;
    source?: string;
  }) => api.post<JobImportRunResponse>("/api/v1/jobs/import/run", body),
  importStatus: () =>
    api.get<JobImportPipelineStatus>("/api/v1/jobs/import/status"),
};

// ── Applications ──────────────────────────────────────────────────────────

export const applicationsApi = {
  list: (stage?: string) =>
    api.get<BackendApplication[]>(
      `/api/v1/applications${stage ? `?stage=${stage}` : ""}`,
    ),
  get: (id: string) =>
    api.get<BackendApplication>(`/api/v1/applications/${id}`),
  listByJob: (jobId: string, stage?: string) =>
    api.get<BackendApplication[]>(
      `/api/v1/jobs/${jobId}/applications${stage ? `?stage=${stage}` : ""}`,
    ),
  advanceStage: (id: string, stage: string, reason?: string) =>
    api.patch<BackendApplication>(`/api/v1/applications/${id}/stage`, {
      stage,
      reason,
    }),
  shortlist: (jobId: string) =>
    api.get<BackendShortlistItem[]>(`/api/v1/jobs/${jobId}/shortlist`),
};

// ── Approvals ─────────────────────────────────────────────────────────────

export const approvalsApi = {
  list: (status?: string) =>
    api.get<BackendApproval[]>(
      `/api/v1/approvals${status ? `?status=${status}` : ""}`,
    ),
  pending: () => api.get<BackendApproval[]>("/api/v1/approvals?status=pending"),
  decide: (id: string, decision: "approved" | "rejected", reason?: string) =>
    api.post<BackendApproval>(`/api/v1/approvals/${id}/decide`, {
      decision,
      reason,
    }),
  create: (body: {
    action_type: string;
    entity_type: string;
    entity_id: string;
    entity_label: string;
    priority?: string;
    meta_json?: Record<string, string>;
  }) => api.post<BackendApproval>("/api/v1/approvals", body),
};

// ── Members ───────────────────────────────────────────────────────────────

export const membersApi = {
  list: () => api.get<BackendMember[]>("/api/v1/organizations/me/members"),
  invite: (orgId: string, body: { full_name: string; email: string; password: string; role_code: string }) =>
    api.post<{ member_id: string; user_id: string; role_code: string }>(
      `/api/v1/organizations/${orgId}/members`,
      body,
    ),
};

// ── Audit ─────────────────────────────────────────────────────────────────

export const auditApi = {
  list: (search?: string) =>
    api.get<BackendAuditEvent[]>(
      `/api/v1/audit${search ? `?search=${encodeURIComponent(search)}` : ""}`,
    ),
};

// ── Dashboard ─────────────────────────────────────────────────────────────

export const dashboardApi = {
  stats: () => api.get<BackendDashboardStats>("/api/v1/dashboard/stats"),
  funnel: () => api.get<BackendFunnelItem[]>("/api/v1/dashboard/funnel"),
  agents: () => api.get<BackendAgentStatus[]>("/api/v1/dashboard/agents"),
};

// ── Candidates (recruiter view) ────────────────────────────────────────────

export const recruitCandidatesApi = {
  get: (id: string) => api.get<Record<string, unknown>>(`/api/v1/candidates/${id}`),
};

// ── Evidence ──────────────────────────────────────────────────────────────

export interface BackendEvidenceItem {
  id: string;
  candidate_id: string;
  ingestion_job_id: string | null;
  type: string;
  field_ref: string | null;
  source_uri: string | null;
  extracted_text: string | null;
  confidence: number | null;
  meta_json: Record<string, unknown> | null;
  created_at: string;
}

export interface BackendCandidateSource {
  id: string;
  candidate_id: string;
  source: string;
  url: string | null;
  raw_blob_uri: string | null;
  fetched_at: string | null;
  created_at: string;
}

export const evidenceApi = {
  listItems: (candidateId: string, type?: string) =>
    api.get<BackendEvidenceItem[]>(
      `/api/v1/candidates/${candidateId}/evidence${type ? `?type=${encodeURIComponent(type)}` : ""}`,
    ),
  listSources: (candidateId: string) =>
    api.get<BackendCandidateSource[]>(`/api/v1/candidates/${candidateId}/sources`),
  addSource: (candidateId: string, body: { source: string; url?: string; raw_blob_uri?: string }) =>
    api.post<BackendCandidateSource>(`/api/v1/candidates/${candidateId}/sources`, body),
};

// ── Candidate Portal ──────────────────────────────────────────────────────

export interface BackendCandidateProfileOut {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  headline: string | null;
  years_experience: number | null;
  career_level: string | null;
  skills: string[];
  open_to_job_types: string[];
  open_to_workplace_settings: string[];
  desired_job_titles: string[];
  desired_job_categories: string[];
}

export interface BackendCandidateAppOut {
  id: string;
  job_id: string;
  job_title: string | null;
  company_name: string | null;
  location_text: string | null;
  workplace_type: string | null;
  current_stage_code: string;
  overall_status: string;
  created_at: string;
}

export const candidatePortalApi = {
  getProfile: () =>
    api.get<BackendCandidateProfileOut>("/api/v1/candidates/me/profile"),
  updateProfile: (body: {
    full_name?: string;
    phone?: string;
    years_experience?: number;
    career_level?: string;
    skills?: string[];
    open_to_job_types?: string[];
    open_to_workplace_settings?: string[];
    desired_job_titles?: string[];
    desired_job_categories?: string[];
  }) => api.put<BackendCandidateProfileOut>("/api/v1/candidates/me/profile", body),
  getApplications: () =>
    api.get<BackendCandidateAppOut[]>("/api/v1/candidates/me/applications"),
  applyToJob: (jobId: string) =>
    api.post<{ id: string; job_id: string; stage: string; message: string }>(
      `/api/v1/candidates/me/jobs/${jobId}/apply`,
    ),
  getApplicationStatus: (jobId: string) =>
    api.get<{ applied: boolean; application_id: string | null; stage: string | null }>(
      `/api/v1/candidates/me/jobs/${jobId}/application-status`,
    ),
};

// ── Public Jobs (no auth) ─────────────────────────────────────────────────

export const publicJobsApi = {
  list: (limit = 50) =>
    api.get<BackendJob[]>(`/api/v1/jobs/public?limit=${limit}`),
  get: (jobId: string) =>
    api.get<BackendJob>(`/api/v1/jobs/public/${jobId}`),
};

// ── CV Ingestion ──────────────────────────────────────────────────────────

export interface BackendIngestionJob {
  job_id: string;
  candidate_id: string | null;
  stage: string;
  status: string;
  error_message: string | null;
}

export const cvIngestionApi = {
  upload: (file: File, candidateId?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (candidateId) formData.append("candidate_id", candidateId);
    return api.postForm<BackendIngestionJob>("/api/v1/cv-ingestion/upload", formData);
  },
  getJobStatus: (jobId: string) =>
    api.get<BackendIngestionJob>(`/api/v1/cv-ingestion/jobs/${jobId}`),
};

// ── Organization Profile ──────────────────────────────────────────────────

export interface BackendOrgProfile {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  contactEmail: string | null;
  isActive: boolean;
}

export const organizationApi = {
  getMe: () => api.get<BackendOrgProfile>("/api/v1/organizations/me"),
};

// ── Bias & Fairness ───────────────────────────────────────────────────────

export interface BackendDeAnonEvent {
  id: string;
  candidate_id: string;
  purpose: string;
  requested_at: string;
  granted_at: string | null;
  denied_at: string | null;
  approval_id: string | null;
}

export interface BackendShortlistProposeOut {
  approval_id: string;
  status: string;
  message: string;
}

export interface BackendBiasFlagOut {
  id: string;
  scope: string;
  scope_id: string;
  rule: string;
  severity: string;
  status: string;
  detail: Record<string, unknown> | null;
  created_at: string | null;
}

export interface BackendBiasAuditOut {
  id: number;
  event_type: string;
  candidate_id: string | null;
  job_id: string | null;
  actor_id: string | null;
  detail_json: Record<string, unknown> | null;
  created_at: string;
}

export interface BackendAnonymizedViewOut {
  id: string;
  candidate_id: string;
  view_version: number;
  view_json: Record<string, unknown>;
  stripped_fields: string[] | null;
  created_at: string | null;
}

export const biasFairnessApi = {
  requestDeanon: (candidateId: string, purpose = "outreach") =>
    api.post<BackendDeAnonEvent>(`/api/v1/candidates/${candidateId}/deanonymize`, { purpose }),
  getDeanonStatus: (candidateId: string) =>
    api.get<BackendDeAnonEvent | null>(`/api/v1/candidates/${candidateId}/deanon-status`),
  proposeShortlist: (jobId: string) =>
    api.post<BackendShortlistProposeOut>(`/api/v1/jobs/${jobId}/shortlist/propose`, {}),
  getAnonymizedView: (candidateId: string) =>
    api.get<BackendAnonymizedViewOut>(`/api/v1/candidates/${candidateId}/anonymized`),
  listBiasFlags: (params?: { status?: string; scope?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.scope) q.set("scope", params.scope);
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return api.get<BackendBiasFlagOut[]>(`/api/v1/bias/flags${qs ? `?${qs}` : ""}`);
  },
  readBiasAudit: (params?: { event_type?: string; candidate_id?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.event_type) q.set("event_type", params.event_type);
    if (params?.candidate_id) q.set("candidate_id", params.candidate_id);
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return api.get<BackendBiasAuditOut[]>(`/api/v1/bias/audit${qs ? `?${qs}` : ""}`);
  },
};

// ── Knowledge Base / Vector Store ──────────────────────────────────────────

export interface BackendQdrantCollection {
  name: string;
  status: string;
  vectors_count: number | null;
  dimension: number | null;
}

export interface BackendDocumentChunk {
  id: string;
  content: string;
  score: number;
  source: string;
  metadata: Record<string, unknown>;
}

export const kbApi = {
  listCollections: () =>
    api.get<{ collections: string[] }>("/api/v1/system/qdrant/collections"),
  getCollection: (name: string) =>
    api.get<BackendQdrantCollection>(
      `/api/v1/system/qdrant/collections/${encodeURIComponent(name)}`,
    ),
  initCollections: () =>
    api.post<{ status: string; collection: string; action: string }>(
      "/api/v1/system/qdrant/init-collections",
    ),
};

// ── Identity Resolution ────────────────────────────────────────────────────

export interface BackendDuplicateOut {
  id: string;
  candidate_id_a: string;
  candidate_id_b: string;
  organization_id: string;
  match_reason: string;
  match_value: string;
  confidence: number;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  merged_into_candidate_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface BackendDuplicateListOut {
  organization_id: string;
  total: number;
  items: BackendDuplicateOut[];
}

export interface BackendMergeHistoryOut {
  id: string;
  organization_id: string;
  kept_candidate_id: string;
  removed_candidate_id: string;
  merged_by: string;
  merged_at: string | null;
  merge_reason: string | null;
  audit_log: Record<string, unknown> | null;
  created_at: string | null;
}

export interface BackendMergeHistoryListOut {
  organization_id: string;
  total: number;
  items: BackendMergeHistoryOut[];
}

export interface BackendScanResult {
  organization_id: string;
  scanned: boolean;
  new_duplicates_found: number;
}

export const identityResolutionApi = {
  scan: () =>
    api.post<BackendScanResult>("/api/v1/identity-resolution/scan"),
  listDuplicates: (status?: string) =>
    api.get<BackendDuplicateListOut>(
      `/api/v1/identity-resolution/duplicates${status ? `?status=${status}` : ""}`,
    ),
  approveMerge: (id: string, notes?: string) =>
    api.post<BackendDuplicateOut>(`/api/v1/identity-resolution/duplicates/${id}/approve`, notes ? { notes } : {}),
  rejectMerge: (id: string, notes?: string) =>
    api.post<BackendDuplicateOut>(`/api/v1/identity-resolution/duplicates/${id}/reject`, notes ? { notes } : {}),
  getMergeHistory: () =>
    api.get<BackendMergeHistoryListOut>("/api/v1/identity-resolution/merge-history"),
};

// ── Assessment Agent ─────────────────────────────────────────────────────

export interface BackendAssessmentOut {
  id: string;
  organization_id: string;
  application_id: string;
  candidate_id: string;
  job_id: string;
  title: string;
  assessment_type: string;
  status: string;
  score: number | null;
  max_score: number | null;
  score_percent: number | null;
  instructions: string | null;
  submission_text: string | null;
  submission_uri: string | null;
  reviewer_notes: string | null;
  criteria_breakdown: Record<string, unknown> | null;
  assigned_at: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string | null;
}

export interface BackendAssessmentCreateBody {
  application_id: string;
  candidate_id: string;
  job_id: string;
  title?: string;
  assessment_type?: string;
  instructions?: string | null;
  max_score?: number | null;
}

export interface BackendAssessmentUpdateBody {
  title?: string;
  status?: string;
  score?: number | null;
  max_score?: number | null;
  reviewer_notes?: string | null;
  criteria_breakdown?: Record<string, unknown> | null;
  submission_text?: string | null;
  submission_uri?: string | null;
}

export const assessmentsApi = {
  list: (params?: { application_id?: string; candidate_id?: string; status?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.application_id) q.set("application_id", params.application_id);
    if (params?.candidate_id) q.set("candidate_id", params.candidate_id);
    if (params?.status) q.set("status", params.status);
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return api.get<BackendAssessmentOut[]>(`/api/v1/assessments${qs ? `?${qs}` : ""}`);
  },
  get: (id: string) =>
    api.get<BackendAssessmentOut>(`/api/v1/assessments/${id}`),
  create: (body: BackendAssessmentCreateBody) =>
    api.post<BackendAssessmentOut>("/api/v1/assessments", body),
  update: (id: string, body: BackendAssessmentUpdateBody) =>
    api.patch<BackendAssessmentOut>(`/api/v1/assessments/${id}`, body),
  delete: (id: string) =>
    api.delete<void>(`/api/v1/assessments/${id}`),
};

// ── Decision Support System ───────────────────────────────────────────────

export interface BackendDSSGenerateOut {
  packet_id: string;
  recommendation: string | null;
  final_journey_score: number | null;
}

export interface BackendDSSPacket {
  id?: string;
  packet_id?: string;
  application_id?: string;
  final_journey_score: number | null;
  recommendation: string | null;
  confidence?: number | null;
  compliance_status?: string | null;
  packet_json: Record<string, unknown> | null;
  evidence_json?: Record<string, unknown> | null;
  human_review_required?: boolean;
}

export interface BackendDSSEmail {
  email_id: string;
  email_type?: string;
  subject: string;
  body: string;
  status: string;
}

export interface BackendDSSDevPlan {
  plan_json: Record<string, unknown> | null;
  summary: string | null;
}

export interface BackendHrDecisionOut {
  id: string;
  final_hr_decision: string;
}

export const dssApi = {
  generate: (
    orgId: string,
    body: { application_id: string; candidate_id: string; job_id: string },
  ) =>
    api.post<BackendDSSGenerateOut>(
      `/api/v1/decision-support/generate?org_id=${orgId}`,
      body,
    ),
  getLatestForApplication: (applicationId: string, orgId: string) =>
    api.get<BackendDSSPacket>(
      `/api/v1/decision-support/applications/${applicationId}/latest?org_id=${orgId}`,
    ),
  getPacket: (packetId: string, orgId: string) =>
    api.get<BackendDSSPacket>(
      `/api/v1/decision-support/${packetId}?org_id=${orgId}`,
    ),
  hrDecision: (
    packetId: string,
    orgId: string,
    body: { final_decision: string; hr_notes?: string; override_reason?: string },
  ) =>
    api.post<BackendHrDecisionOut>(
      `/api/v1/decision-support/${packetId}/hr-decision?org_id=${orgId}`,
      body,
    ),
  generateDevPlan: (packetId: string, orgId: string) =>
    api.post<{ id: string; plan_type: string; plan_json: Record<string, unknown> }>(
      `/api/v1/decision-support/${packetId}/development-plan?org_id=${orgId}`,
      {},
    ),
  getDevPlan: (packetId: string, orgId: string) =>
    api.get<BackendDSSDevPlan>(
      `/api/v1/decision-support/${packetId}/development-plan?org_id=${orgId}`,
    ),
  generateEmail: (
    packetId: string,
    orgId: string,
    emailType: "acceptance" | "rejection",
  ) =>
    api.post<BackendDSSEmail>(
      `/api/v1/decision-support/${packetId}/generate-email?org_id=${orgId}&email_type=${emailType}`,
      {},
    ),
  getEmail: (packetId: string, orgId: string) =>
    api.get<BackendDSSEmail>(
      `/api/v1/decision-support/${packetId}/email?org_id=${orgId}`,
    ),
  patchEmail: (
    packetId: string,
    orgId: string,
    body: { subject?: string; body?: string },
  ) =>
    api.patch<{ ok: boolean }>(
      `/api/v1/decision-support/${packetId}/email?org_id=${orgId}`,
      body,
    ),
  approveEmail: (packetId: string, orgId: string) =>
    api.post<{ ok: boolean }>(
      `/api/v1/decision-support/${packetId}/email/approve?org_id=${orgId}`,
      {},
    ),
  sendEmail: (packetId: string, orgId: string) =>
    api.post<{ ok: boolean }>(
      `/api/v1/decision-support/${packetId}/email/send?org_id=${orgId}`,
      {},
    ),
  managerDecision: (
    packetId: string,
    orgId: string,
    body: {
      decision:
        | "accepted"
        | "rejected"
        | "request_more_interview"
        | "request_more_evidence";
      manager_notes?: string;
    },
  ) =>
    api.post<{
      ok: boolean;
      decision: string;
      decision_id: string;
      packet_id: string;
      development_plan_id: string | null;
      development_plan_error?: string;
    }>(
      `/api/v1/decision-support/${packetId}/manager-decision?org_id=${orgId}`,
      body,
    ),
  decisionReport: (packetId: string, orgId: string) =>
    api.get<BackendDecisionReport>(
      `/api/v1/decision-support/${packetId}/decision-report?org_id=${orgId}`,
    ),
  reportPdfUrl: (packetId: string, orgId: string) =>
    `/api/v1/decision-support/${packetId}/report/pdf?org_id=${orgId}`,
};

export interface BackendIdssV2 {
  version: "v2";
  final_score: number;
  recommendation: string;
  confidence: string;
  score_breakdown: Record<string, {
    score: number | null;
    weight: number;
    weighted_score: number;
    evidence: string[];
    missing: boolean;
    reasoning?: string;
  }>;
  weights: Record<string, number>;
  missing_evidence: string[];
  overrides_applied: string[];
  bias_guardrail_notes: string[];
  bias_risk: boolean;
  must_have_skills_missing: boolean;
  technical_role: boolean;
  agent_error: string | null;
  summary_for_hiring_manager: string;
  final_reasoning: string;
  strengths: string[];
  weaknesses: string[];
  risks: string[];
  recommended_next_action: string;
}

export interface BackendDecisionReport {
  packet_id: string;
  candidate: {
    id: string | null;
    full_name: string | null;
    current_title: string | null;
    skills: string[];
  };
  job: {
    id: string | null;
    title: string | null;
    seniority_level: string | null;
  };
  organization: { id: string | null; name: string | null };
  final_score: number | null;
  recommendation: string | null;
  confidence: number | null;
  human_review_required: boolean;
  compliance_status: string | null;
  packet_json: Record<string, unknown>;
  idss_v2: BackendIdssV2 | null;
  development_plan: {
    id: string;
    plan_type: string;
    status: string;
    summary: string | null;
    plan_json: Record<string, unknown>;
  } | null;
  email: {
    id: string;
    subject: string;
    body: string;
    status: string;
  } | null;
}

export interface BackendDevelopmentPlan {
  id: string;
  decision_packet_id: string;
  candidate_id: string;
  job_id: string;
  plan_type: string;
  status: string;
  summary: string | null;
  plan_json: Record<string, unknown>;
  created_at?: string | null;
}

export const developmentPlansApi = {
  generate: (
    orgId: string,
    body: { candidate_id: string; job_id: string; decision_id: string },
  ) =>
    api.post<{
      plan_id: string;
      plan_type: string;
      status: string;
      summary: string | null;
    }>(`/api/v1/development-plans/generate?org_id=${orgId}`, body),
  get: (planId: string, orgId: string) =>
    api.get<BackendDevelopmentPlan>(
      `/api/v1/development-plans/${planId}?org_id=${orgId}`,
    ),
  forCandidate: (candidateId: string, orgId: string) =>
    api.get<{ candidate_id: string; items: BackendDevelopmentPlan[] }>(
      `/api/v1/candidates/${candidateId}/development-plans?org_id=${orgId}`,
    ),
  approve: (planId: string, orgId: string, body?: { notes?: string }) =>
    api.post<BackendDevelopmentPlan>(
      `/api/v1/development-plans/${planId}/approve?org_id=${orgId}`,
      body ?? {},
    ),
  revise: (planId: string, orgId: string, body?: { notes?: string }) =>
    api.post<BackendDevelopmentPlan>(
      `/api/v1/development-plans/${planId}/revise?org_id=${orgId}`,
      body ?? {},
    ),
  setCandidateFeedback: (
    planId: string,
    orgId: string,
    body: { candidate_facing_message: string },
  ) =>
    api.post<BackendDevelopmentPlan>(
      `/api/v1/development-plans/${planId}/candidate-feedback?org_id=${orgId}`,
      body,
    ),
  sendFeedback: (
    planId: string,
    orgId: string,
    body?: { recipient_email?: string },
  ) =>
    api.post<BackendDevelopmentPlan>(
      `/api/v1/development-plans/${planId}/send-feedback?org_id=${orgId}`,
      body ?? {},
    ),
};

// ── Outreach Agent (Google + scheduling) ──────────────────────────────────

export interface BackendGoogleStatus {
  connected: boolean;
  configured: boolean;
  email: string | null;
  expires_at: string | null;
  scopes: string[];
  last_error: string | null;
}

export interface BackendGeneratedEmail {
  subject: string;
  body: string;
  model: string | null;
  fallback: boolean;
}

export interface BackendOutreachAvailabilityIn {
  day_of_week: number;
  start_time: string;
  end_time: string;
  timezone?: string;
}

export interface BackendOutreachCreateBody {
  candidate_id: string;
  job_id?: string | null;
  subject: string;
  email_body: string;
  interview_type?: string;
  duration_minutes?: number;
  buffer_minutes?: number;
  timezone?: string;
  expires_at?: string | null;
  availability?: BackendOutreachAvailabilityIn[];
  recipient_email?: string;
}

export interface BackendOutreachCreateResponse {
  session_id: string;
  status: string;
  booking_link: string;
  expires_at: string | null;
}

export interface BackendOutreachSendResponse {
  ok: boolean;
  session_id: string;
  status: string;
  error: string | null;
  gmail_message_id: string | null;
}

export interface BackendOutreachHistoryItem {
  id: string;
  candidate_id: string;
  job_id: string | null;
  status: string;
  subject: string | null;
  interview_type: string | null;
  sent_at: string | null;
  booked_at: string | null;
  expires_at: string | null;
  last_error: string | null;
  booking: {
    selected_start_time: string;
    selected_end_time: string;
    google_meet_link: string | null;
  } | null;
}

export interface BackendPublicSchedule {
  organization_name: string | null;
  job_title: string | null;
  candidate_name: string | null;
  interview_type: string | null;
  duration_minutes: number;
  timezone: string;
  expires_at: string | null;
  booked: boolean;
  slots: { start: string; end: string; timezone: string }[];
  booking: {
    selected_start_time: string;
    selected_end_time: string;
    timezone: string;
    google_meet_link: string | null;
    status: string;
  } | null;
}

export interface BackendBookSlotResponse {
  ok: boolean;
  error: string | null;
  booking_id: string | null;
  selected_start_time: string | null;
  selected_end_time: string | null;
  google_meet_link: string | null;
  google_connected: boolean;
}

export const googleIntegrationApi = {
  status: () => api.get<BackendGoogleStatus>("/api/v1/google-integration/status"),
  connect: () =>
    api.get<{ authorize_url: string }>("/api/v1/google-integration/connect"),
  disconnect: () =>
    api.post<{ ok: true }>("/api/v1/google-integration/disconnect"),
};

export const outreachAgentApi = {
  generateEmail: (body: {
    candidate_id: string;
    job_id?: string | null;
    interview_type?: string;
    is_final_offer?: boolean;
    extra_instructions?: string;
  }) => api.post<BackendGeneratedEmail>("/api/v1/outreach/generate-email", body),
  saveDraft: (body: BackendOutreachCreateBody) =>
    api.post<BackendOutreachCreateResponse>("/api/v1/outreach/save-draft", body),
  send: (body: BackendOutreachCreateBody) =>
    api.post<BackendOutreachSendResponse>("/api/v1/outreach/send", body),
  history: (candidateId: string) =>
    api.get<{ candidate_id: string; items: BackendOutreachHistoryItem[] }>(
      `/api/v1/outreach/${candidateId}/history`,
    ),
};

export const publicSchedulingApi = {
  view: (token: string) =>
    api.get<BackendPublicSchedule>(`/api/v1/schedule/${encodeURIComponent(token)}`),
  book: (
    token: string,
    body: { selected_start_time: string; selected_end_time: string },
  ) =>
    api.post<BackendBookSlotResponse>(
      `/api/v1/schedule/${encodeURIComponent(token)}/book`,
      body,
    ),
};

// ── Interview Intelligence runtime (live Q&A) ─────────────────────────────

export interface BackendInterviewSessionDetail {
  session: {
    id: string;
    application_id: string;
    candidate_id: string;
    job_id: string;
    organization_id: string;
    interview_type: string;
    status: string;
    created_at: string | null;
  };
  candidate: {
    id: string | null;
    full_name: string | null;
    current_title: string | null;
    headline: string | null;
    skills: string[];
    summary: string | null;
    years_experience: number | null;
  };
  job: {
    id: string | null;
    title: string | null;
    summary: string | null;
    seniority_level: string | null;
    requirements: string | null;
  };
  questions: { text: string; category: string; pack_id?: string; order?: number; skills?: string[] }[];
  turns: BackendInterviewTurn[];
  completed: boolean;
}

export interface BackendInterviewTurn {
  index: number;
  question: string;
  answer: string;
  asked_at: string | null;
  answered_at: string | null;
  is_followup: boolean;
  parent_index: number | null;
}

export interface BackendInterviewReport {
  session_id: string;
  completed: boolean;
  candidate: BackendInterviewSessionDetail["candidate"];
  job: BackendInterviewSessionDetail["job"];
  summary: Record<string, unknown> | null;
  evaluations: Record<string, unknown>[];
  decision_packet: Record<string, unknown> | null;
  turns: BackendInterviewTurn[];
}

export interface BackendCreateInterviewSessionBody {
  application_id?: string | null;
  candidate_id?: string | null;
  job_id?: string | null;
  organization_id?: string | null;
  interview_type?: "hr" | "technical" | "mixed";
  difficulty?: "junior" | "mid" | "senior" | null;
  num_questions?: number | null;
  follow_ups_enabled?: boolean;
  interview_mode?: "text" | "voice";
}

export const interviewRuntimeApi = {
  createSession: (body: BackendCreateInterviewSessionBody) =>
    api.post<{
      session_id: string;
      status: string;
      candidate_id: string;
      job_id: string;
      application_id: string;
    }>("/api/v1/interviews/sessions", body),
  getSession: (sessionId: string) =>
    api.get<BackendInterviewSessionDetail>(
      `/api/v1/interviews/sessions/${sessionId}`,
    ),
  generateQuestions: (interviewId: string, orgId: string, body?: {
    include_hr?: boolean;
    include_technical?: boolean;
    regenerate?: boolean;
  }) =>
    api.post<{ question_pack_ids: string[] }>(
      `/api/v1/interviews/${interviewId}/generate-questions?org_id=${orgId}`,
      body ?? { include_hr: true, include_technical: true, regenerate: false },
    ),
  recordAnswer: (
    sessionId: string,
    body: {
      question: string;
      answer: string;
      is_followup?: boolean;
      parent_index?: number | null;
    },
  ) =>
    api.post<BackendInterviewTurn>(
      `/api/v1/interviews/sessions/${sessionId}/answer`,
      body,
    ),
  generateFollowUp: (sessionId: string, parentIndex: number) =>
    api.post<{ question: string; parent_index: number }>(
      `/api/v1/interviews/sessions/${sessionId}/follow-up`,
      { parent_index: parentIndex },
    ),
  finish: (sessionId: string) =>
    api.post<{
      ok: boolean;
      status: string;
      turn_count: number;
      already_completed: boolean;
    }>(`/api/v1/interviews/sessions/${sessionId}/finish`),
  evaluate: (sessionId: string) =>
    api.post<Record<string, unknown>>(
      `/api/v1/interviews/sessions/${sessionId}/evaluate`,
    ),
  getReport: (sessionId: string) =>
    api.get<BackendInterviewReport>(
      `/api/v1/interviews/sessions/${sessionId}/report`,
    ),
  reportPdfUrl: (sessionId: string) =>
    `/api/v1/interviews/sessions/${sessionId}/report/pdf`,
};

// ── Interview Intelligence ─────────────────────────────────────────────────

export interface BackendInterviewScheduleOut {
  interview_id: string;
  status: string;
  meeting_url: string | null;
  meeting_provider: string | null;
  calendar_event_id: string | null;
  message: string | null;
}

export interface BackendInterviewListItem {
  interview_id: string;
  application_id: string;
  candidate_name: string;
  job_title: string;
  interview_type: string;
  status: string;
  scheduled_start: string | null;
  meeting_url: string | null;
}

export interface BackendInterviewQuestionPack {
  id: string;
  question_pack_type: string;
  questions_json: Record<string, unknown> | null;
  approved_by_hr: boolean;
  approved_at: string | null;
}

export interface BackendInterviewAnalysis {
  interview_id: string;
  summary: {
    id: string;
    summary_json: Record<string, unknown>;
    created_at: string;
  } | null;
  hr_evaluation: {
    id: string;
    evaluation_type: string;
    score_json: Record<string, unknown> | null;
    recommendation: string | null;
    confidence: number | null;
    created_at: string;
  } | null;
  technical_evaluation: {
    id: string;
    evaluation_type: string;
    score_json: Record<string, unknown> | null;
    recommendation: string | null;
    confidence: number | null;
    created_at: string;
  } | null;
  decision_packet: {
    id: string;
    recommendation: string | null;
    final_score: number | null;
    confidence: number | null;
    decision_packet_json: Record<string, unknown> | null;
    human_review_required: boolean;
    created_at: string;
  } | null;
  compliance: Record<string, unknown>;
}

export interface BackendInterviewHumanDecisionOut {
  id: string;
  interview_id: string;
  final_decision: string;
  hr_notes: string | null;
  override_reason: string | null;
  decided_by: string;
  created_at: string;
}

export const interviewsApi = {
  list: (orgId: string, limit = 50) =>
    api.get<BackendInterviewListItem[]>(
      `/api/v1/interviews?org_id=${encodeURIComponent(orgId)}&limit=${limit}`,
    ),
  schedule: (body: {
    application_id: string;
    organization_id: string;
    interview_type: string;
    slot_start: string;
    slot_end: string;
    timezone?: string;
    participant_user_ids?: string[];
    meeting_provider?: string;
    manual_meeting_url?: string | null;
    create_calendar_event?: boolean;
  }) =>
    api.post<BackendInterviewScheduleOut>("/api/v1/interviews/schedule", body),
  getQuestions: (interviewId: string, orgId: string) =>
    api.get<{ interview_id: string; packs: BackendInterviewQuestionPack[] }>(
      `/api/v1/interviews/${interviewId}/questions?org_id=${orgId}`,
    ),
  generateQuestions: (
    interviewId: string,
    orgId: string,
    body: { include_hr?: boolean; include_technical?: boolean; regenerate?: boolean },
  ) =>
    api.post<{ question_pack_ids: string[] }>(
      `/api/v1/interviews/${interviewId}/generate-questions?org_id=${orgId}`,
      body,
    ),
  approveQuestions: (
    interviewId: string,
    orgId: string,
    body: { approved: boolean; edited_questions_json?: Record<string, unknown> | null },
  ) =>
    api.patch<{ ok: boolean }>(
      `/api/v1/interviews/${interviewId}/questions/approve?org_id=${orgId}`,
      body,
    ),
  uploadTranscript: (
    interviewId: string,
    orgId: string,
    body: {
      transcript_text: string;
      transcript_source?: string;
      language?: string;
      quality_hint?: string | null;
    },
  ) =>
    api.post<{ transcript_id: string }>(
      `/api/v1/interviews/${interviewId}/transcript?org_id=${orgId}`,
      body,
    ),
  analyze: (interviewId: string, orgId: string) =>
    api.post<BackendInterviewAnalysis>(
      `/api/v1/interviews/${interviewId}/analyze?org_id=${orgId}`,
      {},
    ),
  getSummary: (interviewId: string, orgId: string) =>
    api.get<{ id: string; summary_json: Record<string, unknown>; created_at: string }>(
      `/api/v1/interviews/${interviewId}/summary?org_id=${orgId}`,
    ),
  humanDecision: (
    interviewId: string,
    orgId: string,
    body: { final_decision: string; hr_notes?: string; override_reason?: string },
  ) =>
    api.post<BackendInterviewHumanDecisionOut>(
      `/api/v1/interviews/${interviewId}/human-decision?org_id=${orgId}`,
      body,
    ),
  cancel: (interviewId: string, orgId: string, reason?: string) =>
    api.patch<{ interview_id: string; status: string }>(
      `/api/v1/interviews/${interviewId}/cancel?org_id=${orgId}`,
      reason ? { reason } : {},
    ),
};

// ── Organization Matching / Outreach ──────────────────────────────────────

export interface BackendMatchingShortlistItem {
  candidate_id: string;
  candidate_name: string | null;
  rank: number;
  score: number | null;
  match_score: number | null;
  matched_skills: string[];
  missing_skills: string[];
  explanation: string | null;
  ranking_id?: string;
  status?: string;
}

export interface BackendMatchingRun {
  matching_run_id?: string;
  id?: string;
  job_id?: string;
  top_k?: number;
  status?: string;
  total_candidates?: number;
  relevant_candidates?: number;
  scored_candidates?: number;
  shortlisted_candidates?: number;
  shortlist?: BackendMatchingShortlistItem[];
}

export interface BackendOutreachDraft {
  message_id: string;
  status: string;
  subject: string;
  body: string;
}

// ── Open-to-Work Candidate Sourcing ───────────────────────────────────────

export interface BackendSourcedSource {
  source: string;
  url: string | null;
  fetched_at: string | null;
}

export interface BackendSourcedCandidate {
  candidate_id: string;
  full_name: string | null;
  headline: string | null;
  current_title: string | null;
  location_text: string | null;
  years_experience: number | null;
  skills: string[];
  open_to_job_types: string[];
  open_to_workplace_settings: string[];
  desired_job_titles: string[];
  summary: string | null;
  status: string | null;
  source: BackendSourcedSource | null;
  open_to_work: boolean;
}

export interface BackendSourcedCandidateMatch {
  candidate_id: string;
  score: number;
  vector_score: number;
  skill_overlap_score: number;
  matched_skills: string[];
  missing_required_skills: string[];
  workplace_match: boolean;
  location_match: boolean;
  candidate: BackendSourcedCandidate;
  source: BackendSourcedSource | null;
}

export interface BackendCandidateJobReasoning {
  candidate_id: string;
  job_id: string;
  decision: "strong_match" | "potential_match" | "weak_match";
  overall_score: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  red_flags: string[];
  recommended_next_step: string;
  model: string | null;
  fallback: boolean;
}

export interface BackendCandidateSourcingStatus {
  enabled: boolean;
  provider: string;
  interval_minutes: number;
  max_per_run: number;
  reasoning_enabled: boolean;
  reasoning_model: string;
  metadata: Record<string, unknown> | null;
}

export interface BackendSourcedCandidateListResponse {
  organization_id: string;
  total: number;
  items: BackendSourcedCandidate[];
  job_id: string | null;
  filters: Record<string, unknown>;
}

export interface BackendSourcedCandidateMatchListResponse {
  organization_id: string;
  job_id: string;
  total: number;
  top_k: number;
  items: BackendSourcedCandidateMatch[];
  filters: Record<string, unknown>;
}

export interface SourcedListFilters {
  title?: string;
  skills?: string[];
  location?: string;
  workplace?: string;
  employmentType?: string;
  minYearsExperience?: number;
  maxYearsExperience?: number;
  limit?: number;
  offset?: number;
}

export interface SourcedMatchFilters {
  topK?: number;
  location?: string;
  workplace?: string[];
  employmentType?: string[];
  minScore?: number;
}

function sourcedListQuery(f: SourcedListFilters = {}): string {
  const sp = new URLSearchParams();
  if (f.title?.trim()) sp.set("title", f.title.trim());
  if (f.location?.trim()) sp.set("location", f.location.trim());
  if (f.workplace?.trim()) sp.set("workplace", f.workplace.trim());
  if (f.employmentType?.trim()) sp.set("employment_type", f.employmentType.trim());
  if (f.minYearsExperience != null) sp.set("min_years_experience", String(f.minYearsExperience));
  if (f.maxYearsExperience != null) sp.set("max_years_experience", String(f.maxYearsExperience));
  if (f.limit != null) sp.set("limit", String(f.limit));
  if (f.offset != null) sp.set("offset", String(f.offset));
  for (const s of f.skills ?? []) {
    if (s.trim()) sp.append("skill", s.trim());
  }
  const q = sp.toString();
  return q ? `?${q}` : "";
}

function sourcedMatchQuery(f: SourcedMatchFilters = {}): string {
  const sp = new URLSearchParams();
  if (f.topK != null) sp.set("top_k", String(f.topK));
  if (f.location?.trim()) sp.set("location", f.location.trim());
  if (f.minScore != null) sp.set("min_score", String(f.minScore));
  for (const w of f.workplace ?? []) if (w.trim()) sp.append("workplace", w.trim());
  for (const e of f.employmentType ?? []) if (e.trim()) sp.append("employment_type", e.trim());
  const q = sp.toString();
  return q ? `?${q}` : "";
}

export interface BackendCandidateSourcingRunResult {
  source_platform: string;
  requested_limit: number;
  started_at: string;
  finished_at: string | null;
  fetched_count: number;
  valid_count: number;
  inserted_count: number;
  updated_count: number;
  skipped_count: number;
  failed_count: number;
  graph_synced_count: number;
  vector_synced_count: number;
  candidate_ids: string[];
  errors: string[];
  status: string;
}

export const sourcingApi = {
  status: () =>
    api.get<BackendCandidateSourcingStatus>(
      "/api/v1/organization-candidate-sourcing/status",
    ),
  runImport: (body: {
    limit?: number;
    provider?: string;
    keywords?: string[];
    location?: string;
  }) =>
    api.post<BackendCandidateSourcingRunResult>(
      "/api/v1/admin/candidate-sourcing/run-once",
      body,
    ),
  list: (filters: SourcedListFilters = {}) =>
    api.get<BackendSourcedCandidateListResponse>(
      `/api/v1/organization-candidate-sourcing/candidates${sourcedListQuery(filters)}`,
    ),
  matchForJob: (jobId: string, filters: SourcedMatchFilters = {}) =>
    api.get<BackendSourcedCandidateMatchListResponse>(
      `/api/v1/organization-candidate-sourcing/jobs/${jobId}/match${sourcedMatchQuery(filters)}`,
    ),
  explain: (jobId: string, candidateId: string) =>
    api.post<BackendCandidateJobReasoning>(
      `/api/v1/organization-candidate-sourcing/jobs/${jobId}/match/${candidateId}/explain`,
    ),
  shortlist: (
    jobId: string,
    body: { candidate_id: string; job_id: string; stage_code?: string; note?: string },
  ) =>
    api.post<{
      candidate_id: string;
      job_id: string;
      application_id: string | null;
      stage_code: string;
      overall_status: string;
      note: string | null;
      created: boolean;
    }>(`/api/v1/organization-candidate-sourcing/jobs/${jobId}/shortlist`, body),
};

// ── Organization Matching / Outreach ──────────────────────────────────────

export const orgMatchingApi = {
  databaseSearch: (body: {
    organization_id: string;
    top_k?: number;
    job: {
      title: string;
      description?: string;
      required_skills?: string[];
      nice_to_have_skills?: string[];
      seniority_level?: string;
      workplace_type?: string;
    };
  }) =>
    api.post<BackendMatchingRun>(
      "/api/v1/organization-matching/database-search",
      body,
    ),
  getRun: (runId: string) =>
    api.get<BackendMatchingRun>(
      `/api/v1/organization-matching/runs/${runId}`,
    ),
  getShortlist: (runId: string) =>
    api.get<{ shortlist: BackendMatchingShortlistItem[] }>(
      `/api/v1/organization-matching/runs/${runId}/shortlist`,
    ),
  approveOutreach: (
    runId: string,
    rankingId: string,
    body?: { booking_link?: string | null; deadline_days?: number | null },
  ) =>
    api.post<{ ok: boolean; booking_link?: string; deadline_days?: number }>(
      `/api/v1/organization-matching/runs/${runId}/shortlist/${rankingId}/approve-outreach`,
      body ?? {},
    ),
  generateDraft: (
    runId: string,
    rankingId: string,
    body?: { booking_link?: string | null; deadline_days?: number | null },
  ) =>
    api.post<BackendOutreachDraft>(
      `/api/v1/organization-matching/runs/${runId}/outreach/${rankingId}/generate-draft`,
      body ?? {},
    ),
  sendOutreach: (messageId: string, body: { recipient_email: string }) =>
    api.post<{ ok: boolean }>(
      `/api/v1/organization-matching/outreach/${messageId}/send`,
      body,
    ),
};

// ── Contact Enrichment ───────────────────────────────────────────────────

export interface BackendEnrichedContactOut {
  id: string;
  candidate_id: string;
  organization_id: string;
  contact_type: string;
  original_value: string;
  enriched_value: string | null;
  confidence: number;
  status: string;
  source: string;
  provenance: string | null;
  validated_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface BackendEnrichmentStatusOut {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
}

export const contactEnrichmentApi = {
  status: () =>
    api.get<BackendEnrichmentStatusOut>("/api/v1/contact-enrichment/status"),
  list: (params?: { status?: string; contact_type?: string }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.set("status", params.status);
    if (params?.contact_type) sp.set("contact_type", params.contact_type);
    const q = sp.toString();
    return api.get<BackendEnrichedContactOut[]>(
      `/api/v1/contact-enrichment/contacts${q ? `?${q}` : ""}`,
    );
  },
  approve: (id: string, body?: { reviewer_name?: string }) =>
    api.post<BackendEnrichedContactOut>(
      `/api/v1/contact-enrichment/contacts/${id}/approve`,
      body ?? {},
    ),
  reject: (id: string, body?: { reviewer_name?: string }) =>
    api.post<BackendEnrichedContactOut>(
      `/api/v1/contact-enrichment/contacts/${id}/reject`,
      body ?? {},
    ),
};


// ── Candidate Sourcing & Pool ─────────────────────────────────────────────
//
// Backend: app/api/v1/candidate_sourcing.py — every endpoint is gated behind
// require_active_org_status, so org isolation is enforced server-side. The
// UI never sends organization_id — it is read from the JWT.

export type SourceTypeKey =
  | "paths_profile"
  | "sourced"
  | "company_uploaded"
  | "job_fair"
  | "ats_import"
  | "manual_add";

export interface SourceCatalogEntry {
  source_type: SourceTypeKey;
  label: string;
  description: string;
}
export interface SourceCatalogResponse {
  sources: SourceCatalogEntry[];
}

export interface OrgSourceSettings {
  organization_id: string;
  use_paths_profiles_default: boolean;
  use_sourced_candidates_default: boolean;
  use_uploaded_candidates_default: boolean;
  use_job_fair_candidates_default: boolean;
  use_ats_candidates_default: boolean;
  default_top_k: number;
  default_min_profile_completeness: number;
  default_min_evidence_confidence: number;
  updated_at: string | null;
  updated_by_user_id: string | null;
}

export interface OrgSourceSettingsUpdate {
  use_paths_profiles_default?: boolean;
  use_sourced_candidates_default?: boolean;
  use_uploaded_candidates_default?: boolean;
  use_job_fair_candidates_default?: boolean;
  use_ats_candidates_default?: boolean;
  default_top_k?: number;
  default_min_profile_completeness?: number;
  default_min_evidence_confidence?: number;
}

export interface SourceCountEntry {
  source_type: SourceTypeKey;
  label: string;
  count: number;
}
export interface SourceCountsResponse {
  organization_id: string;
  counts: SourceCountEntry[];
  total: number;
}

export interface JobPoolConfig {
  job_id: string;
  organization_id: string;
  use_paths_profiles: boolean;
  use_sourced_candidates: boolean;
  use_uploaded_candidates: boolean;
  use_job_fair_candidates: boolean;
  use_ats_candidates: boolean;
  top_k: number;
  min_profile_completeness: number;
  min_evidence_confidence: number;
  filters_json: Record<string, unknown> | null;
  updated_at: string | null;
}

export interface JobPoolConfigUpdate {
  use_paths_profiles?: boolean;
  use_sourced_candidates?: boolean;
  use_uploaded_candidates?: boolean;
  use_job_fair_candidates?: boolean;
  use_ats_candidates?: boolean;
  top_k?: number;
  min_profile_completeness?: number;
  min_evidence_confidence?: number;
  filters_json?: Record<string, unknown> | null;
}

export interface PoolPreview {
  job_id: string;
  organization_id: string;
  config_snapshot: Record<string, unknown>;
  source_breakdown: Partial<Record<SourceTypeKey, number>>;
  total_candidates_found: number;
  duplicates_removed: number;
  excluded_incomplete_profile: number;
  excluded_low_evidence: number;
  eligible_candidates: number;
}

export interface PoolBuildResult {
  pool_run_id: string;
  job_id: string;
  organization_id: string;
  eligible_candidates: number;
  excluded_candidates: number;
  duplicates_removed: number;
  source_breakdown: Partial<Record<SourceTypeKey, number>>;
  status: string;
}

export interface PoolRunSummary {
  pool_run_id: string;
  job_id: string;
  eligible_candidates: number;
  excluded_candidates: number;
  duplicates_removed: number;
  source_breakdown: Partial<Record<SourceTypeKey, number>> | null;
  status: string;
  created_at: string | null;
  completed_at: string | null;
}
export interface PoolRunListResponse {
  runs: PoolRunSummary[];
}

/** GET /api/v1/health — liveness (no auth). */
export interface BackendHealthResponse {
  status: string;
  app_name: string;
  environment: string;
}

export function getApiHealth(): Promise<BackendHealthResponse> {
  return api.get<BackendHealthResponse>("/api/v1/health");
}

export const candidateSourcingApi = {
  catalog: () =>
    api.get<SourceCatalogResponse>("/api/v1/candidate-source-catalog"),
  getSettings: () =>
    api.get<OrgSourceSettings>("/api/v1/organization/candidate-source-settings"),
  updateSettings: (body: OrgSourceSettingsUpdate) =>
    api.put<OrgSourceSettings>(
      "/api/v1/organization/candidate-source-settings",
      body,
    ),
  counts: () =>
    api.get<SourceCountsResponse>(
      "/api/v1/organization/candidate-source-counts",
    ),
  getJobPoolConfig: (jobId: string) =>
    api.get<JobPoolConfig>(
      `/api/v1/jobs/${encodeURIComponent(jobId)}/candidate-pool/config`,
    ),
  updateJobPoolConfig: (jobId: string, body: JobPoolConfigUpdate) =>
    api.put<JobPoolConfig>(
      `/api/v1/jobs/${encodeURIComponent(jobId)}/candidate-pool/config`,
      body,
    ),
  previewJobPool: (jobId: string) =>
    api.post<PoolPreview>(
      `/api/v1/jobs/${encodeURIComponent(jobId)}/candidate-pool/preview`,
      {},
    ),
  buildJobPool: (jobId: string) =>
    api.post<PoolBuildResult>(
      `/api/v1/jobs/${encodeURIComponent(jobId)}/candidate-pool/build`,
      {},
    ),
  listPoolRuns: (jobId: string) =>
    api.get<PoolRunListResponse>(
      `/api/v1/jobs/${encodeURIComponent(jobId)}/candidate-pool/runs`,
    ),
};

// ── Phase 1: Job Detail Hub ──────────────────────────────────────────────

export type PipelineStage =
  | "define" | "source" | "screen" | "shortlist"
  | "reveal" | "outreach" | "interview" | "evaluate" | "decide";

export interface BackendFairnessRubric {
  protected_attrs: Record<string, boolean>;
  disparate_impact_threshold: number;
  enabled: boolean;
}

export interface BackendStageStats {
  define: number; source: number; screen: number; shortlist: number;
  reveal: number; outreach: number; interview: number; evaluate: number; decide: number;
}

export interface BackendJobStats {
  total_candidates: number;
  by_stage: BackendStageStats;
}

export interface BackendSkillWeight { name: string; weight: number; }

export interface BackendJobDetail {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  employment_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  description: string | null;
  required_skills: BackendSkillWeight[];
  optional_skills: BackendSkillWeight[];
  status: string;
  posted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  stats: BackendJobStats;
  fairness_rubric: BackendFairnessRubric | null;
}

export interface BackendStageCandidatePreview {
  id: string; name: string; score: number | null;
}

export interface BackendPipelineStage {
  key: PipelineStage;
  count: number;
  preview: BackendStageCandidatePreview[];
}

export interface BackendPipelineStages {
  stages: BackendPipelineStage[];
}

export interface BackendCandidateListItem {
  id: string;
  application_id: string;
  name: string;
  headline: string | null;
  overall_score: number | null;
  pipeline_stage: PipelineStage;
  source_channel: string | null;
  created_at: string | null;
}

export interface BackendCandidateList {
  items: BackendCandidateListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface JobCandidatesQuery {
  stage?: PipelineStage;
  min_score?: number;
  source?: string;
  q?: string;
  sort?: string;
  page?: number;
  page_size?: number;
}

export interface BackendScoreCriterion {
  criterion: string;
  score: number | null;
  weight: number | null;
  reasoning: string | null;
}

export interface BackendActivityEvent {
  type: string;
  at: string;
  actor: string;
  payload: Record<string, unknown>;
}

export interface BackendCandidateDetail {
  id: string;
  name: string;
  headline: string | null;
  location: string | null;
  email_masked: string | null;
  phone_masked: string | null;
  current_role: string | null;
  years_experience: number | null;
  overall_score: number | null;
  pipeline_stage: PipelineStage | null;
  cv: {
    experience: { company: string; title: string; start_date: string | null; end_date: string | null; description: string | null }[];
    education: { institution: string; degree: string | null; field: string | null; graduation_year: number | null }[];
    skills: { skill_id: string; proficiency: number | null }[];
    certifications: { name: string; issuer: string | null }[];
  };
  scores: BackendScoreCriterion[];
  activity: BackendActivityEvent[];
}

export interface FairnessRubricInput {
  protected_attrs: Record<string, boolean>;
  disparate_impact_threshold: number;
  enabled: boolean;
}

export async function getJobDetail(id: string): Promise<BackendJobDetail> {
  return api.get<BackendJobDetail>(`/api/v1/jobs/${encodeURIComponent(id)}/detail`);
}

export async function getJobPipelineStages(id: string): Promise<BackendPipelineStages> {
  return api.get<BackendPipelineStages>(`/api/v1/jobs/${encodeURIComponent(id)}/pipeline-stages`);
}

export async function getJobCandidates(id: string, q: JobCandidatesQuery = {}): Promise<BackendCandidateList> {
  const params = new URLSearchParams();
  if (q.stage) params.set("stage", q.stage);
  if (q.min_score != null) params.set("min_score", String(q.min_score));
  if (q.source) params.set("source", q.source);
  if (q.q) params.set("q", q.q);
  if (q.sort) params.set("sort", q.sort);
  if (q.page) params.set("page", String(q.page));
  if (q.page_size) params.set("page_size", String(q.page_size));
  const qs = params.toString();
  return api.get<BackendCandidateList>(`/api/v1/jobs/${encodeURIComponent(id)}/candidates${qs ? `?${qs}` : ""}`);
}

export async function moveApplicationStage(appId: string, stage: PipelineStage): Promise<{ id: string; stage: string; updated_at: string }> {
  return api.put(`/api/v1/candidate-applications/${encodeURIComponent(appId)}/stage`, { stage });
}

export async function putFairnessRubric(jobId: string, rubric: FairnessRubricInput) {
  return api.put(`/api/v1/jobs/${encodeURIComponent(jobId)}/fairness-rubric`, rubric);
}

export async function getCandidateDetail(candidateId: string, jobId?: string): Promise<BackendCandidateDetail> {
  const qs = jobId ? `?job_id=${encodeURIComponent(jobId)}` : "";
  return api.get<BackendCandidateDetail>(`/api/v1/candidates/${encodeURIComponent(candidateId)}/profile${qs}`);
}
