/**
 * PATHS — Mock candidate profile data
 * Used when backend is not available.
 */

import type {
  CandidateProfile,
  AnonymizedCandidateView,
} from "@/types/candidate-profile.types";

export const MOCK_CANDIDATE_PROFILE: CandidateProfile = {
  id: "demo-candidate-id",
  fullName: "Sara El-Masry",
  currentTitle: "Senior Frontend Engineer",
  summary:
    "Passionate frontend engineer with 6 years building high-performance web applications. Experienced in React, Next.js, and TypeScript with a strong focus on accessibility and user experience. Previously led a 4-person frontend team at a fintech startup.",
  avatarUrl: undefined,
  careerLevel: "senior",
  yearsExperience: 6,

  email: "sara@example.com",
  phone: "+20 100 000 0000",
  locationCity: "Cairo",
  locationCountry: "Egypt",
  locationText: "Cairo, Egypt",

  education: [
    {
      id: "edu-1",
      institution: "Cairo University",
      degree: "Bachelor of Science",
      fieldOfStudy: "Computer Science",
      startYear: 2014,
      endYear: 2018,
      isOngoing: false,
      gpa: "3.8 / 4.0",
    },
  ],

  experiences: [
    {
      id: "exp-1",
      companyName: "FinEdge Technologies",
      title: "Senior Frontend Engineer",
      location: "Cairo, Egypt",
      startDate: "2021-03",
      endDate: null,
      isCurrent: true,
      description:
        "Lead the frontend architecture for a real-time trading dashboard serving 50k+ users. Built reusable component library used across 3 products.",
      achievements: [
        "Reduced page load time by 40%",
        "Built internal design system adopted by 12 engineers",
        "Mentored 2 junior engineers",
      ],
    },
    {
      id: "exp-2",
      companyName: "Kode Agency",
      title: "Frontend Developer",
      location: "Remote",
      startDate: "2018-09",
      endDate: "2021-02",
      isCurrent: false,
      description:
        "Developed client-facing web applications for e-commerce and SaaS clients. Worked with React, Vue, and vanilla JS across diverse project stacks.",
    },
  ],

  skills: [
    { id: "sk-1",  name: "React",       category: "technical", proficiency: "expert" },
    { id: "sk-2",  name: "TypeScript",  category: "technical", proficiency: "expert" },
    { id: "sk-3",  name: "Next.js",     category: "technical", proficiency: "advanced" },
    { id: "sk-4",  name: "Tailwind CSS",category: "tool",      proficiency: "advanced" },
    { id: "sk-5",  name: "Node.js",     category: "technical", proficiency: "intermediate" },
    { id: "sk-6",  name: "GraphQL",     category: "technical", proficiency: "intermediate" },
    { id: "sk-7",  name: "Figma",       category: "tool",      proficiency: "intermediate" },
    { id: "sk-8",  name: "Git",         category: "tool",      proficiency: "expert" },
    { id: "sk-9",  name: "Agile/Scrum", category: "soft",      proficiency: "advanced" },
    { id: "sk-10", name: "Arabic",      category: "language",  proficiency: "expert" },
    { id: "sk-11", name: "English",     category: "language",  proficiency: "advanced" },
  ],

  cvDocument: {
    id: "doc-1",
    fileName: "Sara_ElMasry_CV_2026.pdf",
    fileSize: 184320,
    mimeType: "application/pdf",
    uploadedAt: "2026-01-15T10:30:00Z",
    status: "processed",
  },
  documents: [
    {
      id: "doc-1",
      fileName: "Sara_ElMasry_CV_2026.pdf",
      fileSize: 184320,
      mimeType: "application/pdf",
      uploadedAt: "2026-01-15T10:30:00Z",
      status: "processed",
    },
  ],

  links: {
    linkedin: "https://linkedin.com/in/sara-elmasry",
    github: "https://github.com/sara-elmasry",
    portfolio: "https://sara.dev",
  },

  preferences: {
    desiredRoles: ["Frontend Engineer", "Full Stack Engineer", "Tech Lead"],
    jobTypes: ["full_time"],
    workplaceTypes: ["remote", "hybrid"],
    preferredLocations: ["Cairo, Egypt", "Dubai, UAE", "Remote"],
    openToRelocation: true,
    desiredSalaryMin: 3000,
    desiredSalaryMax: 5000,
    salaryCurrency: "USD",
    availableFrom: "2026-03-01",
    noticePeriodWeeks: 4,
  },

  status: "active",
  onboardingCompleted: true,
  onboardingCompletedAt: "2026-01-15T11:00:00Z",
  createdAt: "2026-01-15T10:00:00Z",
  updatedAt: "2026-04-20T09:00:00Z",
};

