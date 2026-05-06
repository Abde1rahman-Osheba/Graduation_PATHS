/**
 * PATHS — TanStack Query hooks.
 *
 * All hooks return frontend types (camelCase). Backend responses are adapted
 * through the adapters layer so pages never see snake_case or backend shapes.
 *
 * Org/recruiter data: real API only — no mock fallback when the backend is
 * configured. Without NEXT_PUBLIC_API_URL, list queries return empty shapes.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  jobsApi,
  type JobsListFilters,
  applicationsApi,
  approvalsApi,
  membersApi,
  auditApi as backendAuditApi,
  dashboardApi as backendDashboardApi,
  evidenceApi,
  biasFairnessApi,
  candidatePortalApi,
  publicJobsApi,
  cvIngestionApi,
  organizationApi,
  recruitCandidatesApi,
  dssApi,
  interviewsApi,
  orgMatchingApi,
  sourcingApi,
  type SourcedListFilters,
  type SourcedMatchFilters,
  googleIntegrationApi,
  outreachAgentApi,
  publicSchedulingApi,
  type BackendOutreachCreateBody,
  interviewRuntimeApi,
  type BackendCreateInterviewSessionBody,
} from "@/lib/api";

import type {
  BackendDSSPacket,
  BackendDSSEmail,
  BackendDSSDevPlan,
  BackendInterviewAnalysis,
  BackendMatchingRun,
} from "@/lib/api";

import {
  adaptJobs,
  adaptJob,
  adaptApplications,
  adaptShortlist,
  adaptApprovals,
  adaptApproval,
  adaptDashboardStats,
  adaptFunnel,
  adaptAgents,
  adaptAuditEvents,
  adaptMembers,
  adaptOrganizationFromBackend,
  adaptRecruiterCandidateDetail,
} from "@/lib/api/adapters";

import type { CandidateProfile } from "@/types/candidate-profile.types";
import type { DashboardStats } from "@/types";
import {
  adaptBackendCandidateProfileOut,
  createEmptyCandidateProfile,
} from "@/lib/candidate/portal-profile";

// ── Fallback helper ───────────────────────────────────────────────────────

const HAS_BACKEND = Boolean(process.env.NEXT_PUBLIC_API_URL);

const EMPTY_DASHBOARD_STATS: DashboardStats = {
  activeJobs: 0,
  totalCandidates: 0,
  pendingApprovals: 0,
  avgTimeToHire: 0,
  thisWeekApplications: 0,
  shortlistedToday: 0,
  interviewsScheduled: 0,
  hiredThisMonth: 0,
};

/** Recruiter/org routes: never substitute mock Sara/demo rows. */
async function orgEntityQuery<T>(real: () => Promise<T>, whenNoBackend: T): Promise<T> {
  if (!HAS_BACKEND) return whenNoBackend;
  return real();
}

/** Candidate portal: never substitute another user's mock data — surface errors or empty state. */
async function portalQuery<T>(real: () => Promise<T>, empty: T): Promise<T> {
  if (!HAS_BACKEND) return empty;
  return real();
}

type PortalApplicationRow = {
  id: string;
  jobTitle: string;
  companyName: string;
  location: string;
  workMode: "remote" | "hybrid" | "onsite";
  status: "applied" | "screening" | "interview" | "offered" | "rejected" | "withdrawn";
  appliedAt: string;
  matchScore?: number;
  stage: string;
};

function normalizeWorkMode(v: string | null | undefined): "remote" | "hybrid" | "onsite" {
  const x = (v ?? "onsite").toLowerCase();
  if (x === "remote" || x === "hybrid" || x === "onsite") return x;
  return "onsite";
}

function normalizeAppStatus(raw: string): PortalApplicationRow["status"] {
  const s = raw.toLowerCase().replace(/[\s-]+/g, "_");
  const allowed = new Set<PortalApplicationRow["status"]>([
    "applied",
    "screening",
    "interview",
    "offered",
    "rejected",
    "withdrawn",
  ]);
  return allowed.has(s as PortalApplicationRow["status"])
    ? (s as PortalApplicationRow["status"])
    : "applied";
}

// ── Candidate hooks ────────────────────────────────────────────────────────

