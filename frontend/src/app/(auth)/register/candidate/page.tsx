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
import { login, registerCandidate } from "@/lib/api/auth";
import { useMe } from "@/components/auth/me-provider";

export default function RegisterCandidatePage() {
  const router = useRouter();
  const { refresh } = useMe();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await registerCandidate({ full_name: fullName, email, password });
      const auth = await login(email, password);
      setToken(auth.access_token);
      await refresh();
      router.push("/candidate/onboarding");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <motion.div variants={scaleIn} initial="hidden" animate="show" className="text-center sm:text-left">
        <h1 className="text-2xl font-semibold">Create candidate account</h1>
        <p className="mt-1 text-sm text-zinc-500">Build your profile and run scoring.</p>
      </motion.div>
      <GlossCard className="mt-6" glow>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <Input type="email" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input
            type="password"
            label="Password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            hint="At least 8 characters."
          />
          {err && <p className="text-sm text-red-400">{err}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-zinc-500">
          <Link href="/login" className="text-sky-400 hover:underline">
            Already have an account?
          </Link>
        </p>
      </GlossCard>
    </div>
  );
}
