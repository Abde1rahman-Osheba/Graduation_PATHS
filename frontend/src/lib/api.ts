import { clearSessionToken, getSessionToken, setSessionToken } from "@/lib/auth/session";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

export type ApiRequestInit = RequestInit & { json?: unknown };

export function getToken(): string | null {
  return getSessionToken();
}

export function setToken(token: string) {
  setSessionToken(token);
}

export function clearToken() {
  clearSessionToken();
}

export function apiUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function withQuery(path: string, query?: Record<string, string | number | boolean | null | undefined>): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  if (!qs) return path;
  return `${path}${path.includes("?") ? "&" : "?"}${qs}`;
}

async function normalizeApiError(res: Response): Promise<Error> {
  let detail: string = res.statusText;
  try {
    const err = (await res.json()) as {
      detail?: string | { msg: string }[];
      message?: string;
      error?: string;
    };
    if (typeof err.detail === "string") detail = err.detail;
    else if (Array.isArray(err.detail)) detail = err.detail.map((d) => d.msg).join(", ");
    else if (typeof err.message === "string") detail = err.message;
    else if (typeof err.error === "string") detail = err.error;
  } catch {
    // fall back to status text
  }
  return new Error(detail);
}

export async function apiFetch<T = unknown>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.json !== undefined) headers.set("Content-Type", "application/json");

  const token = getSessionToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const { json, ...rest } = init;
  const url = apiUrl(path);
  let res: Response;

  try {
    res = await fetch(url, {
      ...rest,
      headers,
      body: json !== undefined ? JSON.stringify(json) : init.body,
    });
  } catch (e) {
    if (e instanceof TypeError) {
      throw new Error(
        `Cannot reach the API at ${url} (${API_BASE}). Start FastAPI, set NEXT_PUBLIC_API_BASE_URL, then restart Next.js.`,
      );
    }
    throw e;
  }

  if (!res.ok) {
    throw await normalizeApiError(res);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
