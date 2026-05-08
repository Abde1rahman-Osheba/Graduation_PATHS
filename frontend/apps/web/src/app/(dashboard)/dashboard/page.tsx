"use client";

import { motion } from "framer-motion";
import {
  Briefcase, Users, CheckSquare, Clock,
  TrendingUp, Calendar, UserCheck, ChevronRight,
  Bot, Loader2, CheckCircle2, Circle, AlertCircle, Activity,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, FunnelChart, Funnel, Cell, BarChart, Bar,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import Link from "next/link";
import { useDashboardStats, useFunnelData, useWeeklyApplications, useAgentStatus, usePendingApprovals } from "@/lib/hooks";
import { cn } from "@/lib/utils/cn";
import { relativeTime, stageLabel } from "@/lib/utils/format";
import type { AgentStatus } from "@/types";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35 } }),
};

const COLORS = ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe", "#eff6ff", "#f0f9ff"];

function StatCard({
  icon: Icon, label, value, sub, color, index,
}: {
  icon: React.ElementType; label: string; value: string | number; sub: string;
  color: string; index: number;
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      custom={index}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className="glass rounded-xl p-5 space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", color)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div>
        <p className="font-heading text-3xl font-bold tracking-tight text-foreground">{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
      </div>
    </motion.div>
  );
}

