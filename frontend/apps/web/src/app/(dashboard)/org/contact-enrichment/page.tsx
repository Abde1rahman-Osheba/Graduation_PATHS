"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Contact, Loader2, CheckCircle2, XCircle, Clock,
  AlertCircle, Mail, Phone, Link2, Code, Globe,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import {
  useContactEnrichmentStatus,
  useEnrichedContacts,
  useApproveContact,
  useRejectContact,
} from "@/lib/hooks";
import type { BackendEnrichedContactOut } from "@/lib/api";

const typeIcon: Record<string, typeof Mail> = {
  email: Mail,
  phone: Phone,
  linkedin: Link2,
  github: Code,
  portfolio: Globe,
};

const typeColor: Record<string, string> = {
  email: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  phone: "bg-green-500/10 text-green-400 border-green-500/30",
  linkedin: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  github: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  portfolio: "bg-amber-500/10 text-amber-400 border-amber-500/30",
};

const statusConfig: Record<string, { icon: typeof Clock; color: string }> = {
  pending: { icon: Clock, color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
  approved: { icon: CheckCircle2, color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
  rejected: { icon: XCircle, color: "text-red-400 border-red-500/30 bg-red-500/10" },
};

const sourceLabels: Record<string, string> = {
  manual: "Manual Entry",
  parsed_cv: "CV Parsing",
  email_validation: "Email Validation",
  external_api: "External API",
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? statusConfig.pending;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={cn("text-[10px] gap-1 font-mono", cfg.color)}>
      <Icon className="h-3 w-3" />
      {status}
    </Badge>
  );
}

function TypeBadge({ type }: { type: string }) {
  const Icon = typeIcon[type] ?? Mail;
  return (
    <Badge variant="outline" className={cn("text-[10px] gap-1 font-mono", typeColor[type] ?? typeColor.email)}>
      <Icon className="h-3 w-3" />
      {type}
    </Badge>
  );
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color =
    pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="h-1.5 w-16 rounded-full bg-muted/40 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-mono text-muted-foreground">{pct}%</span>
    </div>
  );
}

