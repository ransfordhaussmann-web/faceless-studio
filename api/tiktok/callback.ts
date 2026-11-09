import { requireSignedIn } from "../_lib/auth";
import { json, originOf, readCookie } from "../_lib/http";
import { displayName, redirectUri, sessionCookie, TT_STATE, tiktokConfigured } from "../_lib/tiktok";

export async function GET(request: Request): Promise<Response> {
  const home = `${originOf(request)}/?live=1`;
  const who = await requireSignedIn(request);
  if (who instanceof Response) return Response.redirect(`${home}&tiktok=signin`, 302);
  if (!tiktokConfigured()) {
    return Response.redirect(`${home}&tiktok=missing`, 302);
  }
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = readCookie(request, TT_STATE);
  if (!code || !state || !expected || state !== expected) {
    return Response.redirect(`${home}&tiktok=denied`, 302);
  }
  const body = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY ?? "",
    client_secret: process.env.TIKTOK_CLIENT_SECRET ?? "",
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(request),
  });
  const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const token = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    open_id?: string;
    error?: string;
  };
  if (!token.access_token || !token.refresh_token) {
    return Response.redirect(`${home}&tiktok=denied`, 302);
  }
  let name = "TikTok";
  try {
    name = await displayName(token.access_token);
  } catch {
    /* username is optional */
  }
  const cookie = sessionCookie(
    {
      access: token.access_token,
      refresh: token.refresh_token,
      openId: token.open_id ?? "",
      expires: Date.now() + (token.expires_in ?? 86400) * 1000,
      name,
    },
    request,
  );
  return new Response(null, {
    status: 302,
    headers: {
      location: `${home}&tiktok=connected`,
      "set-cookie": cookie,
      "cache-control": "private, no-store",
    },
  });
}

export async function POST(): Promise<Response> {
  return json({ error: "use GET" }, 405);
}