export const useCandidates = () =>
  useQuery({
    queryKey: ["candidates"],
    queryFn: () => orgEntityQuery(async () => [], []),
  });

export const useCandidate = (id: string) =>
  useQuery({
    queryKey: ["candidates", id],
    queryFn: async () =>
      adaptRecruiterCandidateDetail(
        (await recruitCandidatesApi.get(id)) as unknown as Parameters<
          typeof adaptRecruiterCandidateDetail
        >[0],
      ),
    enabled: Boolean(id) && HAS_BACKEND,
  });

export const useCandidateSearch = (query: string) =>
  useQuery({
    queryKey: ["candidates", "search", query],
    queryFn: async () => [],
    enabled: query.length > 1,
    staleTime: 10_000,
  });

// ── Job hooks ─────────────────────────────────────────────────────────────

export type { JobsListFilters };

export const useJobs = (filters: JobsListFilters = {}) =>
  useQuery({
    queryKey: [
      "jobs",
      filters.activeOnly ?? false,
      filters.keyword ?? "",
      filters.location ?? "",
      filters.source ?? "",
      filters.company ?? "",
      filters.status ?? "",
      filters.remote ?? null,
      filters.employmentType ?? "",
      filters.limit ?? null,
      filters.offset ?? null,
    ],
    queryFn: () =>
      orgEntityQuery(async () => adaptJobs(await jobsApi.list(filters)), []),
  });

export const useJobImportStatus = () =>
  useQuery({
    queryKey: ["jobs", "import-status"],
    queryFn: () => orgEntityQuery(() => jobsApi.importStatus(), {
      last_run_at: null,
      last_success: null,
      last_inserted_count: null,
      last_error: null,
    }),
    enabled: HAS_BACKEND,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

export const useRunJobImport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      keyword?: string;
      location?: string;
      limit?: number;
      source?: string;
    }) => jobsApi.runImport(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["jobs", "import-status"] });
    },
  });
};

export const useJob = (id: string) =>
  useQuery({
    queryKey: ["jobs", id],
    queryFn: async () => adaptJob(await jobsApi.get(id)),
    enabled: Boolean(id) && HAS_BACKEND,
  });

// ── Application hooks ─────────────────────────────────────────────────────

export const useApplications = () =>
  useQuery({
    queryKey: ["applications"],
    queryFn: () =>
      orgEntityQuery(
        async () => adaptApplications(await applicationsApi.list()),
        [],
      ),
  });

export const useApplicationsByJob = (jobId: string) =>
  useQuery({
    queryKey: ["applications", "job", jobId],
    queryFn: () =>
      orgEntityQuery(
        async () => adaptApplications(await applicationsApi.listByJob(jobId)),
        [],
      ),
    enabled: Boolean(jobId),
  });

export const useShortlist = (jobId: string) =>
  useQuery({
    queryKey: ["shortlist", jobId],
    queryFn: () =>
      orgEntityQuery(
        async () => adaptShortlist(await applicationsApi.shortlist(jobId), jobId),
        [],
      ),
    enabled: Boolean(jobId),
  });

export const useApplication = (id: string) =>
  useQuery({
    queryKey: ["applications", id],
    queryFn: async () => adaptApplications([await applicationsApi.get(id)])[0],
    enabled: Boolean(id) && HAS_BACKEND,
  });

export const useAdvanceStage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage, reason }: { id: string; stage: string; reason?: string }) =>
      applicationsApi.advanceStage(id, stage, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["shortlist"] });
    },
  });
};

// ── Approval hooks ────────────────────────────────────────────────────────

export const useApprovals = (statusFilter?: string) =>
  useQuery({
    queryKey: ["approvals", statusFilter ?? "all"],
    queryFn: () =>
      orgEntityQuery(
        async () => adaptApprovals(await approvalsApi.list(statusFilter)),
        [],
      ),
  });

export const usePendingApprovals = () =>
  useQuery({
    queryKey: ["approvals", "pending"],
    queryFn: () =>
      orgEntityQuery(
        async () => adaptApprovals(await approvalsApi.pending()),
        [],
      ),
    refetchInterval: 30_000,
  });

