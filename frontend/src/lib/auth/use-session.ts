"use client";

import { useCallback, useEffect, useState } from "react";
import { getMe } from "@/lib/api/auth";
import { clearSessionToken, getSessionToken } from "@/lib/auth/session";
import type { MeResponse } from "@/types/auth";

export type SessionState = {
  loading: boolean;
  user: MeResponse | null;
  error: string | null;
};

export function useSession(required: "any" | "candidate" | "organization_member" = "any") {
  const [state, setState] = useState<SessionState>({
    loading: true,
    user: null,
    error: null,
  });

  const load = useCallback(async () => {
    const token = getSessionToken();
    if (!token) {
      setState({ loading: false, user: null, error: "Not signed in" });
      return;
    }

    try {
      const me = await getMe();
      if (required !== "any" && me.account_type !== required) {
        setState({ loading: false, user: me, error: "Unauthorized account type" });
        return;
      }
      setState({ loading: false, user: me, error: null });
    } catch (error) {
      clearSessionToken();
      setState({
        loading: false,
        user: null,
        error: error instanceof Error ? error.message : "Failed to load session",
      });
    }
  }, [required]);

  useEffect(() => {
    load().catch(() => {
      setState({ loading: false, user: null, error: "Failed to load session" });
    });
  }, [load]);

  return {
    ...state,
    refresh: load,
  };
}
