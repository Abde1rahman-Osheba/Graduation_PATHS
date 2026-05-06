"use client";

import { clearAuthCookie, setAuthCookie } from "@/lib/auth/cookie";

const TOKEN_KEY = "paths_token";

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setSessionToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  setAuthCookie(token);
}

export function clearSessionToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  clearAuthCookie();
}
