"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";
import { loginApi } from "@/lib/api/auth.api";

// ── Mock fallback (used when backend is unavailable) ──────────────────────
const mockUser: User = {
  id: "user_01",
  email: "ahmed@techcorp.io",
  name: "Ahmed Hassan",
  avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=ahmed",
  role: "admin",
  accountType: "organization_member",
  orgId: "org_01",
  orgName: "TechCorp Egypt",
  createdAt: "2025-06-01T09:00:00Z",
  lastLogin: "2026-02-12T09:00:00Z",
  mfaEnabled: false,
  status: "active",
};

/** Re-read onboarding draft from storage for the user id now in `paths-auth`. */
function syncOnboardingDraftWithSession() {
  queueMicrotask(() => {
    void import("@/lib/stores/onboarding.store").then(({ useOnboardingStore }) => {
      void useOnboardingStore.persist.rehydrate();
    });
  });
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

      login: async (email: string, password: string) => {
        set({ isLoading: true });

        const apiUrl = process.env.NEXT_PUBLIC_API_URL;

        if (apiUrl) {
          // ── Real backend login ──────────────────────────────────────────
          try {
            const { user, token } = await loginApi(email, password);
            set({
              user: user as unknown as User,
              token,
              isAuthenticated: true,
              isLoading: false,
            });
            syncOnboardingDraftWithSession();
            return;
          } catch (err) {
            // Optional demo fallback: set NEXT_PUBLIC_ALLOW_DEMO_LOGIN=true
            // Never use mock-token by default — protected APIs (e.g. interviews)
            // require a real JWT and otherwise show "Could not validate credentials".
            const allowDemoFallback =
              process.env.NEXT_PUBLIC_ALLOW_DEMO_LOGIN === "true";
            const isAuthError =
              err instanceof Error &&
              (err.message.toLowerCase().includes("invalid") ||
                err.message.toLowerCase().includes("incorrect") ||
                err.message.toLowerCase().includes("credentials") ||
                err.message.toLowerCase().includes("password") ||
                err.message.toLowerCase().includes("not found") ||
                (err as { status?: number }).status === 401 ||
                (err as { status?: number }).status === 403);

            if (allowDemoFallback && isAuthError) {
              await new Promise((r) => setTimeout(r, 600));
              set({
                user: { ...mockUser, email },
                token: "mock-token",
                isAuthenticated: true,
                isLoading: false,
              });
              syncOnboardingDraftWithSession();
              return;
            }

            set({ isLoading: false });
            throw err;
          }
        }

        set({ isLoading: false });
        throw new Error(
          "NEXT_PUBLIC_API_URL is not set. Configure the API base URL to sign in.",
        );
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
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
      },
    },
  ),
);
