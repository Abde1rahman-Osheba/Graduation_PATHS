// ─── Core Enums ──────────────────────────────────────────────────────────────

export type UserRole =
  | "recruiter"
  | "hiring_manager"
  | "interviewer"
  | "admin"
  | "super_admin"
  | "candidate";

export type CandidateStatus =
  | "active"
  | "passive"
  | "hired"
  | "rejected"
  | "withdrawn";

export type ApplicationStatus =
  | "applied"
  | "sourced"
  | "screening"
  | "assessment"
  | "hr_interview"
  | "tech_interview"
  | "decision"
  | "hired"
  | "rejected"
  | "withdrawn";

export type JobStatus = "draft" | "published" | "closed" | "archived";

export type JobMode = "inbound" | "outbound" | "hybrid";

export type WorkMode = "remote" | "onsite" | "hybrid";

export type HITLActionType =
  | "shortlist_approve"
  | "outreach_approve"
  | "assessment_decision"
  | "interview_finalize"
  | "decision_finalize"
  | "deanonymize"
  | "merge_candidates";

export type HITLStatus = "pending" | "approved" | "rejected" | "expired";

export type EvidenceType =
  | "cv_claim"
  | "github_repo"
  | "portfolio_artifact"
  | "assessment"
  | "interview";

export type SkillProficiency = "beginner" | "intermediate" | "advanced" | "expert";

// ─── User & Auth ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  /** Backend ``account_type``: ``candidate`` | ``organization_member`` */
  accountType?: string;
  orgId: string;
  orgName: string;
  createdAt: string;
  lastLogin: string;
  mfaEnabled: boolean;
  status: "active" | "invited" | "suspended";
}

// ─── Candidate ────────────────────────────────────────────────────────────────

export interface CandidateSkill {
  id: string;
  skill: string;
  proficiency: SkillProficiency;
  evidenceCount: number;
  lastVerified: string;
  verified: boolean;
}

export interface EvidenceItem {
  id: string;
  candidateId: string;
  type: EvidenceType;
  sourceUri: string;
  extractedText: string;
  confidence: number;
  timestamp: string;
  source: string;
}

