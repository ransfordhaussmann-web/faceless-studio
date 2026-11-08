const COOKIE_MAX = 60 * 60 * 24 * 30;

export function json(data: unknown, status = 200, extra?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store",
      ...extra,
    },
  });
}

export function originOf(request: Request): string {
  const url = new URL(request.url);
  const forwarded = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  const proto = forwarded || url.protocol.replace(":", "") || "http";
  return `${proto}://${host}`;
}

export function sameOrigin(request: Request): boolean {
  if (request.method === "GET" || request.method === "HEAD") return true;
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") === "same-origin";
  return origin === originOf(request);
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const cut = trimmed.indexOf("=");
    if (cut === -1) continue;
    if (decodeURIComponent(trimmed.slice(0, cut).trim()) === name) {
      return decodeURIComponent(trimmed.slice(cut + 1));
    }
  }
  return null;
}

export function setCookie(name: string, value: string, request: Request, maxAge = COOKIE_MAX): string {
  const secure = originOf(request).startsWith("https:") ? "; Secure" : "";
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearCookie(name: string, request: Request): string {
  const secure = originOf(request).startsWith("https:") ? "; Secure" : "";
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function randomState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
