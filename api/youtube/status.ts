import { guardSensitive } from "../_lib/auth";
import { json } from "../_lib/http";
import { readYouTube, refreshYouTube, youtubeConfigured, youtubeCookie, youtubeMissing } from "../_lib/youtube";

export async function GET(request: Request): Promise<Response> {
  const gate = await guardSensitive(request, { rateKey: "status", limit: 60, windowMs: 60_000 });
  if (gate instanceof Response) return gate;
  if (!youtubeConfigured()) return youtubeMissing();
  const session = readYouTube(request, gate.sub);
  if (!session) return json({ configured: true, connected: false });
  try {
    const fresh = await refreshYouTube(request, session);
    return json(
      { configured: true, connected: true, name: fresh.name },
      200,
      { "set-cookie": youtubeCookie({ ...fresh, owner: gate.sub }, request) },
    );
  } catch {
    return json({ configured: true, connected: false });
  }
}
