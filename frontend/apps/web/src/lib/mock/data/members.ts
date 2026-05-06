import type { Member, Organization } from "@/types";

export const mockMembers: Member[] = [
  {
    id: "mem_01", userId: "user_01",
    name: "Ahmed Hassan", email: "ahmed@techcorp.io",
    avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=ahmed",
    role: "admin", status: "active",
    joinedAt: "2025-06-01T09:00:00Z", lastActive: "2026-02-12T14:30:00Z",
    jobsAssigned: 4,
  },
  {
    id: "mem_02", userId: "user_02",
    name: "Mona Kamal", email: "mona@techcorp.io",
    avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=mona",
    role: "hiring_manager", status: "active",
    joinedAt: "2025-07-10T09:00:00Z", lastActive: "2026-02-12T11:00:00Z",
    jobsAssigned: 2,
  },
  {
    id: "mem_03", userId: "user_03",
    name: "Tamer Saad", email: "tamer@techcorp.io",
    avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=tamer",
    role: "recruiter", status: "active",
    joinedAt: "2025-08-01T09:00:00Z", lastActive: "2026-02-11T16:00:00Z",
    jobsAssigned: 3,
  },
  {
    id: "mem_04", userId: "user_04",
    name: "Rania Ibrahim", email: "rania@techcorp.io",
    avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=rania",
    role: "interviewer", status: "active",
    joinedAt: "2025-09-15T09:00:00Z", lastActive: "2026-02-10T10:00:00Z",
    jobsAssigned: 1,
  },
  {
    id: "mem_05", userId: "user_05",
    name: "Youssef Ali", email: "youssef@techcorp.io",
    avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=youssef",
    role: "interviewer", status: "active",
    joinedAt: "2025-10-01T09:00:00Z", lastActive: "2026-02-09T09:00:00Z",
    jobsAssigned: 1,
  },
  {
    id: "mem_06", userId: "user_06",
    name: "Hana Mostafa", email: "hana@techcorp.io",
    avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=hana",
    role: "recruiter", status: "invited",
    joinedAt: "2026-02-05T09:00:00Z", lastActive: "2026-02-05T09:00:00Z",
    jobsAssigned: 0,
  },
];

export const mockOrganization: Organization = {
  id: "org_01",
  name: "TechCorp Egypt",
  plan: "growth",
  region: "ME",
  locale: "en",
  industry: "Technology",
  headcount: "51-200",
  website: "https://techcorp.io",
  createdAt: "2025-06-01T09:00:00Z",
  memberCount: 6,
  activeJobCount: 3,
  settings: {
    scoringWeights: {
      "Technical Skills": 0.40,
      "Experience Fit": 0.25,
      "Project Portfolio": 0.20,
      "Communication": 0.15,
    },
    defaultTopK: 5,
    anonymizationLevel: "standard",
    outboundSourcingEnabled: true,
    assessmentEnabled: true,
    retentionDays: 365,
  },
};
