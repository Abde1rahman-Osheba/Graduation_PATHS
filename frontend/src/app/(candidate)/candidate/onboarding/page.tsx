"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { GlossCard } from "@/components/ui/gloss-card";
import { Button } from "@/components/ui/button";
import { useMe } from "@/components/auth/me-provider";
import { LoadingState } from "@/components/states/loading-state";
import { ErrorState } from "@/components/states/error-state";
import { EmptyStateIllustration } from "@/components/illustrations/empty-state-illustration";
import { Link2, Code2, PenLine, UploadCloud } from "lucide-react";

export default function CandidateOnboardingPage() {
  const router = useRouter();
  const { user, loading, error, refresh } = useMe();

  useEffect(() => {
    if (loading) return;
    if (user && user.account_type !== "candidate") router.replace("/org");
  }, [user, loading, router]);

  if (loading) return <LoadingState label="Loading onboarding…" />;
  if (error) return <ErrorState title="Could not load your account" message={error} onRetry={() => refresh()} />;
  if (!user) return <LoadingState label="Loading session…" />;
  if (user.account_type !== "candidate") return <LoadingState label="Redirecting…" />;

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Welcome — let’s set you up</h1>
          <p className="mt-3 text-sm text-zinc-400">
            Start with CV upload (live today). Additional onboarding channels are scaffolded behind clear “coming soon”
            states so we never ship dead integrations.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/candidate">
              <Button className="!px-6">Go to dashboard</Button>
            </Link>
            <Link href="/candidate/profile">
              <Button variant="ghost" className="!px-6">
                Review profile
              </Button>
            </Link>
          </div>
        </div>
        <EmptyStateIllustration className="w-full max-w-md justify-self-end" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <GlossCard glow className="h-full">
          <div className="flex items-center gap-2 text-sky-300">
            <UploadCloud className="h-4 w-4" />
            <h2 className="text-sm font-semibold uppercase tracking-wider">Upload CV</h2>
          </div>
          <p className="mt-3 text-sm text-zinc-400">Fastest path to scoring against active jobs in your environment.</p>
          <Link href="/candidate" className="mt-5 inline-block">
            <Button className="w-full">Continue</Button>
          </Link>
        </GlossCard>

        <GlossCard className="h-full opacity-70">
          <div className="flex items-center gap-2 text-zinc-400">
            <Link2 className="h-4 w-4" />
            <h2 className="text-sm font-semibold uppercase tracking-wider">LinkedIn import</h2>
          </div>
          <p className="mt-3 text-sm text-zinc-500">Not connected yet — requires backend ingestion endpoints + consent UX.</p>
          <Button type="button" className="mt-5 w-full" disabled>
            Coming soon
          </Button>
        </GlossCard>

        <GlossCard className="h-full opacity-70">
          <div className="flex items-center gap-2 text-zinc-400">
            <Code2 className="h-4 w-4" />
            <h2 className="text-sm font-semibold uppercase tracking-wider">GitHub signals</h2>
          </div>
          <p className="mt-3 text-sm text-zinc-500">Planned: portfolio signals with provenance and evidence-backed summaries.</p>
          <Button type="button" className="mt-5 w-full" disabled>
            Coming soon
          </Button>
        </GlossCard>

        <GlossCard glow className="h-full">
          <div className="flex items-center gap-2 text-emerald-300">
            <PenLine className="h-4 w-4" />
            <h2 className="text-sm font-semibold uppercase tracking-wider">Manual profile</h2>
          </div>
          <p className="mt-3 text-sm text-zinc-400">Now live: complete your profile with skills, experience, and job preferences.</p>
          <Link href="/candidate/profile" className="mt-5 inline-block w-full">
            <Button type="button" className="w-full">
              Complete profile
            </Button>
          </Link>
        </GlossCard>
      </div>
    </div>
  );
}
