import { originOf, readCookie } from "../_lib/http";
import { graphGet, META_STATE, metaConfigured, metaCookie, metaRedirect } from "../_lib/meta";

type Token = { access_token?: string; expires_in?: number };
type Page = {
  id?: string;
  name?: string;
  access_token?: string;
  instagram_business_account?: { id?: string; username?: string };
};
type Pages = { data?: Page[] };

export async function GET(request: Request): Promise<Response> {
  const home = `${originOf(request)}/?view=channel`;
  if (!metaConfigured()) return Response.redirect(`${home}&meta=missing`, 302);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = readCookie(request, META_STATE);
  if (!code || !state || !expected || state !== expected) {
    return Response.redirect(`${home}&meta=denied`, 302);
  }

  const shortUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
  shortUrl.searchParams.set("client_id", process.env.FACEBOOK_APP_ID ?? "");
  shortUrl.searchParams.set("client_secret", process.env.FACEBOOK_APP_SECRET ?? "");
  shortUrl.searchParams.set("redirect_uri", metaRedirect(request));
  shortUrl.searchParams.set("code", code);
  const shortTok = (await (await fetch(shortUrl)).json()) as Token;
  if (!shortTok.access_token) return Response.redirect(`${home}&meta=denied`, 302);

  const longUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
  longUrl.searchParams.set("grant_type", "fb_exchange_token");
  longUrl.searchParams.set("client_id", process.env.FACEBOOK_APP_ID ?? "");
  longUrl.searchParams.set("client_secret", process.env.FACEBOOK_APP_SECRET ?? "");
  longUrl.searchParams.set("fb_exchange_token", shortTok.access_token);
  const longTok = (await (await fetch(longUrl)).json()) as Token;
  const user = longTok.access_token || shortTok.access_token;
  const expires = Date.now() + (longTok.expires_in ?? 60 * 24 * 3600) * 1000;

  const pages = await graphGet<Pages>("/me/accounts", user, {
    fields: "name,access_token,instagram_business_account{id,username}",
  });
  const page = pages.data?.find((item) => item.id && item.access_token);
  if (!page?.id || !page.access_token) {
    return Response.redirect(`${home}&meta=nopage`, 302);
  }

  return new Response(null, {
    status: 302,
    headers: {
      location: `${home}&meta=connected`,
      "set-cookie": metaCookie(
        {
          user,
          expires,
          pageId: page.id,
          pageToken: page.access_token,
          pageName: page.name || "Facebook Page",
          igId: page.instagram_business_account?.id || "",
          igName: page.instagram_business_account?.username || "",
        },
        request,
      ),
      "cache-control": "private, no-store",
    },
  });
}
