import { guardSensitive } from "../_lib/auth";
import { json, originOf, randomState, setCookie } from "../_lib/http";
import { TT_STATE, tiktokConfigured } from "../_lib/tiktok";

export async function GET(request: Request): Promise<Response> {
  const gate = await guardSensitive(request, { rateKey: "oauth-start", limit: 10, windowMs: 60_000 });
  if (gate instanceof Response) return gate;
  if (!tiktokConfigured()) {
    return json(
      { error: "Add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET in Cursor Secrets, then connect again." },
      501,
    );
  }
  const state = randomState();
  const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
  url.searchParams.set("client_key", process.env.TIKTOK_CLIENT_KEY ?? "");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "user.info.basic,user.info.stats,video.publish,video.upload");
  url.searchParams.set("redirect_uri", `${originOf(request)}/api/tiktok/callback`);
  url.searchParams.set("state", state);
  return new Response(null, {
    status: 302,
    headers: {
      location: url.toString(),
      "set-cookie": setCookie(TT_STATE, state, request, 600),
      "cache-control": "private, no-store",
    },
  });
}
