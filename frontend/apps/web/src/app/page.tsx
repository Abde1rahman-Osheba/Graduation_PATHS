"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import {
  Zap, Brain, Shield, Users, ChevronRight, ArrowRight,
  CheckCircle2, Star, Upload, Link2, BarChart3, Search,
  Clock, Award, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { cn } from "@/lib/utils/cn";

const stats = [
  { value: "15", label: "AI Agents", icon: Brain },
  { value: "87%", label: "Bias Reduction", icon: Shield },
  { value: "10×", label: "Faster Screening", icon: Clock },
  { value: "100%", label: "Audit Trail", icon: Award },
];

const howItWorks = [
  {
    step: "01",
    title: "Build your profile once",
    description: "Upload your CV, add your skills, GitHub, LinkedIn and portfolio. PATHS extracts and organizes everything automatically.",
    icon: Upload,
    color: "text-primary bg-primary/10 border-primary/20",
  },
  {
    step: "02",
    title: "AI matches you to jobs",
    description: "15 specialized AI agents analyze your profile against live job requirements — transparently, with evidence for every score.",
    icon: Brain,
    color: "text-teal-400 bg-teal-500/10 border-teal-500/20",
  },
  {
    step: "03",
    title: "Fair, anonymous screening",
    description: "Recruiters evaluate your skills and experience — not your name, photo, or address. Bias is reduced by design.",
    icon: Shield,
    color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  },
  {
    step: "04",
    title: "Human makes the final call",
    description: "Every AI recommendation is reviewed by a human before action. You are never rejected by an algorithm alone.",
    icon: Users,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
];

const candidateFeatures = [
  { icon: Upload,   title: "CV Upload & Extraction",    desc: "Upload once. AI extracts your full profile automatically." },
  { icon: Link2,    title: "LinkedIn & GitHub",         desc: "Connect your professional presence in seconds." },
  { icon: Search,   title: "Smart Job Matching",        desc: "Get matched to roles that actually fit your skills." },
  { icon: Shield,   title: "Anonymous Screening",       desc: "Your skills speak — your name stays private during scoring." },
  { icon: BarChart3,title: "Transparent Scores",        desc: "See why you scored the way you did, backed by evidence." },
  { icon: Globe,    title: "Apply Globally",            desc: "One profile, multiple companies. No re-entering data." },
];

const companyFeatures = [
  "15 specialized AI agents for CV parsing, scoring, and ranking",
  "Anonymized screening eliminates name, gender, and age bias",
  "Full audit trail for every hiring decision",
  "Human-in-the-loop approvals before shortlists are released",
  "Evidence-based scoring — every claim traceable to source",
  "Integrates with your existing ATS and HR tools",
];

const testimonials = [
  {
    quote: "PATHS cut our time-to-shortlist from 3 weeks to 2 days. The evidence-based scoring gives our hiring managers confidence they've never had before.",
    author: "Head of Talent", company: "TechScale MENA", rating: 5,
  },
  {
    quote: "I submitted my profile once and got matched to 4 relevant roles. I loved that I could see exactly why I scored well on each one.",
    author: "Senior Backend Engineer", company: "Hired via PATHS", rating: 5,
  },
];

function FadeIn({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNav />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 pb-24 pt-20 sm:pt-32">
        {/* Background orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 top-0 h-[600px] w-[600px] rounded-full bg-primary/6 blur-[120px]" />
          <div className="absolute -right-40 top-40 h-[500px] w-[500px] rounded-full bg-teal-glow/5 blur-[100px]" />
          <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/4 blur-[80px]" />
        </div>

        <div className="relative mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="outline" className="mb-6 gap-1.5 border-primary/25 bg-primary/8 text-primary px-4 py-1.5">
              <Zap className="h-3.5 w-3.5" />
              Powered by 15 Specialized AI Agents
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="font-heading text-5xl font-bold leading-[1.12] tracking-tight text-foreground sm:text-6xl md:text-7xl"
          >
            Hire the right people,
            <br />
            <span className="gradient-text">faster — with evidence.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16 }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground"
          >
            PATHS is an AI-driven hiring OS that reduces bias, explains every decision,
            and keeps humans in control. Candidates build one profile. Companies find
            the right fit — fairly, transparently, and fast.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24 }}
            className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
          >
            <Button size="lg" className="h-12 gap-2 px-8 text-base font-semibold glow-blue" asChild>
              <Link href="/candidate-signup">
                Create Your Profile <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 gap-2 px-8 text-base" asChild>
              <Link href="/for-companies">
                For Companies <ChevronRight className="h-5 w-5" />
              </Link>
            </Button>
          </motion.div>

          {/* Floating stat badges */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.36 }}
            className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4"
          >
            {stats.map(({ value, label, icon: Icon }) => (
              <div key={label} className="glass gradient-border rounded-2xl p-5 text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <p className="font-heading text-2xl font-bold text-foreground">{value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <FadeIn className="mb-16 text-center">
            <Badge variant="outline" className="mb-4 border-primary/20 bg-primary/8 text-primary">How it works</Badge>
            <h2 className="font-heading text-4xl font-bold tracking-tight text-foreground">
              Fair hiring in four steps
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              From profile creation to final decision — transparent, evidence-backed, and always human-approved.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {howItWorks.map((item, i) => (
              <FadeIn key={item.step} delay={i * 0.08}>
                <div className="glass gradient-border relative h-full rounded-2xl p-6">
                  <div className={cn("mb-4 flex h-11 w-11 items-center justify-center rounded-xl border", item.color)}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-[11px] font-bold text-muted-foreground/50">{item.step}</span>
                  <h3 className="mt-1 font-heading text-[15px] font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{item.description}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn className="mt-10 text-center" delay={0.2}>
            <Link href="/how-it-works" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
              See the full process <ChevronRight className="h-4 w-4" />
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* ── For candidates ───────────────────────────────────────────────── */}
      <section className="bg-navy-900/40 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
            <FadeIn>
              <Badge variant="outline" className="mb-4 border-teal-500/25 bg-teal-500/8 text-teal-400">For Candidates</Badge>
              <h2 className="font-heading text-4xl font-bold tracking-tight text-foreground">
                Build once.
                <br />
                <span className="gradient-text">Apply everywhere.</span>
              </h2>
              <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
                Create a single, rich profile with your CV, skills, GitHub, and portfolio.
                PATHS matches you to roles across multiple companies — and you always know
                exactly why.
              </p>
              <Button className="mt-8 gap-2 glow-blue" size="lg" asChild>
                <Link href="/candidate-signup">Start your profile <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </FadeIn>

            <div className="grid grid-cols-2 gap-4">
              {candidateFeatures.map((f, i) => (
                <FadeIn key={f.title} delay={i * 0.06}>
                  <div className="glass rounded-xl p-4 h-full">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <f.icon className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-[13px] font-semibold text-foreground">{f.title}</p>
                    <p className="mt-1 text-[12px] text-muted-foreground">{f.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── For companies ────────────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
            <div className="order-2 lg:order-1">
              <div className="glass gradient-border rounded-2xl p-8 space-y-3">
                {companyFeatures.map((f) => (
                  <div key={f} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <p className="text-[13px] text-muted-foreground">{f}</p>
                  </div>
                ))}
              </div>
            </div>

            <FadeIn className="order-1 lg:order-2">
              <Badge variant="outline" className="mb-4 border-primary/25 bg-primary/8 text-primary">For Companies</Badge>
              <h2 className="font-heading text-4xl font-bold tracking-tight text-foreground">
                Hire with evidence,
                <br />
                <span className="gradient-text">not guesswork.</span>
              </h2>
              <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
                PATHS gives your team an unfair advantage — AI does the heavy lifting,
                bias guardrails keep it fair, and humans make every final call.
              </p>
              <Button variant="outline" className="mt-8 gap-2" size="lg" asChild>
                <Link href="/for-companies">Learn more <ChevronRight className="h-4 w-4" /></Link>
              </Button>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────── */}
      <section className="bg-navy-900/40 px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <FadeIn className="mb-12 text-center">
            <h2 className="font-heading text-3xl font-bold text-foreground">Trusted by teams and candidates</h2>
          </FadeIn>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {testimonials.map((t, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div className="glass gradient-border h-full rounded-2xl p-6">
                  <div className="mb-4 flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-[14px] leading-relaxed text-foreground">"{t.quote}"</p>
                  <div className="mt-5 border-t border-border/40 pt-4">
                    <p className="text-[13px] font-semibold text-foreground">{t.author}</p>
                    <p className="text-[12px] text-muted-foreground">{t.company}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <FadeIn>
            <h2 className="font-heading text-5xl font-bold tracking-tight text-foreground">
              Ready to find your
              <br />
              <span className="gradient-text">next great hire?</span>
            </h2>
            <p className="mx-auto mt-6 max-w-lg text-lg text-muted-foreground">
              Whether you're a candidate building your career or a company scaling your team —
              PATHS makes hiring transparent, fair, and fast.
            </p>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" className="h-12 gap-2 px-8 text-base font-semibold glow-blue" asChild>
                <Link href="/candidate-signup">Create Candidate Profile</Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 gap-2 px-8 text-base" asChild>
                <Link href="/company-signup">Create Company Account</Link>
              </Button>
            </div>
          </FadeIn>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
