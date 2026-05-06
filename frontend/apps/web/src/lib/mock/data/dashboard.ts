import type { DashboardStats, FunnelSnapshot, AgentStatus } from "@/types";

export const mockDashboardStats: DashboardStats = {
  activeJobs: 3,
  totalCandidates: 120,
  pendingApprovals: 5,
  avgTimeToHire: 18,
  thisWeekApplications: 14,
  shortlistedToday: 3,
  interviewsScheduled: 4,
  hiredThisMonth: 2,
};

export const mockFunnelData: FunnelSnapshot[] = [
  { stage: "applied",       label: "Applied",        count: 120, conversionRate: 100  },
  { stage: "screening",     label: "Screening",      count: 48,  conversionRate: 40   },
  { stage: "assessment",    label: "Assessment",     count: 18,  conversionRate: 37.5 },
  { stage: "hr_interview",  label: "HR Interview",   count: 10,  conversionRate: 55.6 },
  { stage: "tech_interview",label: "Tech Interview", count: 6,   conversionRate: 60   },
  { stage: "decision",      label: "Decision",       count: 4,   conversionRate: 66.7 },
  { stage: "hired",         label: "Hired",          count: 2,   conversionRate: 50   },
];

export const mockWeeklyApplications = [
  { week: "Jan W1", applications: 8,  shortlisted: 3 },
  { week: "Jan W2", applications: 14, shortlisted: 5 },
  { week: "Jan W3", applications: 11, shortlisted: 4 },
  { week: "Jan W4", applications: 19, shortlisted: 7 },
  { week: "Feb W1", applications: 22, shortlisted: 8 },
  { week: "Feb W2", applications: 14, shortlisted: 6 },
];

export const mockAgents: AgentStatus[] = [
  { id: "agent_screening",   name: "Screening Agent",         status: "running",   currentTask: "Scoring batch #47 — Senior Full-Stack", progress: 68 },
  { id: "agent_sourcing",    name: "Sourcing Agent",          status: "idle",      lastRun: "2026-02-12T08:00:00Z" },
  { id: "agent_assessment",  name: "Assessment Agent",        status: "completed", lastRun: "2026-02-12T10:00:00Z" },
  { id: "agent_identity",    name: "Identity Resolution",     status: "running",   currentTask: "Resolving 3 pending merge proposals", progress: 40 },
  { id: "agent_outreach",    name: "Outreach Agent",          status: "idle",      lastRun: "2026-02-11T14:00:00Z" },
  { id: "agent_compliance",  name: "Audit & Compliance",      status: "running",   currentTask: "Daily compliance sweep — Feb 12", progress: 90 },
];
