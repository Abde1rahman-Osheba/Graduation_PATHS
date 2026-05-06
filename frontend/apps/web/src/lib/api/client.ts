/**
 * PATHS API client — thin fetch wrapper.
 * - Reads NEXT_PUBLIC_API_URL for the base URL.
 * - Attaches Authorization: Bearer <token> from localStorage (paths-auth store).
 * - Throws ApiError on non-2xx responses.
 * - All methods return the parsed JSON body.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    // Read from the Zustand persist key
    const raw = localStorage.getItem("paths-auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Support both stored shapes: { state: { token } } and legacy { state: { user: { _token } } }
    return parsed?.state?.token ?? parsed?.state?.user?._token ?? null;
  } catch {
    return null;
  }
}

/** Rough JWT shape check (three base64url segments). */
function tokenLooksLikeJwt(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  return parts.every((p) => p.length > 0);
}

const DEMO_LOGIN_MSG =
  "This action needs a real backend login. Sign out, then sign in with your organization email and password (the same account registered in PATHS). Demo / mock sessions cannot call protected APIs.";

function pathNeedsRealJwt(path: string): boolean {
  if (!path.startsWith("/api/v1/")) return false;
  if (path.includes("/auth/login")) return false;
  if (
    path.includes("/register/candidate") ||
    path.includes("/register/organization")
  ) {
    return false;
  }
  if (path.startsWith("/api/v1/jobs/public")) return false;
  if (path.startsWith("/api/v1/schedule/")) return false;
  return true;
}

function assertRealJwtIfRequired(path: string): void {
  if (!pathNeedsRealJwt(path)) return;
  const token = getToken();
  if (!token) return;
  if (token === "mock-token" || !tokenLooksLikeJwt(token)) {
    throw new ApiError(401, DEMO_LOGIN_MSG);
  }
}

async function requestForm<T>(path: string, body: FormData): Promise<T> {
  assertRealJwtIfRequired(path);
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { method: "POST", headers, body });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try { const err = await res.json(); detail = err?.detail ?? detail; } catch { /* ignore */ }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  assertRealJwtIfRequired(path);
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      detail = err?.detail ?? detail;
    } catch { /* ignore */ }
    throw new ApiError(res.status, detail);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get:      <T>(path: string) => request<T>("GET", path),
  post:     <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put:      <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch:    <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete:   <T>(path: string) => request<T>("DELETE", path),
  postForm: <T>(path: string, body: FormData) => requestForm<T>(path, body),
};
