import { json } from "../_lib/http";
import { readYouTube, refreshYouTube, youtubeConfigured, youtubeCookie, youtubeMissing } from "../_lib/youtube";

export async function GET(request: Request): Promise<Response> {
  if (!youtubeConfigured()) return youtubeMissing();
  const session = readYouTube(request);
  if (!session) return json({ configured: true, connected: false });
  try {
    const fresh = await refreshYouTube(request, session);
    return json(
      { configured: true, connected: true, name: fresh.name },
      200,
      { "set-cookie": youtubeCookie(fresh, request) },
    );
  } catch {
    return json({ configured: true, connected: false });
  }
}
