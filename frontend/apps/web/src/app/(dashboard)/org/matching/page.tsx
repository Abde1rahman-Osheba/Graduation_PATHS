"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useOrgDatabaseSearch } from "@/lib/hooks";

export default function OrgMatchingPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const orgId = user?.orgId ?? "";
  const searchMutation = useOrgDatabaseSearch();

  const [title, setTitle] = useState("Senior Backend Engineer");
  const [summary, setSummary] = useState("");
  const [requiredSkills, setRequiredSkills] = useState("Python, PostgreSQL, FastAPI");
  const [topK, setTopK] = useState(5);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setErr(null);
    const skills = requiredSkills
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);

    searchMutation.mutate(
      {
        organization_id: orgId,
        top_k: topK,
        job: {
          title,
          description: summary || undefined,
          required_skills: skills,
          nice_to_have_skills: [],
        },
      },
      {
        onSuccess: (data) => {
          const runId = data.matching_run_id ?? data.id;
          if (runId) {
            router.push(`/org/runs/${runId}`);
          } else {
            setErr("No run ID returned from search.");
          }
        },
        onError: (e) => {
          setErr(e instanceof Error ? e.message : "Match failed");
        },
      },
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-lg p-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Search className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
              Database search
            </h1>
            <p className="text-sm text-muted-foreground">
              Ranked shortlist with anonymised preview.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass gradient-border rounded-2xl p-6"
        >
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-foreground">Job title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-foreground">Summary (optional)</label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-foreground">
                Required skills (comma-separated)
              </label>
              <Input
                value={requiredSkills}
                onChange={(e) => setRequiredSkills(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-foreground">Top K</label>
              <Input
                type="number"
                min={1}
                max={20}
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
              />
            </div>
            {err && <p className="text-sm text-red-400">{err}</p>}
            <Button type="submit" className="w-full" disabled={searchMutation.isPending}>
              {searchMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running…
                </>
              ) : (
                "Run search"
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