export const useDecideApproval = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      reason,
    }: {
      id: string;
      decision: "approved" | "rejected";
      reason?: string;
    }) => approvalsApi.decide(id, decision, reason).then(adaptApproval),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approvals"] });
    },
  });
};

// ── Member hooks ──────────────────────────────────────────────────────────

export const useMembers = () =>
  useQuery({
    queryKey: ["members"],
    queryFn: () =>
      orgEntityQuery(async () => adaptMembers(await membersApi.list()), []),
  });

export const useInviteMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      orgId: string;
      full_name: string;
      email: string;
      password: string;
      role_code: string;
    }) =>
      membersApi.invite(data.orgId, {
        full_name: data.full_name,
        email: data.email,
        password: data.password,
        role_code: data.role_code,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
    },
  });
};

// ── Organization hook ─────────────────────────────────────────────────────

export const useOrganization = () =>
  useQuery({
    queryKey: ["organization"],
    queryFn: () =>
      orgEntityQuery(
        async () => adaptOrganizationFromBackend(await organizationApi.getMe()),
        adaptOrganizationFromBackend({
          id: "",
          name: "",
          slug: "",
          industry: null,
          contactEmail: null,
          isActive: false,
        }),
      ),
  });

// ── Audit hooks ───────────────────────────────────────────────────────────

export const useAuditEvents = (search?: string) =>
  useQuery({
    queryKey: ["audit", search ?? ""],
    queryFn: () =>
      orgEntityQuery(
        async () => adaptAuditEvents(await backendAuditApi.list(search)),
        [],
      ),
  });

// ── Dashboard hooks ───────────────────────────────────────────────────────

export const useDashboardStats = () =>
  useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () =>
      orgEntityQuery(
        async () => adaptDashboardStats(await backendDashboardApi.stats()),
        EMPTY_DASHBOARD_STATS,
      ),
  });

export const useFunnelData = () =>
  useQuery({
    queryKey: ["dashboard", "funnel"],
    queryFn: () =>
      orgEntityQuery(async () => adaptFunnel(await backendDashboardApi.funnel()), []),
  });

export const useWeeklyApplications = () =>
  useQuery({
    queryKey: ["dashboard", "weekly"],
    queryFn: () => orgEntityQuery(async () => [], [] as { week: string; applications: number; shortlisted: number }[]),
  });

export const useAgentStatus = () =>
  useQuery({
    queryKey: ["agents"],
    queryFn: () =>
      orgEntityQuery(
        async () => adaptAgents(await backendDashboardApi.agents()),
        [],
      ),
    refetchInterval: 15_000,
  });

// ── Evidence hooks ────────────────────────────────────────────────────────

export const useEvidenceItems = (candidateId: string, type?: string) =>
  useQuery({
    queryKey: ["evidence", candidateId, type ?? "all"],
    queryFn: () => evidenceApi.listItems(candidateId, type),
    enabled: Boolean(candidateId),
    retry: 1,
  });

export const useCandidateSources = (candidateId: string) =>
  useQuery({
    queryKey: ["candidate-sources", candidateId],
    queryFn: () => evidenceApi.listSources(candidateId),
    enabled: Boolean(candidateId),
    retry: 1,
  });

// ── Bias & Fairness hooks ─────────────────────────────────────────────────

export const useDeanonStatus = (candidateId: string) =>
  useQuery({
    queryKey: ["deanon-status", candidateId],
    queryFn: () => biasFairnessApi.getDeanonStatus(candidateId),
    enabled: Boolean(candidateId),
    retry: 1,
    staleTime: 60_000,
  });

export const useRequestDeanon = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      candidateId,
      purpose,
    }: {
      candidateId: string;
      purpose?: string;
    }) => biasFairnessApi.requestDeanon(candidateId, purpose),
    onSuccess: (_data, { candidateId }) => {
      qc.invalidateQueries({ queryKey: ["deanon-status", candidateId] });
      qc.invalidateQueries({ queryKey: ["approvals"] });
    },
  });
};

export const useProposeShortlist = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => biasFairnessApi.proposeShortlist(jobId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approvals"] });
    },
  });
};

// ── Candidate Portal hooks ────────────────────────────────────────────────

