"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, Briefcase, CheckSquare,
  FileText, ChevronLeft, ChevronRight, Zap, Bot,
  Building2, Shield, ShieldCheck, Calendar, Telescope, Sparkles, Search, ClipboardCheck,
  Database, Upload, Library, GitMerge, Contact,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useUIStore } from "@/lib/stores/ui.store";
import { usePendingApprovals, useAgentStatus } from "@/lib/hooks";

const navItems = [
  {
    group: "Workspace",
    items: [
      { label: "Dashboard",      href: "/dashboard",  icon: LayoutDashboard },
      { label: "Candidates",     href: "/candidates", icon: Users },
      { label: "Jobs",           href: "/jobs",        icon: Briefcase },
    ],
  },
  {
    group: "Workflow",
    items: [
      { label: "Sourcing",       href: "/sourcing",   icon: Sparkles },
      { label: "Matching",       href: "/org/matching",  icon: Search },
      { label: "Approvals",      href: "/approvals",  icon: CheckSquare, badge: true },
      { label: "Interviews",     href: "/interviews", icon: Calendar },
      { label: "Assessments",    href: "/org/assessments", icon: ClipboardCheck },
      { label: "Job Ingestion",  href: "/org/job-ingestion", icon: Database },
      { label: "CV Ingestion",   href: "/org/cv-ingestion", icon: Upload },
      { label: "Bias & Fairness", href: "/org/bias",    icon: ShieldCheck },
      { label: "Decision Support", href: "/org/decision-support", icon: FileText },
      { label: "Identity Resolution", href: "/org/identity-resolution", icon: GitMerge },
      { label: "Contact Enrichment",  href: "/org/contact-enrichment",  icon: Contact },
      { label: "Agent Monitoring", href: "/org/agents", icon: Bot },
      { label: "Knowledge Base", href: "/org/knowledge-base", icon: Library },
      { label: "Outreach",       href: "/outreach",   icon: Telescope },
      { label: "Audit Log",      href: "/audit",      icon: Shield },
    ],
  },
  {
    group: "Organization",
    items: [
      { label: "Organization",   href: "/settings/organization", icon: Building2 },
      { label: "Members",        href: "/settings/members",      icon: Users },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { data: pending = [] } = usePendingApprovals();
  const pendingCount = pending.length;

  const { data: agents = [] } = useAgentStatus();
  const activeAgents = agents.filter((a) => a.status === "running");
  const activeCount = activeAgents.length;
  const activeNames =
    activeAgents.length > 0
      ? activeAgents.slice(0, 3).map((a) => a.name).join(" · ")
      : agents.length > 0
        ? "All agents idle"
        : "No agents reporting";

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 64 : 240 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex h-screen flex-col border-r border-sidebar-border bg-sidebar overflow-hidden shrink-0"
    >
      {/* Logo */}
      <div className="flex h-16 items-center px-4 border-b border-sidebar-border shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20 glow-blue">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col min-w-0"
              >
                <span className="font-heading text-sm font-bold tracking-tight text-foreground leading-tight">
                  PATHS
                </span>
                <span className="text-[10px] text-muted-foreground font-medium leading-tight">
                  AI Hiring OS
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
        {navItems.map((group) => (
          <div key={group.group}>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60"
                >
                  {group.group}
                </motion.p>
              )}
            </AnimatePresence>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-md px-2 py-2 text-sm font-medium transition-all duration-150",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      )}
                    >
                      {active && (
                        <motion.div
                          layoutId="sidebar-active"
                          className="absolute inset-0 rounded-md bg-sidebar-accent"
                          transition={{ type: "spring", stiffness: 400, damping: 35 }}
                        />
                      )}
                      <Icon
                        className={cn(
                          "relative h-4 w-4 shrink-0 transition-colors",
                          active ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80"
                        )}
                      />
                      <AnimatePresence>
                        {!sidebarCollapsed && (
                          <motion.span
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -6 }}
                            transition={{ duration: 0.16 }}
                            className="relative flex-1 truncate"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {item.badge && pendingCount > 0 && !sidebarCollapsed && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="relative ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/20 px-1.5 text-[10px] font-bold text-primary ring-1 ring-primary/30"
                        >
                          {pendingCount}
                        </motion.span>
                      )}
                      {item.badge && pendingCount > 0 && sidebarCollapsed && (
                        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* AI Status footer */}
      <AnimatePresence>
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="border-t border-sidebar-border p-3"
          >
            <div className="flex items-center gap-2 rounded-md bg-sidebar-accent/40 px-2.5 py-2">
              <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <Bot className="h-3.5 w-3.5 text-primary" />
                <span
                  className={cn(
                    "absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full ring-1 ring-sidebar",
                    activeCount > 0 ? "bg-emerald-500 agent-pulse" : "bg-muted-foreground/40",
                  )}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-[11px] font-semibold text-sidebar-foreground">
                  {activeCount > 0
                    ? `${activeCount} agent${activeCount > 1 ? "s" : ""} active`
                    : "Agents idle"}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">{activeNames}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-muted-foreground shadow-sm transition-colors hover:text-foreground z-10"
        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {sidebarCollapsed
          ? <ChevronRight className="h-3 w-3" />
          : <ChevronLeft className="h-3 w-3" />}
      </button>
    </motion.aside>
  );
}
