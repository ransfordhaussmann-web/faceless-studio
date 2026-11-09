import { guardSensitive } from "../_lib/auth";
import { clearCookie } from "../_lib/http";
import { TT_COOKIE, TT_STATE } from "../_lib/tiktok";

export async function POST(request: Request): Promise<Response> {
  const gate = await guardSensitive(request, { rateKey: "disconnect", limit: 20, windowMs: 60_000 });
  if (gate instanceof Response) return gate;
  return new Response(JSON.stringify({ connected: false }), {
    status: 200,
    headers: [
      ["content-type", "application/json; charset=utf-8"],
      ["cache-control", "private, no-store"],
      ["set-cookie", clearCookie(TT_COOKIE, request)],
      ["set-cookie", clearCookie(TT_STATE, request)],
    ],
  });
}
