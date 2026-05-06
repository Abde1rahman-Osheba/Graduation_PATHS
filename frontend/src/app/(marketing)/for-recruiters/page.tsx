import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { GlossCard } from "@/components/ui/gloss-card";
import { WorkflowStepsGraphic } from "@/components/illustrations/workflow-steps-graphic";

export default function ForRecruitersPage() {
  return (
    <Container className="py-16">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300/90">Recruiters</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Efficiency-first hiring workflows</h1>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            PATHS is structured around the work recruiters repeat every week: triage, evidence review, stakeholder
            alignment, and decision documentation — with AI acceleration where it actually helps.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            <Link href="/register/org">
              <Button className="!px-6">Create organization workspace</Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" className="!px-6">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
        <WorkflowStepsGraphic className="w-full" />
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        <GlossCard>
          <h2 className="text-base font-semibold">Shortlist velocity</h2>
          <p className="mt-2 text-sm text-zinc-500">Move from job spec to ranked candidates with a reviewable artifact.</p>
        </GlossCard>
        <GlossCard>
          <h2 className="text-base font-semibold">Interview intelligence</h2>
          <p className="mt-2 text-sm text-zinc-500">Operational tools for availability and structured summaries.</p>
        </GlossCard>
        <GlossCard>
          <h2 className="text-base font-semibold">Decision support</h2>
          <p className="mt-2 text-sm text-zinc-500">Generate explainable packets tied to real application context.</p>
        </GlossCard>
      </div>
    </Container>
  );
}