export const useCandidateProfile = () =>
  useQuery({
    queryKey: ["candidate-profile"],
    queryFn: () =>
      portalQuery(
        async () => adaptBackendCandidateProfileOut(await candidatePortalApi.getProfile()),
        createEmptyCandidateProfile(),
      ),
    staleTime: 60_000,
  });

export const useUpdateCandidateProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof candidatePortalApi.updateProfile>[0]) =>
      candidatePortalApi.updateProfile(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidate-profile"] });
    },
  });
};

export const useCandidateApplications = () =>
  useQuery({
    queryKey: ["candidate-applications"],
    queryFn: () =>
      portalQuery(async () => {
        const apps = await candidatePortalApi.getApplications();
        return apps.map(
          (app): PortalApplicationRow => ({
            id: app.id,
            jobTitle: app.job_title ?? "Unknown Position",
            companyName: app.company_name ?? "",
            location: app.location_text ?? "",
            workMode: normalizeWorkMode(app.workplace_type),
            status: normalizeAppStatus(app.overall_status ?? app.current_stage_code),
            appliedAt: app.created_at,
            matchScore: undefined,
            stage:
              app.current_stage_code.charAt(0).toUpperCase() +
              app.current_stage_code.slice(1).replace(/_/g, " "),
          }),
        );
      }, []),
  });

export const useCVUpload = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, candidateId }: { file: File; candidateId?: string }) => {
      const fromCache = qc.getQueryData<CandidateProfile>(["candidate-profile"]);
      const cid = candidateId ?? fromCache?.id;
      if (!cid) throw new Error("Your candidate profile is not loaded. Refresh and try again.");
      return cvIngestionApi.upload(file, cid);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidate-profile"] });
    },
  });
};

export const usePublicJobs = () =>
  useQuery({
    queryKey: ["public-jobs"],
    queryFn: async () => {
      if (!HAS_BACKEND) return [];
      const jobs = await publicJobsApi.list();
      return jobs.map((j) => ({
        id: String(j.id),
        title: j.title,
        company: j.company_name ?? "Unknown Company",
        location: j.location_text ?? "Remote",
        workMode: j.workplace_type ?? "onsite",
        salary: j.salary_min && j.salary_max
          ? `${j.salary_currency ?? "USD"} ${j.salary_min.toLocaleString()} – ${j.salary_max.toLocaleString()} / mo`
          : "Competitive",
        skills: [] as string[],
        level: j.seniority_level ?? "Mid",
        postedAt: new Date().toISOString().split("T")[0],
        applicants: j.applicant_count ?? 0,
      }));
    },
    staleTime: 120_000,
  });

// ── Decision Support System hooks ─────────────────────────────────────────

export const useDSSLatestPacket = (applicationId: string, orgId: string) =>
  useQuery({
    queryKey: ["dss-packet", "latest", applicationId],
    queryFn: () => dssApi.getLatestForApplication(applicationId, orgId),
    enabled: Boolean(applicationId) && Boolean(orgId),
    retry: 1,
  });

export const useDSSPacket = (packetId: string, orgId: string) =>
  useQuery({
    queryKey: ["dss-packet", packetId],
    queryFn: () => dssApi.getPacket(packetId, orgId),
    enabled: Boolean(packetId) && Boolean(orgId),
  });

export const useDSSDevPlan = (packetId: string, orgId: string, enabled = true) =>
  useQuery({
    queryKey: ["dss-devplan", packetId],
    queryFn: () => dssApi.getDevPlan(packetId, orgId),
    enabled: Boolean(packetId) && Boolean(orgId) && enabled,
    retry: 1,
  });

export const useDSSEmail = (packetId: string, orgId: string, enabled = true) =>
  useQuery({
    queryKey: ["dss-email", packetId],
    queryFn: () => dssApi.getEmail(packetId, orgId),
    enabled: Boolean(packetId) && Boolean(orgId) && enabled,
    retry: 1,
  });

export const useGenerateDSSPacket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orgId,
      applicationId,
      candidateId,
      jobId,
    }: {
      orgId: string;
      applicationId: string;
      candidateId: string;
      jobId: string;
    }) =>
      dssApi.generate(orgId, {
        application_id: applicationId,
        candidate_id: candidateId,
        job_id: jobId,
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["dss-packet", "latest", vars.applicationId] });
    },
  });
};

