import { requireSignedIn } from "../_lib/auth";
import { originOf } from "../_lib/http";
import { readOauthState } from "../_lib/owned";
import { YT_STATE, youtubeConfigured, youtubeCookie, youtubeRedirect } from "../_lib/youtube";

export async function GET(request: Request): Promise<Response> {
  const home = `${originOf(request)}/?live=1`;
  const who = await requireSignedIn(request);
  if (who instanceof Response) return Response.redirect(`${home}&youtube=signin`, 302);
  if (!youtubeConfigured()) return Response.redirect(`${home}&youtube=missing`, 302);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = readOauthState(request, YT_STATE, who.sub);
  if (!code || !state || !expected || state !== expected) {
    return Response.redirect(`${home}&youtube=denied`, 302);
  }
  const body = new URLSearchParams({
    client_id: process.env.YOUTUBE_CLIENT_ID ?? "",
    client_secret: process.env.YOUTUBE_CLIENT_SECRET ?? "",
    grant_type: "authorization_code",
    code,
    redirect_uri: youtubeRedirect(request),
  });
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const token = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!token.access_token || !token.refresh_token) {
    return Response.redirect(`${home}&youtube=denied`, 302);
  }
  let name = "YouTube";
  try {
    const me = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
      headers: { authorization: `Bearer ${token.access_token}` },
    });
    const data = (await me.json()) as { items?: Array<{ snippet?: { title?: string } }> };
    name = data.items?.[0]?.snippet?.title || name;
  } catch {
    /* optional */
  }
  return new Response(null, {
    status: 302,
    headers: {
      location: `${home}&youtube=connected`,
      "set-cookie": youtubeCookie(
        {
          owner: who.sub,
          access: token.access_token,
          refresh: token.refresh_token,
          expires: Date.now() + (token.expires_in ?? 3600) * 1000,
          name,
        },
        request,
      ),
      "cache-control": "private, no-store",
    },
  });
}