export interface Candidate {
  id: string;
  alias: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  title: string;
  location: string;
  experienceYears: number;
  status: CandidateStatus;
  skills: CandidateSkill[];
  evidenceItems: EvidenceItem[];
  sources: string[];
  linkedinUrl?: string;
  githubLogin?: string;
  portfolioUrl?: string;
  isAnonymized: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Job ─────────────────────────────────────────────────────────────────────

export interface JobSkill {
  skill: string;
  required: boolean;
  weight: number;
  minProficiency: SkillProficiency;
}

export interface JobRubricDimension {
  dimension: string;
  weight: number;
  threshold: number;
}

export interface Job {
  id: string;
  orgId: string;
  title: string;
  level: string;
  department: string;
  location: string;
  workMode: WorkMode;
  mode: JobMode;
  status: JobStatus;
  salaryMin?: number;
  salaryMax?: number;
  currency: string;
  headcount: number;
  skills: JobSkill[];
  rubric: JobRubricDimension[];
  pipeline: PipelineStage[];
  collaborators: string[];
  openedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  applicantCount: number;
  shortlistedCount: number;
  /** Present for scraped / external listings */
  companyName?: string;
  sourcePlatform?: string;
  externalJobUrl?: string;
}

export interface PipelineStage {
  stage: ApplicationStatus;
  label: string;
  order: number;
  hitlRequired: boolean;
  count: number;
}

// ─── Application ─────────────────────────────────────────────────────────────

export interface MatchScore {
  dimension: string;
  raw: number;
  weighted: number;
  evidenceCount: number;
  confidence: number;
}

export interface BiasFlag {
  rule: string;
  severity: "low" | "medium" | "high";
  description: string;
}

export interface Application {
  id: string;
  candidateId: string;
  candidate: Candidate;
  jobId: string;
  job: Pick<Job, "id" | "title" | "level" | "department">;
  status: ApplicationStatus;
  sourcePlatform: string;
  shortlistRank?: number;
  applyDate: string;
  matchScore?: number;
  matchConfidence?: number;
  matchScores?: MatchScore[];
  explanation?: string;
  evidenceIds?: string[];
  biasFlags?: BiasFlag[];
  isAnonymized: boolean;
}

// ─── HITL Approval ───────────────────────────────────────────────────────────

export interface HITLApproval {
  id: string;
  actionType: HITLActionType;
  targetId: string;
  targetLabel: string;
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  status: HITLStatus;
  decidedBy?: string;
  decidedByName?: string;
  decidedAt?: string;
  reason?: string;
  priority: "low" | "medium" | "high" | "critical";
  jobId?: string;
  jobTitle?: string;
  candidateAlias?: string;
  meta?: Record<string, unknown>;
}

// ─── Assessment ──────────────────────────────────────────────────────────────

export interface Assessment {
  id: string;
  applicationId: string;
  candidateAlias: string;
  type: "mcq" | "coding" | "case" | "take_home";
  status: "pending" | "delivered" | "submitted" | "graded" | "decided";
  score?: number;
  maxScore: number;
  dueAt: string;
  submittedAt?: string;
  gradedAt?: string;
  pass?: boolean;
  rationale?: string;
}

// ─── Interview ───────────────────────────────────────────────────────────────

export interface Interview {
  id: string;
  applicationId: string;
  type: "hr" | "technical" | "final";
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  scheduledAt: string;
  mode: "video" | "onsite" | "phone";
  interviewers: string[];
  scorecard?: {
    overall: number;
    dimensions: Array<{ dimension: string; score: number; rationale: string }>;
  };
}

// ─── Member / Org ─────────────────────────────────────────────────────────────

export interface Member {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  status: "active" | "invited" | "suspended";
  joinedAt: string;
  lastActive: string;
  jobsAssigned: number;
}

export interface Organization {
  id: string;
  name: string;
  logoUrl?: string;
  plan: "starter" | "growth" | "enterprise";
  region: string;
  locale: string;
  industry: string;
  headcount: string;
  website?: string;
  createdAt: string;
  memberCount: number;
  activeJobCount: number;
  settings: OrgSettings;
}

export interface OrgSettings {
  scoringWeights: Record<string, number>;
  defaultTopK: number;
  anonymizationLevel: "strict" | "standard" | "minimal";
  outboundSourcingEnabled: boolean;
  assessmentEnabled: boolean;
  retentionDays: number;
}

// ─── Audit ───────────────────────────────────────────────────────────────────

export type AuditAction =
  | "candidate.created"
  | "candidate.updated"
  | "candidate.merged"
  | "candidate.deanonymized"
  | "job.created"
  | "job.published"
  | "job.closed"
  | "application.created"
  | "application.status_changed"
  | "shortlist.proposed"
  | "shortlist.approved"
  | "shortlist.rejected"
  | "outreach.sent"
  | "assessment.generated"
  | "assessment.decided"
  | "interview.scheduled"
  | "interview.finalized"
  | "decision.finalized"
  | "member.invited"
  | "member.role_changed"
  | "member.removed"
  | "org.settings_updated";

export interface AuditEvent {
  id: string;
  actor: string;
  actorName: string;
  actorRole: UserRole;
  action: AuditAction;
  targetId: string;
  targetType: string;
  targetLabel: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip: string;
  requestId: string;
  timestamp: string;
  orgId: string;
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface FunnelSnapshot {
  stage: ApplicationStatus;
  label: string;
  count: number;
  conversionRate: number;
}

export interface DashboardStats {
  activeJobs: number;
  totalCandidates: number;
  pendingApprovals: number;
  avgTimeToHire: number;
  thisWeekApplications: number;
  shortlistedToday: number;
  interviewsScheduled: number;
  hiredThisMonth: number;
}

// ─── Sourcing ─────────────────────────────────────────────────────────────────

export interface SourcingRun {
  id: string;
  jobId: string;
  jobTitle: string;
  query: string;
  sources: string[];
  status: "running" | "completed" | "failed" | "paused";
  startedAt: string;
  finishedAt?: string;
  resultCount: number;
  addedCount: number;
  agentId: string;
}

// ─── Agent ───────────────────────────────────────────────────────────────────

export interface AgentStatus {
  id: string;
  name: string;
  status: "idle" | "running" | "completed" | "failed";
  lastRun?: string;
  currentTask?: string;
  progress?: number;
}
