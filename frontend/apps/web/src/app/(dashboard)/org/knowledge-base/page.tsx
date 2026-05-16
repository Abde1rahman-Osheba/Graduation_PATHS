"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Database, Loader2, AlertCircle, CheckCircle2, Circle,
  Layers, BarChart3, Search, BookOpen, FileText, Hash,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { useCollections, useSearchCollection } from "@/lib/hooks";
import type { BackendQdrantCollection, BackendVectorSearchHit } from "@/lib/api";

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

const statusConfig: Record<
  string,
  { icon: typeof CheckCircle2; color: string; label: string }
> = {
  green: { icon: CheckCircle2, color: "text-emerald-400", label: "Active" },
  yellow: { icon: AlertCircle, color: "text-amber-400", label: "Degraded" },
  red: { icon: AlertCircle, color: "text-red-400", label: "Error" },
  grey: { icon: Circle, color: "text-muted-foreground", label: "Unknown" },
};

function getStatusConfig(status: string | null | undefined) {
  if (!status) return statusConfig.grey;
  const s = status.toLowerCase();
  if (s === "green" || s === "active" || s === "healthy") return statusConfig.green;
  if (s === "yellow" || s === "degraded") return statusConfig.yellow;
  if (s === "red" || s === "error" || s === "unhealthy") return statusConfig.red;
  return statusConfig.grey;
}