export const useHrDecision = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      packetId,
      orgId,
      finalDecision,
      hrNotes,
      overrideReason,
    }: {
      packetId: string;
      orgId: string;
      finalDecision: string;
      hrNotes?: string;
      overrideReason?: string;
    }) =>
      dssApi.hrDecision(packetId, orgId, {
        final_decision: finalDecision,
        hr_notes: hrNotes,
        override_reason: overrideReason,
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["dss-packet", vars.packetId] });
    },
  });
};

export const useGenerateDevPlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ packetId, orgId }: { packetId: string; orgId: string }) =>
      dssApi.generateDevPlan(packetId, orgId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["dss-devplan", vars.packetId] });
    },
  });
};

export const useGenerateDSSEmail = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      packetId,
      orgId,
      emailType,
    }: {
      packetId: string;
      orgId: string;
      emailType: "acceptance" | "rejection";
    }) => dssApi.generateEmail(packetId, orgId, emailType),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["dss-email", vars.packetId] });
    },
  });
};

export const useApproveDSSEmail = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ packetId, orgId }: { packetId: string; orgId: string }) =>
      dssApi.approveEmail(packetId, orgId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["dss-email", vars.packetId] });
    },
  });
};

export const useSendDSSEmail = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ packetId, orgId }: { packetId: string; orgId: string }) =>
      dssApi.sendEmail(packetId, orgId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["dss-email", vars.packetId] });
    },
  });
};

// ── Interview Intelligence hooks ───────────────────────────────────────────

export const useInterviews = (orgId: string) =>
  useQuery({
    queryKey: ["interviews", orgId],
    queryFn: async () => {
      const rows = await orgEntityQuery(() => interviewsApi.list(orgId), []);
      return rows.map((row) => ({
        id: row.interview_id,
        applicationId: row.application_id,
        candidateName: row.candidate_name,
        jobTitle: row.job_title,
        interviewType: row.interview_type,
        status: row.status,
        scheduledStart: row.scheduled_start,
        meetingUrl: row.meeting_url,
      }));
    },
    enabled: Boolean(orgId),
  });

export const useScheduleInterview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof interviewsApi.schedule>[0]) =>
      interviewsApi.schedule(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["interviews"] });
    },
  });
};

export const useInterviewQuestions = (interviewId: string, orgId: string) =>
  useQuery({
    queryKey: ["interview-questions", interviewId],
    queryFn: () => interviewsApi.getQuestions(interviewId, orgId),
    enabled: Boolean(interviewId) && Boolean(orgId),
  });

export const useGenerateInterviewQuestions = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      interviewId,
      orgId,
      includeHr = true,
      includeTechnical = true,
      regenerate = false,
    }: {
      interviewId: string;
      orgId: string;
      includeHr?: boolean;
      includeTechnical?: boolean;
      regenerate?: boolean;
    }) =>
      interviewsApi.generateQuestions(interviewId, orgId, {
        include_hr: includeHr,
        include_technical: includeTechnical,
        regenerate,
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["interview-questions", vars.interviewId] });
    },
  });
};

export const useApproveInterviewQuestions = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      interviewId,
      orgId,
      approved,
    }: {
      interviewId: string;
      orgId: string;
      approved: boolean;
    }) => interviewsApi.approveQuestions(interviewId, orgId, { approved }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["interview-questions", vars.interviewId] });
    },
  });
};

export const useUploadTranscript = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      interviewId,
      orgId,
      transcriptText,
      transcriptSource,
    }: {
      interviewId: string;
      orgId: string;
      transcriptText: string;
      transcriptSource?: string;
    }) =>
      interviewsApi.uploadTranscript(interviewId, orgId, {
        transcript_text: transcriptText,
        transcript_source: transcriptSource ?? "manual",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["interview-analysis"] });
    },
  });
};

export const useAnalyzeInterview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      interviewId,
      orgId,
    }: {
      interviewId: string;
      orgId: string;
    }) => interviewsApi.analyze(interviewId, orgId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["interview-analysis", vars.interviewId] });
    },
  });
};

