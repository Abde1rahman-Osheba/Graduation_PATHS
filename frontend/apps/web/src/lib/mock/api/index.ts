import { mockCandidates } from "../data/candidates";
import { mockJobs } from "../data/jobs";
import { mockApplications } from "../data/applications";
import { mockApprovals } from "../data/approvals";
import { mockMembers, mockOrganization } from "../data/members";
import { mockAuditEvents } from "../data/audit";
import { mockDashboardStats, mockFunnelData, mockWeeklyApplications, mockAgents } from "../data/dashboard";
import type {
  Candidate, Job, Application, HITLApproval, Member,
  Organization, AuditEvent, DashboardStats, FunnelSnapshot,
  AgentStatus, ApplicationStatus,
} from "@/types";

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

// ─── Candidates ───────────────────────────────────────────────────────────────

export const candidateApi = {
  list: async (): Promise<Candidate[]> => {
    await delay();
    return mockCandidates;
  },
  get: async (id: string): Promise<Candidate> => {
    await delay(300);
    const c = mockCandidates.find((x) => x.id === id);
    if (!c) throw new Error("Candidate not found");
    return c;
  },
  search: async (query: string): Promise<Candidate[]> => {
    await delay(250);
    const q = query.toLowerCase();
    return mockCandidates.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.skills.some((s) => s.skill.toLowerCase().includes(q))
    );
  },
};

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export const jobApi = {
  list: async (): Promise<Job[]> => {
    await delay();
    return mockJobs;
  },
  get: async (id: string): Promise<Job> => {
    await delay(300);
    const j = mockJobs.find((x) => x.id === id);
    if (!j) throw new Error("Job not found");
    return j;
  },
};

// ─── Applications ─────────────────────────────────────────────────────────────

export const applicationApi = {
  list: async (): Promise<Application[]> => {
    await delay();
    return mockApplications;
  },
  listByJob: async (jobId: string): Promise<Application[]> => {
    await delay();
    return mockApplications.filter((a) => a.jobId === jobId);
  },
  listByStage: async (jobId: string, stage: ApplicationStatus): Promise<Application[]> => {
    await delay(200);
    return mockApplications.filter((a) => a.jobId === jobId && a.status === stage);
  },
  get: async (id: string): Promise<Application> => {
    await delay(300);
    const a = mockApplications.find((x) => x.id === id);
    if (!a) throw new Error("Application not found");
    return a;
  },
  shortlist: async (jobId: string): Promise<Application[]> => {
    await delay();
    return mockApplications
      .filter((a) => a.jobId === jobId && a.shortlistRank != null)
      .sort((a, b) => (a.shortlistRank ?? 99) - (b.shortlistRank ?? 99));
  },
};

// ─── HITL Approvals ──────────────────────────────────────────────────────────

export const approvalApi = {
  list: async (): Promise<HITLApproval[]> => {
    await delay();
    return mockApprovals;
  },
  pending: async (): Promise<HITLApproval[]> => {
    await delay(250);
    return mockApprovals.filter((a) => a.status === "pending");
  },
  decide: async (
    id: string,
    decision: "approved" | "rejected",
    reason?: string
  ): Promise<HITLApproval> => {
    await delay(600);
    const approval = mockApprovals.find((a) => a.id === id);
    if (!approval) throw new Error("Approval not found");
    return { ...approval, status: decision, reason, decidedAt: new Date().toISOString() };
  },
};

// ─── Members ─────────────────────────────────────────────────────────────────

export const memberApi = {
  list: async (): Promise<Member[]> => {
    await delay();
    return mockMembers;
  },
  invite: async (email: string, role: string): Promise<void> => {
    await delay(700);
    console.log("[mock] invite sent", { email, role });
  },
};

// ─── Organization ─────────────────────────────────────────────────────────────

export const orgApi = {
  get: async (): Promise<Organization> => {
    await delay(200);
    return mockOrganization;
  },
  update: async (data: Partial<Organization>): Promise<Organization> => {
    await delay(500);
    return { ...mockOrganization, ...data };
  },
};

// ─── Audit ────────────────────────────────────────────────────────────────────

export const auditApi = {
  list: async (): Promise<AuditEvent[]> => {
    await delay();
    return mockAuditEvents;
  },
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardApi = {
  stats: async (): Promise<DashboardStats> => {
    await delay(300);
    return mockDashboardStats;
  },
  funnel: async (): Promise<FunnelSnapshot[]> => {
    await delay(400);
    return mockFunnelData;
  },
  weeklyApplications: async () => {
    await delay(350);
    return mockWeeklyApplications;
  },
  agents: async (): Promise<AgentStatus[]> => {
    await delay(200);
    return mockAgents;
  },
};
