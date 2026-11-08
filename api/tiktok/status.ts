import { json } from "../_lib/http";
import { displayName, missingConfig, readSession, refreshSession, sessionCookie, tiktokConfigured } from "../_lib/tiktok";

export async function GET(request: Request): Promise<Response> {
  if (!tiktokConfigured()) return missingConfig();
  const session = readSession(request);
  if (!session) return json({ configured: true, connected: false });
  try {
    const fresh = await refreshSession(request, session);
    const name = fresh.name || (await displayName(fresh.access));
    return json(
      { configured: true, connected: true, name },
      200,
      { "set-cookie": sessionCookie({ ...fresh, name }, request) },
    );
  } catch {
    return json({ configured: true, connected: false });
  }
}