export const useInterviewHumanDecision = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      interviewId,
      orgId,
      finalDecision,
      hrNotes,
      overrideReason,
    }: {
      interviewId: string;
      orgId: string;
      finalDecision: string;
      hrNotes?: string;
      overrideReason?: string;
    }) =>
      interviewsApi.humanDecision(interviewId, orgId, {
        final_decision: finalDecision,
        hr_notes: hrNotes,
        override_reason: overrideReason,
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["interview-analysis", vars.interviewId] });
    },
  });
};

// ── Organization Matching / Outreach hooks ────────────────────────────────

export const useOrgDatabaseSearch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof orgMatchingApi.databaseSearch>[0]) =>
      orgMatchingApi.databaseSearch(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-matching"] });
    },
  });
};

export const useMatchingRun = (runId: string) =>
  useQuery({
    queryKey: ["org-matching-run", runId],
    queryFn: () => orgMatchingApi.getRun(runId),
    enabled: Boolean(runId),
  });

export const useMatchingShortlist = (runId: string) =>
  useQuery({
    queryKey: ["org-matching-shortlist", runId],
    queryFn: () => orgMatchingApi.getShortlist(runId),
    enabled: Boolean(runId),
  });

export const useApproveOutreach = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      runId,
      rankingId,
      bookingLink,
      deadlineDays,
    }: {
      runId: string;
      rankingId: string;
      bookingLink?: string;
      deadlineDays?: number;
    }) =>
      orgMatchingApi.approveOutreach(runId, rankingId, {
        booking_link: bookingLink,
        deadline_days: deadlineDays,
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["org-matching-shortlist", vars.runId] });
    },
  });
};

export const useGenerateOutreachDraft = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      runId,
      rankingId,
      bookingLink,
      deadlineDays,
    }: {
      runId: string;
      rankingId: string;
      bookingLink?: string;
      deadlineDays?: number;
    }) =>
      orgMatchingApi.generateDraft(runId, rankingId, {
        booking_link: bookingLink,
        deadline_days: deadlineDays,
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["org-matching-shortlist", vars.runId] });
    },
  });
};

export const useSendOutreach = () =>
  useMutation({
    mutationFn: ({
      messageId,
      recipientEmail,
    }: {
      messageId: string;
      recipientEmail: string;
    }) => orgMatchingApi.sendOutreach(messageId, { recipient_email: recipientEmail }),
  });

// ── Interview Intelligence runtime hooks ──────────────────────────────────

export const useCreateInterviewSession = () =>
  useMutation({
    mutationFn: (body: BackendCreateInterviewSessionBody) =>
      interviewRuntimeApi.createSession(body),
  });

export const useInterviewSession = (sessionId: string) =>
  useQuery({
    queryKey: ["interview-session", sessionId],
    queryFn: () => interviewRuntimeApi.getSession(sessionId),
    enabled: Boolean(sessionId) && HAS_BACKEND,
  });

export const useGenerateInterviewQuestionsRuntime = () =>
  useMutation({
    mutationFn: (vars: {
      interviewId: string;
      orgId: string;
      regenerate?: boolean;
    }) =>
      interviewRuntimeApi.generateQuestions(vars.interviewId, vars.orgId, {
        include_hr: true,
        include_technical: true,
        regenerate: !!vars.regenerate,
      }),
  });

export const useRecordInterviewAnswer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      sessionId: string;
      question: string;
      answer: string;
      is_followup?: boolean;
      parent_index?: number | null;
    }) =>
      interviewRuntimeApi.recordAnswer(vars.sessionId, {
        question: vars.question,
        answer: vars.answer,
        is_followup: vars.is_followup ?? false,
        parent_index: vars.parent_index ?? null,
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["interview-session", vars.sessionId] });
    },
  });
};

export const useGenerateInterviewFollowUp = () =>
  useMutation({
    mutationFn: (vars: { sessionId: string; parentIndex: number }) =>
      interviewRuntimeApi.generateFollowUp(vars.sessionId, vars.parentIndex),
  });

export const useFinishInterviewSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => interviewRuntimeApi.finish(sessionId),
    onSuccess: (_data, sessionId) => {
      qc.invalidateQueries({ queryKey: ["interview-session", sessionId] });
      qc.invalidateQueries({ queryKey: ["interview-report", sessionId] });
    },
  });
};