function CollectionCard({
  collection,
  index,
}: {
  collection: BackendQdrantCollection;
  index: number;
}) {
  const cfg = getStatusConfig(collection.status);
  const StatusIcon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index }}
      className="glass rounded-xl p-5 space-y-3"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Layers className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-heading text-sm font-bold text-foreground truncate">
              {collection.name}
            </p>
            <p className="font-mono text-[10px] text-muted-foreground truncate">
              {collection.dimension != null
                ? `${collection.dimension}D`
                : "Dim unknown"}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "gap-1.5 text-[10px] shrink-0",
            cfg.color,
          )}
        >
          <StatusIcon className="h-3 w-3" />
          {cfg.label}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-muted/20 p-2.5 space-y-0.5">
          <p className="text-xs text-muted-foreground">Vectors</p>
          <p className="font-heading text-lg font-bold text-foreground">
            {formatNumber(collection.vectors_count)}
          </p>
        </div>
        <div className="rounded-lg bg-muted/20 p-2.5 space-y-0.5">
          <p className="text-xs text-muted-foreground">Dimension</p>
          <p className="font-heading text-lg font-bold text-foreground">
            {collection.dimension != null
              ? collection.dimension.toLocaleString()
              : "—"}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function KnowledgeBasePage() {
  const { data: collections = [], isLoading, isError } = useCollections();
  const searchMutation = useSearchCollection();

  // RAG test panel state
  const [searchCollection, setSearchCollection] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BackendVectorSearchHit[]>([]);

  const totalVectors = collections.reduce(
    (sum: number, c: BackendQdrantCollection) => sum + (c.vectors_count ?? 0),
    0,
  );
  const connectedCount = collections.filter(
    (c: BackendQdrantCollection) =>
      getStatusConfig(c.status).label === "Active",
  ).length;
  const isConnected = collections.length === 0 || connectedCount > 0;

  async function handleSearch() {
    if (!searchCollection || !searchQuery.trim()) return;
    const results = await searchMutation.mutateAsync({
      collectionName: searchCollection,
      query: searchQuery.trim(),
      limit: 5,
    });
    setSearchResults(results);
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-8 max-w-5xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Database className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
            Knowledge Base
          </h1>
          <p className="text-sm text-muted-foreground">
            Vector storage powered by Qdrant — collections, embeddings, and
            semantic search for the hiring pipeline.
          </p>
        </div>
      </motion.div>

      {/* ── Status summary cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
          className="glass rounded-xl p-4 space-y-1"
        >
          <p className="text-2xl font-bold text-foreground">
            {collections.length}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Layers className="h-3 w-3" /> Total collections
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="glass rounded-xl p-4 space-y-1"
        >
          <p className="text-2xl font-bold text-foreground">
            {formatNumber(totalVectors)}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <BarChart3 className="h-3 w-3" /> Total vectors
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.09 }}
          className="glass rounded-xl p-4 space-y-1"
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex h-2.5 w-2.5 rounded-full",
                isConnected ? "bg-emerald-400" : "bg-red-400",
              )}
            />
            <p className="text-sm font-semibold text-foreground">
              {isConnected ? "Connected" : "Disconnected"}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Qdrant database status
          </p>
        </motion.div>
      </div>

      {/* ── Loading state ───────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading collections…
        </div>
      )}

      {/* ── Error state ─────────────────────────────────────────────── */}
      {isError && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass gradient-border rounded-2xl p-6 text-center space-y-3"
        >
          <AlertCircle className="h-8 w-8 text-red-400 mx-auto" />
          <p className="text-sm font-medium text-foreground">
            Knowledge Base is not available
          </p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Verify that Qdrant is running and the backend API is configured.
          </p>
        </motion.div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────── */}
      {!isLoading && !isError && collections.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass gradient-border rounded-2xl p-8 text-center space-y-3"
        >
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-sm font-semibold text-foreground">
            No vector collections found
          </p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Knowledge Base is powered by Qdrant. Collections are created
            automatically when documents are ingested.
          </p>
        </motion.div>
      )}

      {/* ── Collections list ────────────────────────────────────────── */}
      {!isLoading && !isError && collections.length > 0 && (
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-2"
          >
            <Layers className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-wider text-foreground">
              Collections
            </h2>
            <Badge variant="outline" className="ml-auto text-[10px]">
              {collections.length}
            </Badge>
          </motion.div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {collections.map((c, i) => (
              <CollectionCard key={c.name} collection={c} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* ── RAG / Semantic search test panel ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass gradient-border rounded-2xl p-6 space-y-5"
      >
        {/* Panel header */}
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-wider text-foreground">
            Semantic Search &amp; RAG Test
          </h2>
          <Badge variant="outline" className="text-[10px] ml-auto">
            Live
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Enter a natural-language query. The backend embeds it with{" "}
          <code className="font-mono text-[10px] bg-muted/40 px-1 rounded">
            nomic-embed-text
          </code>{" "}
          and runs a cosine-similarity search against the selected Qdrant
          collection. Results include the score and stored payload.
        </p>

        {/* Controls */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Select
            value={searchCollection}
            onValueChange={setSearchCollection}
            disabled={collections.length === 0}
          >
            <SelectTrigger className="w-full sm:w-52" size="sm">
              <SelectValue placeholder="Select collection…" />
            </SelectTrigger>
            <SelectContent>
              {collections.map((c) => (
                <SelectItem key={c.name} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="e.g. Python machine learning engineer with NLP experience"
            className="flex-1 text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={searchMutation.isPending}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
          />
          <Button
            size="sm"
            onClick={handleSearch}
            disabled={
              !searchCollection ||
              !searchQuery.trim() ||
              searchMutation.isPending
            }
            className="gap-1.5"
          >
            {searchMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
            {searchMutation.isPending ? "Searching…" : "Search"}
          </Button>
        </div>

        {/* Error */}
        {searchMutation.isError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              {(searchMutation.error as Error)?.message ?? "Search failed"}
            </span>
          </div>
        )}

        {/* Results */}
        {searchResults.length > 0 && (
          <div className="space-y-3">
            <Separator />
            <p className="text-xs text-muted-foreground">
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}{" "}
              for &ldquo;{searchQuery}&rdquo;
            </p>
            <div className="space-y-2">
              {searchResults.map((hit, i) => {
                const text =
                  (hit.payload?.text as string) ||
                  (hit.payload?.content as string) ||
                  (hit.payload?.chunk_text as string) ||
                  null;
                const source =
                  (hit.payload?.source as string) ||
                  (hit.payload?.filename as string) ||
                  null;

                return (
                  <motion.div
                    key={hit.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * i }}
                    className="rounded-lg border border-border/60 bg-muted/10 p-3 space-y-2"
                  >
                    {/* Score + id row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Hash className="h-3 w-3 text-muted-foreground" />
                        <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[160px]">
                          {hit.id}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] shrink-0",
                          hit.score >= 0.8
                            ? "text-emerald-400 border-emerald-500/30"
                            : hit.score >= 0.5
                            ? "text-amber-400 border-amber-500/30"
                            : "text-muted-foreground",
                        )}
                      >
                        score {hit.score.toFixed(4)}
                      </Badge>
                    </div>

                    {/* Source */}
                    {source && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {source}
                      </p>
                    )}

                    {/* Text snippet */}
                    {text ? (
                      <p className="text-xs leading-relaxed line-clamp-4">
                        {text}
                      </p>
                    ) : (
                      <pre className="text-[10px] text-muted-foreground overflow-x-auto whitespace-pre-wrap break-words">
                        {JSON.stringify(hit.payload, null, 2)}
                      </pre>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state after a successful search */}
        {!searchMutation.isPending &&
          searchMutation.isSuccess &&
          searchResults.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              No results found. Try a different query or check that the
              collection has ingested documents.
            </p>
          )}
      </motion.div>
    </div>
  );
}
