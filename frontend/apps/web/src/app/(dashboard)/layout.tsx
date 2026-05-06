"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/layout/shell";
import { useAuthStore } from "@/lib/stores/auth.store";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, _hasHydrated, user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    const isCandidate =
      user?.accountType === "candidate" || user?.role === "candidate";
    if (isCandidate) {
      router.replace("/candidate/dashboard");
    }
  }, [_hasHydrated, isAuthenticated, user?.accountType, user?.role, router]);

  if (!_hasHydrated) return null;
  if (!isAuthenticated) return null;
  const isCandidateUser =
    user?.accountType === "candidate" || user?.role === "candidate";
  if (isCandidateUser) return null;

  return <Shell>{children}</Shell>;
}