export const useEvaluateInterviewSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => interviewRuntimeApi.evaluate(sessionId),
    onSuccess: (_data, sessionId) => {
      qc.invalidateQueries({ queryKey: ["interview-report", sessionId] });
    },
  });
};

export const useInterviewReport = (sessionId: string, enabled = true) =>
  useQuery({
    queryKey: ["interview-report", sessionId],
    queryFn: () => interviewRuntimeApi.getReport(sessionId),
    enabled: Boolean(sessionId) && enabled && HAS_BACKEND,
  });

// ── Open-to-Work Candidate Sourcing hooks ─────────────────────────────────

export const useSourcingStatus = () =>
  useQuery({
    queryKey: ["sourcing", "status"],
    queryFn: () => orgEntityQuery(() => sourcingApi.status(), {
      enabled: false,
      provider: "mock",
      interval_minutes: 60,
      max_per_run: 0,
      reasoning_enabled: false,
      reasoning_model: "",
      metadata: null,
    }),
    enabled: HAS_BACKEND,
    staleTime: 30_000,
  });

export const useSourcedCandidates = (filters: SourcedListFilters = {}) =>
  useQuery({
    queryKey: [
      "sourcing",
      "candidates",
      filters.title ?? "",
      (filters.skills ?? []).join(","),
      filters.location ?? "",
      filters.workplace ?? "",
      filters.employmentType ?? "",
      filters.minYearsExperience ?? null,
      filters.maxYearsExperience ?? null,
      filters.limit ?? null,
      filters.offset ?? null,
    ],
    queryFn: () =>
      orgEntityQuery(() => sourcingApi.list(filters), {
        organization_id: "",
        total: 0,
        items: [],
        job_id: null,
        filters: {},
      }),
  });

export const useSourcedMatchForJob = (
  jobId: string,
  filters: SourcedMatchFilters = {},
  enabled = true,
) =>
  useQuery({
    queryKey: [
      "sourcing",
      "match",
      jobId,
      filters.topK ?? null,
      filters.location ?? "",
      (filters.workplace ?? []).join(","),
      (filters.employmentType ?? []).join(","),
      filters.minScore ?? null,
    ],
    queryFn: () =>
      orgEntityQuery(() => sourcingApi.matchForJob(jobId, filters), {
        organization_id: "",
        job_id: jobId,
        total: 0,
        top_k: filters.topK ?? 10,
        items: [],
        filters: {},
      }),
    enabled: Boolean(jobId) && enabled && HAS_BACKEND,
  });

export const useExplainSourcedMatch = () =>
  useMutation({
    mutationFn: ({ jobId, candidateId }: { jobId: string; candidateId: string }) =>
      sourcingApi.explain(jobId, candidateId),
  });

export const useRunSourcingImport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      limit?: number;
      provider?: string;
      keywords?: string[];
      location?: string;
    }) => sourcingApi.runImport(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sourcing"] });
    },
  });
};

// ── Outreach Agent hooks ──────────────────────────────────────────────────

export const useGoogleIntegrationStatus = () =>
  useQuery({
    queryKey: ["google-integration", "status"],
    queryFn: () =>
      orgEntityQuery(() => googleIntegrationApi.status(), {
        connected: false,
        configured: false,
        email: null,
        expires_at: null,
        scopes: [] as string[],
        last_error: null,
      }),
    enabled: HAS_BACKEND,
    refetchInterval: 30_000,
  });

export const useGoogleIntegrationConnect = () =>
  useMutation({
    mutationFn: () => googleIntegrationApi.connect(),
  });

export const useGoogleIntegrationDisconnect = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => googleIntegrationApi.disconnect(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["google-integration"] });
    },
  });
};

export const useGenerateOutreachEmail = () =>
  useMutation({
    mutationFn: (body: {
      candidate_id: string;
      job_id?: string | null;
      interview_type?: string;
      is_final_offer?: boolean;
      extra_instructions?: string;
    }) => outreachAgentApi.generateEmail(body),
  });

export const useSaveOutreachDraft = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BackendOutreachCreateBody) => outreachAgentApi.saveDraft(body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["outreach-history", vars.candidate_id] });
    },
  });
};

export const useSendOutreachAgent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BackendOutreachCreateBody) => outreachAgentApi.send(body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["outreach-history", vars.candidate_id] });
    },
  });
};

