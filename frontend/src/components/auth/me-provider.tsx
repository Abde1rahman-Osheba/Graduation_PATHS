"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getMe } from "@/lib/api/auth";
import { clearSessionToken, getSessionToken } from "@/lib/auth/session";
import type { MeResponse } from "@/types/auth";

type MeContextValue = {
  user: MeResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const MeContext = createContext<MeContextValue | null>(null);

export function MeProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const token = getSessionToken();
    if (!token) {
      setUser(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setUser(await getMe());
    } catch (e) {
      clearSessionToken();
      setUser(null);
      setError(e instanceof Error ? e.message : "Failed to load session");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => {
      setLoading(false);
    });
  }, [refresh]);

  const value = useMemo(() => ({ user, loading, error, refresh }), [user, loading, error, refresh]);

  return <MeContext.Provider value={value}>{children}</MeContext.Provider>;
}

export function useMe() {
  const ctx = useContext(MeContext);
  if (!ctx) throw new Error("useMe must be used within MeProvider");
  return ctx;
}
