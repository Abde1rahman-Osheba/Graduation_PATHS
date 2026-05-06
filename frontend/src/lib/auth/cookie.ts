const AUTH_COOKIE = "paths_auth";

function writeCookie(value: string, maxAgeSeconds: number) {
  if (typeof document === "undefined") return;
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${AUTH_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

export function setAuthCookie(token: string) {
  // Keep aligned with typical access token TTL; refresh tokens are not used in this repo today.
  writeCookie(token, 60 * 60);
}

export function clearAuthCookie() {
  if (typeof document === "undefined") return;
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${AUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}
