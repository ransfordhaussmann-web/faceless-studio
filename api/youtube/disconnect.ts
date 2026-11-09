import { guardSensitive } from "../_lib/auth";
import { clearCookie } from "../_lib/http";
import { YT_COOKIE, YT_STATE } from "../_lib/youtube";

export async function POST(request: Request): Promise<Response> {
  const gate = await guardSensitive(request, { rateKey: "disconnect", limit: 20, windowMs: 60_000 });
  if (gate instanceof Response) return gate;
  return new Response(JSON.stringify({ connected: false }), {
    status: 200,
    headers: [
      ["content-type", "application/json; charset=utf-8"],
      ["cache-control", "private, no-store"],
      ["set-cookie", clearCookie(YT_COOKIE, request)],
      ["set-cookie", clearCookie(YT_STATE, request)],
    ],
  });
}
