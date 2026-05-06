"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMe } from "@/components/auth/me-provider";
import { Button } from "@/components/ui/button";
import { clearToken } from "@/lib/api";
import { Building2, Gauge, LogOut, Scale, Search, Settings, Stethoscope } from "lucide-react";

const nav = [
  { href: "/org", label: "Overview", icon: Gauge },
  { href: "/org/matching", label: "Matching", icon: Search },
  { href: "/org/interviews", label: "Interviews", icon: Stethoscope },
  { href: "/org/decision-support", label: "Decision support", icon: Scale },
  { href: "/org/settings", label: "Workspace", icon: Settings },
] as const;

export function RecruiterShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { user, loading } = useMe();

  const orgName = user?.organization?.organization_name ?? "Organization";
  const orgRole = user?.organization?.role_code ?? "member";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="mx-auto flex max-w-[1400px] gap-6 px-4 py-8 sm:px-6">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24 space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-600">
                  <Building2 className="h-4 w-4 text-white" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{loading ? "Loading…" : orgName}</p>
                  <p className="truncate text-xs text-zinc-500">{orgRole}</p>
                </div>
              </div>
            </div>

            <nav className="space-y-1">
              {nav.map((item) => {
                const active = path === item.href || path.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
                      active ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="sticky top-0 z-40 -mx-4 border-b border-white/[0.06] bg-zinc-950/70 px-4 py-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-0">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 lg:hidden">
                <p className="truncate text-sm font-semibold">{orgName}</p>
                <p className="truncate text-xs text-zinc-500">Recruiter workspace</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="!px-3 !py-2 text-xs"
                  onClick={() => {
                    clearToken();
                    router.push("/login");
                  }}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </Button>
              </div>
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {nav.map((item) => {
                const active = path === item.href || path.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "whitespace-nowrap rounded-full border px-3 py-1 text-xs transition",
                      active ? "border-white/15 bg-white/10 text-white" : "border-white/10 text-zinc-400",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
