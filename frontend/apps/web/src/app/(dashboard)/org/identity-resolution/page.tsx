"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  GitMerge, Loader2, CheckCircle2, XCircle, Clock,
  ShieldCheck, ShieldX, AlertTriangle, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils/cn";
import {
  useScanDuplicates, useDuplicates, useApproveMerge,
  useRejectMerge, useMergeHistory,
} from "@/lib/hooks";
import type { BackendDuplicateOut, BackendMergeHistoryOut } from "@/lib/api";

const statusColors: Record<string, string> = {
  pending: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  approved: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  rejected: "text-red-400 border-red-400/30 bg-red-400/10",
  merged: "text-blue-400 border-blue-400/30 bg-blue-400/10",
};

const confidenceColor = (c: number): string => {
  if (c >= 0.9) return "text-emerald-400";
  if (c >= 0.7) return "text-amber-400";
  return "text-red-400";
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemAnim = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

function DuplicateCard({
  dup,
  onApprove,
  onReject,
  approving,
  rejecting,
}: {
  dup: BackendDuplicateOut;
  onApprove: (notes: string) => void;
  onReject: (notes: string) => void;
  approving: boolean;
  rejecting: boolean;
}) {
  const [notes, setNotes] = useState("");

  return (
    <motion.div
      variants={itemAnim}
      className="glass gradient-border rounded-2xl p-5 space-y-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground truncate" title={dup.candidate_id_a}>
              {dup.candidate_id_a.slice(0, 8)}...
            </span>
            <span className="text-xs text-muted-foreground">⟷</span>
            <span className="text-xs font-mono text-muted-foreground truncate" title={dup.candidate_id_b}>
              {dup.candidate_id_b.slice(0, 8)}...
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm font-medium text-foreground capitalize">{dup.match_reason.replace(/_/g, " ")} match</p>
            <Badge variant="outline" className={cn("text-[10px]", statusColors[dup.status] ?? "text-muted-foreground")}>
              {dup.status}
            </Badge>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={cn("text-lg font-bold tabular-nums", confidenceColor(dup.confidence))}>
            {Math.round(dup.confidence * 100)}%
          </p>
          <p className="text-[10px] text-muted-foreground">confidence</p>
        </div>
      </div>

      <div className="glass rounded-xl px-3 py-2">
        <p className="text-[11px] text-muted-foreground">Shared value</p>
        <p className="text-sm font-mono text-foreground break-all">{dup.match_value}</p>
      </div>

      {dup.status === "pending" && (
        <div className="space-y-3 pt-1">
          <textarea
            placeholder="Reviewer notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => onApprove(notes)}
              disabled={approving}
              className="flex-1"
            >
              {approving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              Approve & Merge
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReject(notes)}
              disabled={rejecting}
              className="flex-1"
            >
              {rejecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
              Reject
            </Button>
          </div>
        </div>
      )}

      {dup.notes && dup.status !== "pending" && (
        <div className="glass rounded-xl px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Reviewer notes</p>
          <p className="text-sm text-foreground">{dup.notes}</p>
        </div>
      )}
    </motion.div>
  );
}

function DuplicatesTab() {
  const scan = useScanDuplicates();
  const { data, isLoading, isError, error, refetch } = useDuplicates();
  const approve = useApproveMerge();
  const reject = useRejectMerge();
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const handleScan = () => {
    setScanResult(null);
    setScanError(null);
    scan.mutate(undefined, {
      onSuccess: (res) => {
        setScanResult(`Scan complete — ${res.new_duplicates_found} new duplicate(s) found.`);
      },
      onError: (e) => {
        setScanError(e instanceof Error ? e.message : "Scan failed");
      },
    });
  };

  const handleApprove = (dupId: string, notes: string) => {
    approve.mutate({ id: dupId, notes: notes || undefined });
  };

  const handleReject = (dupId: string, notes: string) => {
    reject.mutate({ id: dupId, notes: notes || undefined });
  };

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button
          onClick={handleScan}
          disabled={scan.isPending}
          className="shrink-0"
        >
          {scan.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Scan for Duplicates
        </Button>
        <div className="flex-1 min-w-0">
          {scanResult && (
            <motion.p
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-sm text-emerald-400"
            >
              {scanResult}
            </motion.p>
          )}
          {scanError && (
            <motion.p
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-sm text-red-400"
            >
              {scanError}
            </motion.p>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading duplicates…
        </div>
      )}

      {isError && (
        <div className="glass rounded-xl p-6 text-center space-y-3 border border-red-500/30 bg-red-500/5">
          <ShieldX className="h-8 w-8 mx-auto text-red-400" />
          <p className="text-sm text-red-400">{error instanceof Error ? error.message : "Failed to load duplicates"}</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <div className="glass rounded-xl p-12 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No duplicate candidates detected. Run a scan to check for potential duplicates.
          </p>
        </div>
      )}

      {!isLoading && !isError && items.length > 0 && (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4"
        >
          {items.map((dup) => (
            <DuplicateCard
              key={dup.id}
              dup={dup}
              onApprove={(notes) => handleApprove(dup.id, notes)}
              onReject={(notes) => handleReject(dup.id, notes)}
              approving={approve.isPending && approve.variables?.id === dup.id}
              rejecting={reject.isPending && reject.variables?.id === dup.id}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}

function MergeHistoryTab() {
  const { data, isLoading, isError, error, refetch } = useMergeHistory();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading merge history…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="glass rounded-xl p-6 text-center space-y-3 border border-red-500/30 bg-red-500/5">
        <ShieldX className="h-8 w-8 mx-auto text-red-400" />
        <p className="text-sm text-red-400">{error instanceof Error ? error.message : "Failed to load merge history"}</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  const items = data?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="glass rounded-xl p-12 text-center space-y-3">
        <Clock className="h-8 w-8 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No merge history yet.</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60">
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Kept Candidate</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Removed Candidate</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Merged By</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Reason</th>
            </tr>
          </thead>
          <tbody>
            {items.map((m: BackendMergeHistoryOut) => (
              <tr key={m.id} className="border-b border-border/30 hover:bg-sidebar-accent/30 transition-colors">
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {m.merged_at ? new Date(m.merged_at).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-foreground">
                  {m.kept_candidate_id.slice(0, 8)}...
                </td>
                <td className="px-4 py-3 font-mono text-xs text-foreground">
                  {m.removed_candidate_id.slice(0, 8)}...
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {m.merged_by.slice(0, 8)}...
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                  {m.merge_reason ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function IdentityResolutionPage() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <GitMerge className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
              Identity Resolution
            </h1>
            <p className="text-sm text-muted-foreground">
              Detect duplicate candidate records and propose safe merges with human approval.
            </p>
          </div>
        </motion.div>

        <Tabs defaultValue="duplicates" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="duplicates" className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5" /> Duplicates
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" /> Merge History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="duplicates">
            <DuplicatesTab />
          </TabsContent>

          <TabsContent value="history">
            <MergeHistoryTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
