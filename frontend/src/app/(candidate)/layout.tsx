import { CandidateShell } from "@/components/layout/candidate-shell";

export default function CandidateGroupLayout({ children }: { children: React.ReactNode }) {
  return <CandidateShell>{children}</CandidateShell>;
}