export const MOCK_ANONYMIZED_VIEW: AnonymizedCandidateView = {
  alias: "Candidate A3F2B1",
  currentTitle: "Senior Frontend Engineer",
  careerLevel: "senior",
  yearsExperience: 6,
  summary:
    "[REDACTED] is a passionate frontend engineer with 6 years building high-performance web applications. Experienced in React, Next.js, and TypeScript.",
  locationGeneral: "Cairo, Egypt",
  skills: [
    { name: "React",       proficiency: "expert" },
    { name: "TypeScript",  proficiency: "expert" },
    { name: "Next.js",     proficiency: "advanced" },
    { name: "Tailwind CSS",proficiency: "advanced" },
    { name: "Node.js",     proficiency: "intermediate" },
  ],
  education: [
    { degree: "Bachelor of Science", fieldOfStudy: "Computer Science", graduationYear: 2018 },
  ],
  experiences: [
    { title: "Senior Frontend Engineer", durationMonths: null, description: "Lead frontend architecture for a real-time trading dashboard.", isCurrent: true },
    { title: "Frontend Developer", durationMonths: 29, description: "Developed client-facing web applications.", isCurrent: false },
  ],
  certifications: [],
  projects: [],
  desiredJobTypes: ["full_time"],
  desiredWorkplace: ["remote", "hybrid"],
  matchScore: 87,
  matchConfidence: 0.91,
  screeningStatus: "shortlisted",
  biasFlags: [],
};

// Mock list of applications the candidate has submitted
export const MOCK_CANDIDATE_APPLICATIONS = [
  {
    id: "app-1",
    jobTitle: "Senior Frontend Engineer",
    companyName: "TechScale MENA",
    location: "Cairo, Egypt",
    workMode: "hybrid" as const,
    status: "screening" as const,
    appliedAt: "2026-04-10T09:00:00Z",
    matchScore: 87,
    stage: "Screening",
  },
  {
    id: "app-2",
    jobTitle: "Full Stack Developer",
    companyName: "CloudStar",
    location: "Remote",
    workMode: "remote" as const,
    status: "applied" as const,
    appliedAt: "2026-04-18T14:00:00Z",
    matchScore: 74,
    stage: "Applied",
  },
];

// Mock open jobs for the public jobs page
export const MOCK_PUBLIC_JOBS = [
  {
    id: "job-1",
    title: "Senior Frontend Engineer",
    company: "TechScale MENA",
    location: "Cairo, Egypt",
    workMode: "hybrid",
    salary: "$3,000 – $5,000 / mo",
    skills: ["React", "TypeScript", "Next.js"],
    level: "Senior",
    postedAt: "2026-04-20",
    applicants: 24,
  },
  {
    id: "job-2",
    title: "Backend Python Engineer",
    company: "DataPulse",
    location: "Remote",
    workMode: "remote",
    salary: "$2,500 – $4,000 / mo",
    skills: ["Python", "FastAPI", "PostgreSQL"],
    level: "Mid",
    postedAt: "2026-04-22",
    applicants: 18,
  },
  {
    id: "job-3",
    title: "DevOps Engineer",
    company: "CloudStar",
    location: "Dubai, UAE",
    workMode: "onsite",
    salary: "$4,000 – $6,000 / mo",
    skills: ["Kubernetes", "Terraform", "AWS"],
    level: "Senior",
    postedAt: "2026-04-23",
    applicants: 11,
  },
  {
    id: "job-4",
    title: "Product Designer",
    company: "UX Studio",
    location: "Cairo, Egypt",
    workMode: "hybrid",
    salary: "$2,000 – $3,500 / mo",
    skills: ["Figma", "User Research", "Prototyping"],
    level: "Mid",
    postedAt: "2026-04-24",
    applicants: 31,
  },
  {
    id: "job-5",
    title: "ML Engineer",
    company: "AI Foundry",
    location: "Remote",
    workMode: "remote",
    salary: "$4,500 – $7,000 / mo",
    skills: ["Python", "PyTorch", "LangChain"],
    level: "Senior",
    postedAt: "2026-04-25",
    applicants: 9,
  },
  {
    id: "job-6",
    title: "Fullstack Engineer (React + Node)",
    company: "Fintech Hub",
    location: "Cairo, Egypt",
    workMode: "hybrid",
    salary: "$2,800 – $4,500 / mo",
    skills: ["React", "Node.js", "PostgreSQL"],
    level: "Mid",
    postedAt: "2026-04-25",
    applicants: 42,
  },
];