function ContactCard({
  contact,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: {
  contact: BackendEnrichedContactOut;
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <TypeBadge type={contact.contact_type} />
          <StatusBadge status={contact.status} />
        </div>
        <ConfidenceBar confidence={contact.confidence} />
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Original</span>
          <span className="text-foreground font-mono text-[13px] truncate">{contact.original_value}</span>
        </div>
        {contact.enriched_value && contact.enriched_value !== contact.original_value && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400/60">Enriched</span>
            <span className="text-emerald-400 font-mono text-[13px] truncate">{contact.enriched_value}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="font-semibold">{sourceLabels[contact.source] ?? contact.source}</span>
          {contact.provenance && <span>· {contact.provenance}</span>}
          <span>· ID: {contact.candidate_id.slice(0, 8)}...</span>
        </div>
        {contact.status === "pending" && (
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
              onClick={onApprove}
              disabled={isApproving || isRejecting}
            >
              {isApproving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
              Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px] text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={onReject}
              disabled={isApproving || isRejecting}
            >
              {isRejecting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
              Reject
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  delay,
}: {
  label: string;
  value: number;
  icon: typeof Mail;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass rounded-xl p-4 space-y-2"
    >
      <div className="flex items-center gap-2">
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", color)}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-2xl font-bold font-heading text-foreground">{value}</span>
      </div>
      <p className="text-[11px] font-medium text-muted-foreground tracking-wide">{label}</p>
    </motion.div>
  );
}

export default function ContactEnrichmentPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<string | undefined>();

  const { data: status, isLoading: statusLoading, isError: statusError } = useContactEnrichmentStatus();
  const { data: contacts = [], isLoading: contactsLoading, isError: contactsError, refetch: refetchContacts } = useEnrichedContacts(
    { status: statusFilter, contact_type: typeFilter },
  );

  const approve = useApproveContact();
  const reject = useRejectContact();

  const handleApprove = (id: string) => approve.mutate({ id });
  const handleReject = (id: string) => reject.mutate({ id });

  const isPending = statusLoading || contactsLoading;
  const hasError = statusError || contactsError;

  const noProviderConfigured = status && status.total === 0;

  return (
    <div className="h-full overflow-y-auto p-6 space-y-8 max-w-6xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Contact className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
            Contact Enrichment
          </h1>
          <p className="text-sm text-muted-foreground">
            Validate, enrich, and approve candidate contact information before use in outreach.
          </p>
        </div>
      </motion.div>

      {/* Loading */}
      {isPending && (
        <div className="flex items-center justify-center py-16">
          <div className="space-y-2 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Loading enrichment data...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {hasError && !isPending && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass gradient-border rounded-2xl p-6 flex flex-col items-center gap-3 text-center"
        >
          <AlertCircle className="h-8 w-8 text-red-400" />
          <p className="text-sm font-medium text-foreground">Failed to load enrichment data</p>
          <p className="text-xs text-muted-foreground">There was an error fetching enrichment status. Please try again.</p>
          <Button size="sm" variant="secondary" className="gap-1.5 text-xs" onClick={() => refetchContacts()}>
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </motion.div>
      )}

      {/* Empty / No provider */}
      {!isPending && !hasError && noProviderConfigured && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass gradient-border rounded-2xl p-8 flex flex-col items-center gap-3 text-center max-w-lg mx-auto"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
            <Clock className="h-6 w-6 text-amber-400" />
          </div>
          <p className="text-sm font-medium text-foreground">No enrichment data yet</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Contacts are enriched automatically when candidates apply or CVs are ingested.
            External enrichment providers are not configured. Email validation and API-based
            enrichment require provider credentials. Currently showing data parsed from CVs only.
          </p>
        </motion.div>
      )}

      {/* Status cards */}
      {!isPending && !hasError && status && !noProviderConfigured && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Total Contacts"
              value={status.total}
              icon={Contact}
              color="bg-primary/10 text-primary"
              delay={0.04}
            />
            <StatCard
              label="Pending Approval"
              value={status.pending}
              icon={Clock}
              color="bg-amber-500/10 text-amber-400"
              delay={0.08}
            />
            <StatCard
              label="Approved"
              value={status.approved}
              icon={CheckCircle2}
              color="bg-emerald-500/10 text-emerald-400"
              delay={0.12}
            />
            <StatCard
              label="Rejected"
              value={status.rejected}
              icon={XCircle}
              color="bg-red-500/10 text-red-400"
              delay={0.16}
            />
          </div>

          {/* By type breakdown */}
          {Object.keys(status.by_type).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="glass rounded-xl p-4"
            >
              <h2 className="text-sm font-semibold text-foreground mb-3">By Contact Type</h2>
              <div className="flex flex-wrap gap-2">
                {Object.entries(status.by_type).map(([type, count]) => {
                  const Icon = typeIcon[type] ?? Mail;
                  return (
                    <div
                      key={type}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium",
                        typeColor[type] ?? typeColor.email,
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="capitalize">{type}</span>
                      <span className="font-mono font-bold ml-1">{count}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 flex-wrap"
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Filters</span>
            {["", "pending", "approved", "rejected"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s || undefined)}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  statusFilter === (s || undefined) || (!statusFilter && !s)
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                {s || "all"}
              </button>
            ))}
            <span className="text-muted-foreground/40 mx-1">|</span>
            {["", "email", "phone", "linkedin", "github", "portfolio"].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t || undefined)}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  typeFilter === (t || undefined) || (!typeFilter && !t)
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                {t || "all"}
              </button>
            ))}
          </motion.div>

          {/* Contacts list */}
          <div className="space-y-3">
            {contacts.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl border border-dashed border-border/40 p-12 text-center"
              >
                <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No contacts match the selected filters.</p>
              </motion.div>
            )}
            {contacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onApprove={() => handleApprove(contact.id)}
                onReject={() => handleReject(contact.id)}
                isApproving={approve.isPending && approve.variables?.id === contact.id}
                isRejecting={reject.isPending && reject.variables?.id === contact.id}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
