import Link from "next/link";
import { Container } from "@/components/layout/container";
import { GlossCard } from "@/components/ui/gloss-card";
import { Button } from "@/components/ui/button";
import { SAMPLE_JOBS } from "@/mocks/sample-jobs";

export default function CareersPage() {
  return (
    <Container className="py-16">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300/90">Careers</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Explore roles at PATHS (sample UI)</h1>
        <p className="mt-4 text-sm leading-relaxed text-zinc-400">
          These listings are intentionally mocked for marketing presentation. Public job discovery APIs are not wired in
          this repository yet — candidate apply flows start with account creation.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100/90">
        Sample data only — not connected to your production database.
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {SAMPLE_JOBS.map((job) => (
          <GlossCard key={job.id} className="h-full">
            <p className="text-xs font-mono text-zinc-500">{job.id}</p>
            <h2 className="mt-2 text-base font-semibold">{job.title}</h2>
            <p className="mt-2 text-xs text-zinc-500">
              {job.location} · {job.employment}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-zinc-300">
              {job.highlights.map((h) => (
                <li key={h} className="rounded-lg bg-black/20 px-3 py-2 text-xs text-zinc-200">
                  {h}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <Link href="/register/candidate">
                <Button className="w-full">Create candidate account</Button>
              </Link>
            </div>
          </GlossCard>
        ))}
      </div>
    </Container>
  );
}
