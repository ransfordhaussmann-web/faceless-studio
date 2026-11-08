import { clearCookie, json } from "../_lib/http";
import { YT_COOKIE, YT_STATE } from "../_lib/youtube";

export async function POST(request: Request): Promise<Response> {
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
