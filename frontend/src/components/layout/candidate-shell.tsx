"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMe } from "@/components/auth/me-provider";
import { Button } from "@/components/ui/button";
import { clearToken } from "@/lib/api";
import { LayoutDashboard, LogOut, Sparkles, UploadCloud, UserRound } from "lucide-react";

const nav = [
  { href: "/candidate", label: "Dashboard", icon: LayoutDashboard },
  { href: "/candidate/onboarding", label: "Onboarding", icon: UploadCloud },
  { href: "/candidate/profile", label: "Profile", icon: UserRound },
] as const;

export function CandidateShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { user, loading } = useMe();

  const name = user?.full_name ?? "Candidate";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="mx-auto flex max-w-[1200px] gap-6 px-4 py-8 sm:px-6">
        <aside className="hidden w-60 shrink-0 md:block">
          <div className="sticky top-24 space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-emerald-400">
                  <Sparkles className="h-4 w-4 text-white" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{loading ? "Loading…" : name}</p>
                  <p className="truncate text-xs text-zinc-500">Candidate workspace</p>
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
          <div className="sticky top-0 z-40 -mx-4 border-b border-white/[0.06] bg-zinc-950/70 px-4 py-4 backdrop-blur-xl sm:-mx-6 sm:px-6 md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-0">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 md:hidden">
                <p className="truncate text-sm font-semibold">{name}</p>
                <p className="truncate text-xs text-zinc-500">Candidate</p>
              </div>
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

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 md:hidden">
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
