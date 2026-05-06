"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useMe } from "@/components/auth/me-provider";

const links = [
  { href: "/product", label: "Product" },
  { href: "/for-candidates", label: "Candidates" },
  { href: "/for-recruiters", label: "Recruiters" },
  { href: "/careers", label: "Careers" },
] as const;

export function MarketingSiteHeader() {
  const path = usePathname();
  const { user } = useMe();

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-zinc-950/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2">
          <motion.span
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-violet-600 shadow-lg shadow-sky-500/25"
            whileHover={{ rotate: 6, scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <Sparkles className="h-4 w-4 text-white" aria-hidden />
          </motion.span>
          <span className="text-sm font-semibold tracking-tight text-zinc-50">
            PATHS<span className="text-zinc-500">.ai</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const active = path === l.href || path.startsWith(`${l.href}/`);
            return (
              <Link key={l.href} href={l.href}>
                <span
                  className={cn(
                    "relative rounded-xl px-3 py-2 text-xs font-medium transition",
                    active ? "text-white" : "text-zinc-500 hover:text-zinc-200",
                  )}
                >
                  {l.label}
                  {active && (
                    <motion.span
                      layoutId="marketing-nav-pill"
                      className="absolute inset-0 -z-10 rounded-xl bg-white/10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.45 }}
                    />
                  )}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <Link href={user.account_type === "organization_member" ? "/org" : "/candidate"}>
              <Button type="button" variant="ghost" className="!px-3 !py-2 text-xs">
                Open app
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/register/org">
                <Button type="button" variant="ghost" className="!px-3 !py-2 text-xs">
                  Hire with PATHS
                </Button>
              </Link>
              <Link href="/login">
                <Button type="button" className="!px-3 !py-2 text-xs">
                  Sign in
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
