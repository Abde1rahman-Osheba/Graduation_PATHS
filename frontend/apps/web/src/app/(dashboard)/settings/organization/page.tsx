"use client";

import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { Building2, Globe, Users, ShieldCheck, Sliders, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrganization } from "@/lib/hooks";
import { cn } from "@/lib/utils/cn";

function Section({ icon: Icon, title, description, children }: {
  icon: typeof Building2; title: string; description: string; children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-5 space-y-4"
    >
      <div className="flex items-start gap-3 pb-3 border-b border-border/40">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="font-heading text-[15px] font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </motion.div>
  );
}

export default function OrganizationPage() {
  const { data: org } = useOrganization();

  if (!org) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">Organization</h1>
        <p className="text-sm text-muted-foreground">Manage {org.name}&apos;s settings and configuration.</p>
      </div>

      {/* Profile */}
      <Section icon={Building2} title="Profile" description="Basic organization information">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5 col-span-2">
            <Label className="text-sm">Organization Name</Label>
            <Input defaultValue={org.name} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Industry</Label>
            <Input defaultValue={org.industry} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Headcount</Label>
            <Select defaultValue={org.headcount}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1-10">1–10</SelectItem>
                <SelectItem value="11-50">11–50</SelectItem>
                <SelectItem value="51-200">51–200</SelectItem>
                <SelectItem value="201-500">201–500</SelectItem>
                <SelectItem value="501+">501+</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label className="text-sm">Website</Label>
            <Input defaultValue={org.website} type="url" placeholder="https://…" className="h-9" />
          </div>
        </div>
        <Button size="sm" className="gap-1.5"><Save className="h-3.5 w-3.5" /> Save Changes</Button>
      </Section>

      {/* Fairness & Privacy */}
      <Section icon={ShieldCheck} title="Fairness & Privacy" description="Anonymization and bias settings">
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 p-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Anonymization Level</p>
              <p className="text-xs text-muted-foreground">Controls which PII fields are redacted before scoring</p>
            </div>
            <Select defaultValue={org.settings.anonymizationLevel}>
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="strict">Strict</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="minimal">Minimal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 p-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Outbound Sourcing</p>
              <p className="text-xs text-muted-foreground">Allow Sourcing Agent to discover passive candidates</p>
            </div>
            <Switch defaultChecked={org.settings.outboundSourcingEnabled} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 p-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Technical Assessments</p>
              <p className="text-xs text-muted-foreground">Enable Assessment Agent for technical roles</p>
            </div>
            <Switch defaultChecked={org.settings.assessmentEnabled} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 p-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Data Retention</p>
              <p className="text-xs text-muted-foreground">Days to retain candidate data after rejection</p>
            </div>
            <Select defaultValue={String(org.settings.retentionDays)}>
              <SelectTrigger className="h-8 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="180">180 days</SelectItem>
                <SelectItem value="365">365 days</SelectItem>
                <SelectItem value="730">2 years</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      {/* Scoring Weights */}
      <Section icon={Sliders} title="Default Scoring Weights" description="Rubric dimension weights for all jobs (overridable per job)">
        <div className="space-y-3">
          {Object.entries(org.settings.scoringWeights).map(([dim, weight]) => (
            <div key={dim} className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground flex-1">{dim}</span>
              <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/70"
                  style={{ width: `${weight * 100}%` }}
                />
              </div>
              <span className="font-mono text-sm font-semibold text-foreground w-10 text-right">
                {Math.round(weight * 100)}%
              </span>
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground/60">Weights must sum to 100%</p>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-primary/5 border border-primary/10 p-3 text-xs text-primary/80">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          Weight changes trigger a re-score offer on all active shortlists. This is a HITL-gated action.
        </div>
      </Section>

      {/* Plan */}
      <Section icon={Globe} title="Plan" description="Current subscription and usage">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground capitalize">{org.plan} Plan</p>
            <p className="text-xs text-muted-foreground">{org.memberCount} members · {org.activeJobCount} active jobs</p>
          </div>
          <Button variant="outline" size="sm" className="h-8">Upgrade Plan</Button>
        </div>
      </Section>
    </div>
  );
}
