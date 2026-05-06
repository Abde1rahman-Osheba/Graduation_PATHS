import Link from "next/link";
import { Container } from "@/components/layout/container";

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-zinc-950/40 py-12">
      <Container className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-100">PATHS</p>
          <p className="mt-2 max-w-md text-sm text-zinc-500">
            Evidence-first hiring workflows: screening, interviews, and decision support — with human review at the
            center.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm text-zinc-400">
          <Link className="hover:text-zinc-200" href="/for-candidates">
            Candidate journey
          </Link>
          <Link className="hover:text-zinc-200" href="/for-recruiters">
            Recruiter journey
          </Link>
          <Link className="hover:text-zinc-200" href="/login">
            Sign in
          </Link>
        </div>
      </Container>
      <Container className="mt-10 text-xs text-zinc-600">© {new Date().getFullYear()} PATHS</Container>
    </footer>
  );
}
