import { guardSensitive } from "../_lib/auth";
import { json } from "../_lib/http";
import { metaConfigured, metaMissing, readMeta } from "../_lib/meta";

export async function GET(request: Request): Promise<Response> {
  const gate = await guardSensitive(request, { rateKey: "status", limit: 60, windowMs: 60_000 });
  if (gate instanceof Response) return gate;
  if (!metaConfigured()) return metaMissing();
  const session = readMeta(request, gate.sub);
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
