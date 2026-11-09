import { guardSensitive } from "../_lib/auth";
import { json } from "../_lib/http";
import { displayName, missingConfig, readSession, refreshSession, sessionCookie, tiktokConfigured } from "../_lib/tiktok";

export async function GET(request: Request): Promise<Response> {
  const gate = await guardSensitive(request, { rateKey: "status", limit: 60, windowMs: 60_000 });
  if (gate instanceof Response) return gate;
  if (!tiktokConfigured()) return missingConfig();
  const session = readSession(request, gate.sub);
  if (!session) return json({ configured: true, connected: false });
  try {
    const fresh = await refreshSession(request, session);
    const name = fresh.name || (await displayName(fresh.access));
    return json(
      { configured: true, connected: true, name },
      200,
      { "set-cookie": sessionCookie({ ...fresh, name, owner: gate.sub }, request) },
    );
  } catch {
    return json({ configured: true, connected: false });
  }
}
