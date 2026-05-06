"use client";

import { setToken } from "@/lib/api";
import { GlossCard } from "@/components/ui/gloss-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { scaleIn } from "@/components/motion/variants";
import { login } from "@/lib/api/auth";
import { useMe } from "@/components/auth/me-provider";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useMe();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await login(email, password);
      setToken(res.access_token);
      await refresh();

      const nextRaw =
        typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null;
      const next =
        nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : null;

      if (next) {
        router.push(next);
        return;
      }

      if (res.user.account_type === "organization_member" && res.user.organization) {
        router.push("/org");
      } else {
        router.push("/candidate");
      }
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <motion.div variants={scaleIn} initial="hidden" animate="show" className="text-center sm:text-left">
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-sm text-zinc-500">Sign in to the PATHS console.</p>
      </motion.div>
      <GlossCard className="mt-6" glow>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            type="email"
            autoComplete="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            autoComplete="current-password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {err && (
            <p className="text-sm text-red-400" role="alert">
              {err}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-zinc-500 sm:text-left">
          No account?{" "}
          <Link href="/register/candidate" className="text-sky-400 hover:underline">
            Candidate
          </Link>{" "}
          ·{" "}
          <Link href="/register/org" className="text-sky-400 hover:underline">
            Organisation
          </Link>
        </p>
      </GlossCard>
    </div>
  );
}