export const useOutreachHistory = (candidateId: string) =>
  useQuery({
    queryKey: ["outreach-history", candidateId],
    queryFn: () =>
      orgEntityQuery(() => outreachAgentApi.history(candidateId), {
        candidate_id: candidateId,
        items: [],
      }),
    enabled: Boolean(candidateId) && HAS_BACKEND,
  });

export const usePublicSchedule = (token: string) =>
  useQuery({
    queryKey: ["public-schedule", token],
    queryFn: () => publicSchedulingApi.view(token),
    enabled: Boolean(token),
    retry: 0,
  });

export const useBookPublicSlot = () =>
  useMutation({
    mutationFn: ({
      token,
      start,
      end,
    }: {
      token: string;
      start: string;
      end: string;
    }) =>
      publicSchedulingApi.book(token, {
        selected_start_time: start,
        selected_end_time: end,
      }),
  });

// ── IDSS / Development Plan hooks ─────────────────────────────────────────

import { developmentPlansApi as _devPlansApi } from "@/lib/api";

export const useDecisionReport = (packetId: string, orgId: string, enabled = true) =>
  useQuery({
    queryKey: ["decision-report", packetId],
    queryFn: () => dssApi.decisionReport(packetId, orgId),
    enabled: Boolean(packetId) && Boolean(orgId) && enabled && HAS_BACKEND,
  });

export const useManagerDecision = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      packetId: string;
      orgId: string;
      decision:
        | "accepted"
        | "rejected"
        | "request_more_interview"
        | "request_more_evidence";
      managerNotes?: string;
    }) =>
      dssApi.managerDecision(vars.packetId, vars.orgId, {
        decision: vars.decision,
        manager_notes: vars.managerNotes,
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["decision-report", vars.packetId] });
      qc.invalidateQueries({ queryKey: ["dss-packet"] });
    },
  });
};

export const useGenerateDevelopmentPlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      orgId: string;
      candidateId: string;
      jobId: string;
      decisionId: string;
    }) =>
      _devPlansApi.generate(vars.orgId, {
        candidate_id: vars.candidateId,
        job_id: vars.jobId,
        decision_id: vars.decisionId,
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["decision-report", vars.decisionId] });
      qc.invalidateQueries({ queryKey: ["candidate-plans", vars.candidateId] });
    },
  });
};

export const useDevelopmentPlan = (planId: string, orgId: string, enabled = true) =>
  useQuery({
    queryKey: ["development-plan", planId],
    queryFn: () => _devPlansApi.get(planId, orgId),
    enabled: Boolean(planId) && Boolean(orgId) && enabled && HAS_BACKEND,
  });

export const useApprovePlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { planId: string; orgId: string; notes?: string }) =>
      _devPlansApi.approve(vars.planId, vars.orgId, { notes: vars.notes }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["development-plan", vars.planId] });
      qc.invalidateQueries({ queryKey: ["decision-report"] });
    },
  });
};

export const useRevisePlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { planId: string; orgId: string; notes?: string }) =>
      _devPlansApi.revise(vars.planId, vars.orgId, { notes: vars.notes }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["development-plan", vars.planId] });
    },
  });
};

export const useUpdateCandidateFeedback = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      planId: string;
      orgId: string;
      candidateFacingMessage: string;
    }) =>
      _devPlansApi.setCandidateFeedback(vars.planId, vars.orgId, {
        candidate_facing_message: vars.candidateFacingMessage,
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["development-plan", vars.planId] });
    },
  });
};

export const useSendPlanFeedback = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { planId: string; orgId: string; recipientEmail?: string }) =>
      _devPlansApi.sendFeedback(vars.planId, vars.orgId, {
        recipient_email: vars.recipientEmail,
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["development-plan", vars.planId] });
    },
  });
};

export const useShortlistSourcedCandidate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      jobId,
      candidateId,
      stageCode,
      note,
    }: {
      jobId: string;
      candidateId: string;
      stageCode?: string;
      note?: string;
    }) =>
      sourcingApi.shortlist(jobId, {
        candidate_id: candidateId,
        job_id: jobId,
        stage_code: stageCode,
        note,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["shortlist"] });
    },
  });
};
