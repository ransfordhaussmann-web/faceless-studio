import { requireIdentity, type VerifiedIdentity } from "../../cursor/identity.js";
import { json, sameOrigin } from "./http";

const buckets = new Map<string, { count: number; resetAt: number }>();

const SIGN_IN_MESSAGE =
  "Sign in required. In Publish Settings, set this app to Private (or Team), then open it while signed in to Cursor. Add TikTok / YouTube / Facebook secrets there too.";

/** Prefer a readable page when the browser navigates (Connect links). */
export function clientError(request: Request, message: string, status: number): Response {
  const accept = request.headers.get("accept") || "";
  if (accept.includes("text/html")) {
    const safe = message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return new Response(
      `<!doctype html><html lang="en"><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Account connect</title><body style="font-family:system-ui,sans-serif;max-width:36rem;margin:3rem auto;padding:0 1rem;line-height:1.5"><h1>Can’t connect yet</h1><p>${safe}</p><p><a href="/">Back to Control Room</a></p></body></html>`,
      {
        status,
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store" },
      },
    );
  }
  return json({ error: message }, status);
}

/** Signed-in Cursor person only (not API keys). Locally uses the simulated viewer. */
export async function requireSignedIn(request: Request): Promise<VerifiedIdentity | Response> {
  try {
    const identity = await requireIdentity(request);
    if (identity instanceof Response) {
      return clientError(request, SIGN_IN_MESSAGE, 401);
    }
    if (identity.kind !== "person") {
      return clientError(request, "A signed-in person is required for this action.", 403);
    }
    return identity;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "identity check failed";
    return clientError(request, `Could not verify sign-in (${detail}).`, 500);
  }
}

/** Block cross-site state-changing calls (CSRF). */
export function requireCsrf(request: Request): Response | null {
  if (request.method === "GET" || request.method === "HEAD") return null;
  if (!sameOrigin(request)) return json({ error: "bad origin" }, 403);
  const site = request.headers.get("sec-fetch-site");
  if (site === "cross-site" || site === "same-site") {
    return json({ error: "cross-site request blocked" }, 403);
  }
  return null;
}

export function takeRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

/** Auth (+ CSRF for mutations) and optional per-viewer rate limit. */
export async function guardSensitive(
  request: Request,
  opts?: { rateKey?: string; limit?: number; windowMs?: number },
): Promise<VerifiedIdentity | Response> {
  const csrf = requireCsrf(request);
  if (csrf) return csrf;
  const identity = await requireSignedIn(request);
  if (identity instanceof Response) return identity;
  if (opts?.rateKey) {
    const ok = takeRateLimit(
      `${opts.rateKey}:${identity.sub}`,
      opts.limit ?? 30,
      opts.windowMs ?? 60_000,
    );
    if (!ok) return clientError(request, "Too many requests. Try again shortly.", 429);
  }
  return identity;
}
