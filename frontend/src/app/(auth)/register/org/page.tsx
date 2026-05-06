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
import { login, registerOrganization } from "@/lib/api/auth";
import { useMe } from "@/components/auth/me-provider";

export default function RegisterOrgPage() {
  const router = useRouter();
  const { refresh } = useMe();
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await registerOrganization({
        organization_name: orgName,
        organization_slug: orgSlug,
        first_admin_full_name: adminName,
        first_admin_email: adminEmail,
        first_admin_password: adminPassword,
      });
      const auth = await login(adminEmail, adminPassword);
      setToken(auth.access_token);
      await refresh();
      router.push("/org");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <motion.div variants={scaleIn} initial="hidden" animate="show" className="text-center sm:text-left">
        <h1 className="text-2xl font-semibold">Register organisation</h1>
        <p className="mt-1 text-sm text-zinc-500">First admin account is created for you.</p>
      </motion.div>
      <GlossCard className="mt-6" glow>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Organisation name" value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
          <Input
            label="URL slug"
            value={orgSlug}
            onChange={(e) => setOrgSlug(e.target.value.toLowerCase())}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            required
            hint="Lowercase letters, numbers, hyphens."
          />
          <Input label="Admin full name" value={adminName} onChange={(e) => setAdminName(e.target.value)} required />
          <Input type="email" label="Admin email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required />
          <Input
            type="password"
            label="Admin password"
            minLength={8}
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            required
          />
          {err && <p className="text-sm text-red-400">{err}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating…" : "Create organisation"}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-zinc-500">
          <Link href="/login" className="text-sky-400 hover:underline">
            Sign in instead
          </Link>
        </p>
      </GlossCard>
    </div>
  );
}
