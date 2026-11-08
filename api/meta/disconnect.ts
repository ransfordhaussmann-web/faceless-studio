import { clearCookie } from "../_lib/http";
import { META_COOKIE, META_STATE } from "../_lib/meta";

export async function POST(request: Request): Promise<Response> {
  return new Response(JSON.stringify({ connected: false }), {
    status: 200,
    headers: [
      ["content-type", "application/json; charset=utf-8"],
      ["cache-control", "private, no-store"],
      ["set-cookie", clearCookie(META_COOKIE, request)],
      ["set-cookie", clearCookie(META_STATE, request)],
    ],
  });
}
