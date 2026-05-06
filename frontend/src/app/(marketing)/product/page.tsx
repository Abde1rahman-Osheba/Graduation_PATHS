import Link from "next/link";
import { Container } from "@/components/layout/container";
import { GlossCard } from "@/components/ui/gloss-card";
import { Button } from "@/components/ui/button";
import { AIScreeningGraphic } from "@/components/illustrations/ai-screening-graphic";

export default function ProductPage() {
  return (
    <div className="border-b border-white/[0.06]">
      <Container className="py-16">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300/90">Product</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">A hiring console designed for speed</h1>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            PATHS focuses on the recruiter-critical loop: intake → match → interview signals → decision artifacts. The
            UI is optimized to reduce repetitive work and keep stakeholders aligned.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            <Link href="/register/org">
              <Button className="!px-6">Create workspace</Button>
            </Link>
            <Link href="/for-recruiters">
              <Button variant="ghost" className="!px-6">
                Recruiter journey
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {[
            {
              title: "Operational clarity",
              body: "Dashboard-first navigation: jobs, matching, interviews, and decision support in one shell.",
            },
            {
              title: "Guardrailed automation",
              body: "AI assists with structured outputs; humans stay in control for consequential transitions.",
            },
            {
              title: "Integration-first",
              body: "Built against real FastAPI modules today, with room to grow toward the blueprint surface area.",
            },
          ].map((c) => (
            <GlossCard key={c.title} className="h-full">
              <h2 className="text-base font-semibold">{c.title}</h2>
              <p className="mt-2 text-sm text-zinc-500">{c.body}</p>
            </GlossCard>
          ))}
        </div>

        <div className="mt-12">
          <AIScreeningGraphic className="w-full max-w-3xl" />
        </div>
      </Container>
    </div>
  );
}