function AgentCard({ agent }: { agent: AgentStatus }) {
  const Icon =
    agent.status === "running" ? Loader2
    : agent.status === "completed" ? CheckCircle2
    : agent.status === "failed" ? AlertCircle
    : Circle;

  const color =
    agent.status === "running" ? "text-primary"
    : agent.status === "completed" ? "text-emerald-400"
    : agent.status === "failed" ? "text-destructive"
    : "text-muted-foreground/40";

  return (
    <div className="flex items-start gap-2.5 rounded-lg p-2.5 hover:bg-muted/30 transition-colors">
      <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", color, agent.status === "running" && "animate-spin")} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-foreground truncate">{agent.name}</p>
        {agent.currentTask && (
          <p className="text-[11px] text-muted-foreground truncate">{agent.currentTask}</p>
        )}
        {agent.progress != null && (
          <div className="mt-1.5 h-1 w-full rounded-full bg-muted/60">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${agent.progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full bg-primary"
            />
          </div>
        )}
        {!agent.currentTask && agent.lastRun && (
          <p className="text-[11px] text-muted-foreground/60">Last run {relativeTime(agent.lastRun)}</p>
        )}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: TooltipContentProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const { data: stats } = useDashboardStats();
  const { data: funnel = [] } = useFunnelData();
  const { data: weekly = [] } = useWeeklyApplications();
  const { data: agents = [] } = useAgentStatus();
  const { data: pending = [] } = usePendingApprovals();

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Good morning, Ahmed — here&apos;s your hiring pulse.</p>
        </div>
        {pending.length > 0 && (
          <Link
            href="/approvals"
            className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-semibold text-primary ring-1 ring-primary/20 transition-all hover:bg-primary/15"
          >
            <CheckSquare className="h-4 w-4" />
            {pending.length} pending approval{pending.length > 1 ? "s" : ""}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          index={0} icon={Briefcase} label="Active Jobs"
          value={stats?.activeJobs ?? "—"} sub="Published & open roles"
          color="bg-primary/10 text-primary"
        />
        <StatCard
          index={1} icon={Users} label="Candidates"
          value={stats?.totalCandidates ?? "—"} sub="In hiring pipeline"
          color="bg-teal-glow/10 text-teal-400"
        />
        <StatCard
          index={2} icon={CheckSquare} label="Pending Approvals"
          value={stats?.pendingApprovals ?? "—"} sub="HITL queue — needs action"
          color="bg-amber-500/10 text-amber-400"
        />
        <StatCard
          index={3} icon={Clock} label="Avg Time to Hire"
          value={stats ? `${stats.avgTimeToHire}d` : "—"} sub="Rolling average (days)"
          color="bg-violet-500/10 text-violet-400"
        />
        <StatCard
          index={4} icon={TrendingUp} label="This Week"
          value={stats?.thisWeekApplications ?? "—"} sub="new applications"
          color="bg-primary/10 text-primary"
        />
        <StatCard
          index={5} icon={UserCheck} label="Shortlisted Today"
          value={stats?.shortlistedToday ?? "—"} sub="by Screening Agent"
          color="bg-teal-glow/10 text-teal-400"
        />
        <StatCard
          index={6} icon={Calendar} label="Interviews"
          value={stats?.interviewsScheduled ?? "—"} sub="scheduled this week"
          color="bg-violet-500/10 text-violet-400"
        />
        <StatCard
          index={7} icon={UserCheck} label="Hired This Month"
          value={stats?.hiredThisMonth ?? "—"} sub="across all jobs"
          color="bg-emerald-500/10 text-emerald-400"
        />
      </div>

      {/* Main charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Applications trend */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass col-span-2 rounded-xl p-5"
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-heading text-[15px] font-semibold text-foreground">Application Trend</h2>
              <p className="text-xs text-muted-foreground">Weekly applications vs. shortlisted</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary inline-block" /> Applications
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-teal-400 inline-block" /> Shortlisted
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weekly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradTeal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip content={(props) => <CustomTooltip {...props} />} />
              <Area type="monotone" dataKey="applications" name="Applications" stroke="#3b82f6" strokeWidth={2} fill="url(#gradBlue)" />
              <Area type="monotone" dataKey="shortlisted" name="Shortlisted" stroke="#2dd4bf" strokeWidth={2} fill="url(#gradTeal)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Funnel */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass rounded-xl p-5"
        >
          <div className="mb-4">
            <h2 className="font-heading text-[15px] font-semibold text-foreground">Pipeline Funnel</h2>
            <p className="text-xs text-muted-foreground">All active jobs combined</p>
          </div>
          <div className="space-y-1.5">
            {funnel.map((stage, i) => (
              <div key={stage.stage} className="group">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{stage.label}</span>
                  <span className="font-mono font-medium text-foreground">{stage.count}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(stage.count / (funnel[0]?.count || 1)) * 100}%` }}
                    transition={{ delay: 0.4 + i * 0.05, duration: 0.6, ease: "easeOut" }}
                    className="h-full rounded-full bg-primary"
                    style={{ opacity: 0.95 - i * 0.1 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* AI Agents + Pending Approvals */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* AI Agents */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-xl p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-heading text-[15px] font-semibold text-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> AI Agents
              </h2>
              <p className="text-xs text-muted-foreground">Live agent status</p>
            </div>
          </div>
          <div className="space-y-0.5">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </motion.div>

        {/* Pending approvals preview */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass rounded-xl p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-heading text-[15px] font-semibold text-foreground flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-amber-400" /> Pending Approvals
              </h2>
              <p className="text-xs text-muted-foreground">Requires your action</p>
            </div>
            <Link href="/approvals" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {pending.slice(0, 4).map((approval) => (
              <div
                key={approval.id}
                className="flex items-start gap-3 rounded-lg border border-border/40 bg-muted/20 p-3"
              >
                <div className={cn(
                  "mt-0.5 h-2 w-2 shrink-0 rounded-full",
                  approval.priority === "critical" ? "bg-destructive" :
                  approval.priority === "high" ? "bg-amber-400" : "bg-primary"
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground line-clamp-2 leading-snug">{approval.targetLabel}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {approval.requestedByName} · {relativeTime(approval.requestedAt)}
                  </p>
                </div>
              </div>
            ))}
            {pending.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-2" />
                <p className="text-sm font-medium text-foreground">All caught up!</p>
                <p className="text-xs text-muted-foreground">No pending approvals right now.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
