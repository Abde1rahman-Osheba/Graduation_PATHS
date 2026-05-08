"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";
import { loginApi } from "@/lib/api/auth.api";

/**
 * Re-read the onboarding draft from storage for the user id now persisted
 * in `paths-auth`. Drafts are namespaced by user id so distinct users do
 * not share the same in-progress profile.
 */
function syncOnboardingDraftWithSession() {
  queueMicrotask(() => {
    void import("@/lib/stores/onboarding.store").then(({ useOnboardingStore }) => {
      void useOnboardingStore.persist.rehydrate();
    });
  });
}

/**
 * Mirror the session into a non-sensitive cookie that Next.js middleware can
 * read at the edge. The cookie does NOT carry the JWT — only a presence flag
 * (`paths-session=1`). All authoritative checks still run server-side via
 * /api/v1/* on the backend.
 */
function setSessionCookie(present: boolean) {
  if (typeof document === "undefined") return;
  if (present) {
    document.cookie = "paths-session=1; Path=/; SameSite=Lax; Max-Age=86400";
  } else {
    document.cookie = "paths-session=; Path=/; SameSite=Lax; Max-Age=0";
  }
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  _hasHydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setHasHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      _hasHydrated: false,

      // Real-backend login. There is intentionally NO demo fallback path:
      // a previous NEXT_PUBLIC_ALLOW_DEMO_LOGIN code path used to grant a
      // hardcoded `admin` user when the backend rejected the credentials,
      // which is a privilege-escalation footgun. It was removed during the
      // platform-admin rollout.
      login: async (email: string, password: string) => {
        set({ isLoading: true });

        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!apiUrl) {
          set({ isLoading: false });
          throw new Error(
            "NEXT_PUBLIC_API_URL is not set. Configure the API base URL to sign in.",
          );
        }

        try {
          const { user, token } = await loginApi(email, password);
          set({
            user: user as unknown as User,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
          setSessionCookie(true);
          syncOnboardingDraftWithSession();
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
        setSessionCookie(false);
      },

      setUser: (user) => set({ user, isAuthenticated: true }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: "paths-auth",
      partialize: (s) => ({
        user: s.user,
        token: s.token,
        isAuthenticated: s.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        // Re-sync the cookie based on what rehydrated from localStorage.
        if (typeof document !== "undefined") {
          setSessionCookie(!!state?.isAuthenticated);
        }
      },
    },
  ),
);
