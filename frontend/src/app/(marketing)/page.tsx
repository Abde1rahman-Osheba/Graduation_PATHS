"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Shield, Sparkles, Users2 } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { GlossCard } from "@/components/ui/gloss-card";
import { fadeInUp, staggerContainer } from "@/components/motion/variants";
import { HeroIllustration } from "@/components/illustrations/hero-illustration";
import { AIScreeningGraphic } from "@/components/illustrations/ai-screening-graphic";
import { WorkflowStepsGraphic } from "@/components/illustrations/workflow-steps-graphic";

export default function MarketingHomePage() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.22),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(168,85,247,0.18),transparent_55%)]" />
        <Container className="relative grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-20">
          <div>
            <motion.p
              className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300/90"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              PATHS — AI hiring platform
            </motion.p>
            <motion.h1
              className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              Hire faster with{" "}
              <span className="bg-gradient-to-r from-sky-300 via-violet-300 to-emerald-300 bg-clip-text text-transparent">
                evidence-first
              </span>{" "}
              screening and human review.
            </motion.h1>
            <motion.p
              className="mt-5 max-w-xl text-sm leading-relaxed text-zinc-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.12 }}
            >
              PATHS connects CV intelligence, ranked matching, interview intelligence, and decision support — with
              guardrails designed for real recruiting teams.
            </motion.p>
            <motion.div
              className="mt-8 flex flex-wrap gap-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
            >
              <Link href="/register/org">
                <Button className="!px-6">
                  Start hiring
                  <ArrowRight className="h-4 w-4 opacity-90" />
                </Button>
              </Link>
              <Link href="/register/candidate">
                <Button variant="ghost" className="!px-6">
                  I’m a candidate
                </Button>
              </Link>
              <Link href="/product">
                <Button variant="ghost" className="!px-6">
                  See the product
                </Button>
              </Link>
            </motion.div>
            <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
              {[
                { k: "Time-to-shortlist", v: "Hours, not weeks" },
                { k: "Explainability", v: "Structured signals" },
                { k: "Human gates", v: "Approvals built-in" },
              ].map((s) => (
                <div key={s.k} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{s.k}</p>
                  <p className="mt-1 text-sm font-medium text-zinc-100">{s.v}</p>
                </div>
              ))}
            </div>
          </div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <HeroIllustration className="w-full drop-shadow-2xl" />
          </motion.div>
        </Container>
      </section>

      <section className="border-b border-white/[0.06] bg-zinc-950/40 py-16">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight">Built for recruiter efficiency</h2>
            <p className="mt-3 text-sm text-zinc-400">
              Reduce context switching: one workspace for sourcing signals, screening, interviews, and decisions —
              aligned to how hiring teams actually work.
            </p>
          </div>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.25 }}
            className="mt-10 grid gap-4 md:grid-cols-3"
          >
            {[
              {
                title: "Ranked shortlists",
                desc: "Move from job spec to anonymized shortlist with clear ranking rationale.",
                icon: Users2,
              },
              {
                title: "AI screening",
                desc: "Score candidates against active roles with structured outputs you can defend.",
                icon: Sparkles,
              },
              {
                title: "Human review",
                desc: "Keep consequential transitions gated — approvals are part of the workflow, not an afterthought.",
                icon: Shield,
              },
            ].map((f, i) => (
              <motion.div key={f.title} custom={i} variants={fadeInUp}>
                <GlossCard className="h-full">
                  <f.icon className="h-5 w-5 text-sky-300" />
                  <h3 className="mt-3 text-base font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-zinc-500">{f.desc}</p>
                </GlossCard>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </section>

      <section className="py-16">
        <Container className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">How PATHS works</h2>
            <p className="mt-3 text-sm text-zinc-400">
              A practical loop: ingest signals, evaluate with guardrails, collaborate with stakeholders, and ship a
              decision record you can audit later.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-zinc-300">
              {[
                "Ingest candidate evidence (CV today; more sources as you expand).",
                "Generate explainable match signals against real jobs in your database.",
                "Run interview intelligence workflows when your org enables them.",
                "Produce decision support packets for structured HR decisions.",
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300/80" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <WorkflowStepsGraphic className="w-full" />
        </Container>
      </section>

      <section className="border-y border-white/[0.06] bg-zinc-950/40 py-16">
        <Container className="grid items-center gap-10 lg:grid-cols-2">
          <AIScreeningGraphic className="w-full" />
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">AI-assisted screening — without theater</h2>
            <p className="mt-3 text-sm text-zinc-400">
              PATHS is designed around explainable outputs: scores, classifications, and artifacts you can review — not
              a black-box “trust me” panel.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <GlossCard>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">For recruiters</p>
                <p className="mt-2 text-sm text-zinc-300">Faster triage, clearer next actions, fewer repetitive screens.</p>
              </GlossCard>
              <GlossCard>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">For candidates</p>
                <p className="mt-2 text-sm text-zinc-300">A modern onboarding path and transparent progress signals.</p>
              </GlossCard>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Ready to run your first shortlist?</h2>
            <p className="mt-2 max-w-xl text-sm text-zinc-400">
              Create an organization workspace, connect your backend environment, and start matching against your
              candidate pool.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/login">
              <Button variant="ghost" className="!px-5">
                Sign in
              </Button>
            </Link>
            <Link href="/register/org">
              <Button className="!px-6">
                Create org workspace
                <ArrowRight className="h-4 w-4 opacity-90" />
              </Button>
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}
