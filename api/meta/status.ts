import { json } from "../_lib/http";
import { metaConfigured, metaMissing, readMeta } from "../_lib/meta";

export async function GET(request: Request): Promise<Response> {
  if (!metaConfigured()) return metaMissing();
  const session = readMeta(request);
  if (!session) {
    return json({
      configured: true,
      facebook: { configured: true, connected: false },
      instagram: { configured: true, connected: false },
    });
  }
  return json({
    configured: true,
    facebook: { configured: true, connected: true, name: session.pageName },
    instagram: session.igId
      ? { configured: true, connected: true, name: session.igName || "Instagram" }
      : {
          configured: true,
          connected: false,
          error: "Link a professional Instagram account to your Facebook Page, then connect again.",
        },
  });
}
