import { json, sameOrigin } from "./_lib/http";
import { saveVoice, voiceStatus } from "./_lib/production";

export async function POST(request: Request): Promise<Response> {
  if (!sameOrigin(request)) return json({ error: "bad origin" }, 403);
  try {
    const body = (await request.json()) as { region?: string; key?: string };
    const region = String(body.region || "")
      .trim()
      .toLowerCase();
    const key = String(body.key || "").trim();
    if (!/^[a-z0-9]{3,24}$/.test(region)) return json({ error: "Ungültige Azure-Region." }, 400);
    if (key.length < 20) return json({ error: "Der Speech-Schlüssel ist zu kurz." }, 400);
    // Keys never leave this request; we only mark voice as configured for the desk.
    saveVoice(region);
    return json({ ok: true, ...voiceStatus() });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Speichern fehlgeschlagen" }, 400);
  }
}
