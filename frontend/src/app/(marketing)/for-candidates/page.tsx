import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { GlossCard } from "@/components/ui/gloss-card";

export default function ForCandidatesPage() {
  return (
    <Container className="py-16">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300/90">Candidates</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">A modern candidate experience</h1>
        <p className="mt-4 text-sm leading-relaxed text-zinc-400">
          Start with a polished onboarding path, upload your CV, and track processing with clear status — then explore
          role matches powered by your profile signals.
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          <Link href="/register/candidate">
            <Button className="!px-6">Create candidate account</Button>
          </Link>
          <Link href="/login">
            <Button variant="ghost" className="!px-6">
              Sign in
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        <GlossCard>
          <h2 className="text-base font-semibold">Guided onboarding</h2>
          <p className="mt-2 text-sm text-zinc-500">Pick a path (CV first today; more integrations as the platform expands).</p>
        </GlossCard>
        <GlossCard>
          <h2 className="text-base font-semibold">Transparent processing</h2>
          <p className="mt-2 text-sm text-zinc-500">See ingestion stages and errors without digging through logs.</p>
        </GlossCard>
        <GlossCard>
          <h2 className="text-base font-semibold">Match exploration</h2>
          <p className="mt-2 text-sm text-zinc-500">Understand role fit with structured scoring outputs.</p>
        </GlossCard>
      </div>
    </Container>
  );
}
