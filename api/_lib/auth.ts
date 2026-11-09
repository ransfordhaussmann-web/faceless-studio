import { requireIdentity, type VerifiedIdentity } from "../../cursor/identity";
import { json, sameOrigin } from "./http";

const buckets = new Map<string, { count: number; resetAt: number }>();

/** Signed-in Cursor person only (not API keys). Locally uses the simulated viewer. */
export async function requireSignedIn(request: Request): Promise<VerifiedIdentity | Response> {
  const identity = await requireIdentity(request);
  if (identity instanceof Response) {
    return json(
      {
        error:
          "Sign in required. Publish this app as private or team, then open it while signed in to Cursor.",
      },
      401,
    );
  }
  if (identity.kind !== "person") {
    return json({ error: "A signed-in person is required for this action." }, 403);
  }
  return identity;
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
    if (!ok) return json({ error: "Too many requests. Try again shortly." }, 429);
  }
  return identity;
}
