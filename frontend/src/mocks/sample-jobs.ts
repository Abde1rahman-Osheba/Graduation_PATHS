export type SampleJob = {
  id: string;
  title: string;
  location: string;
  employment: string;
  highlights: string[];
};

export const SAMPLE_JOBS: SampleJob[] = [
  {
    id: "sample-job-001",
    title: "Staff Backend Engineer — Platform",
    location: "Remote (EU timezones)",
    employment: "Full-time",
    highlights: ["Python", "PostgreSQL", "Distributed systems", "LLM-adjacent tooling"],
  },
  {
    id: "sample-job-002",
    title: "Product Engineer — Hiring workflows",
    location: "Hybrid — Cairo",
    employment: "Full-time",
    highlights: ["Next.js", "TypeScript", "Design systems", "B2B SaaS"],
  },
  {
    id: "sample-job-003",
    title: "ML Engineer — Ranking & explanations",
    location: "Remote",
    employment: "Full-time",
    highlights: ["Retrieval", "Evals", "Guardrails", "Observability"],
  },
];
