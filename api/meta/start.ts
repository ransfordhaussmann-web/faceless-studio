import { guardSensitive } from "../_lib/auth";
import { json, randomState, setCookie } from "../_lib/http";
import { META_STATE, metaConfigured, metaRedirect } from "../_lib/meta";

export async function GET(request: Request): Promise<Response> {
  const gate = await guardSensitive(request, { rateKey: "oauth-start", limit: 10, windowMs: 60_000 });
  if (gate instanceof Response) return gate;
  if (!metaConfigured()) {
    return json(
      { error: "Add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in Cursor Secrets, then connect again." },
      501,
    );
  }
  const state = randomState();
  const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  url.searchParams.set("client_id", process.env.FACEBOOK_APP_ID ?? "");
  url.searchParams.set("redirect_uri", metaRedirect(request));
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set(
    "scope",
    "pages_show_list,pages_manage_posts,pages_read_engagement,pages_read_user_content,instagram_basic,instagram_manage_insights,instagram_content_publish,read_insights",
  );
  return new Response(null, {
    status: 302,
    headers: {
      location: url.toString(),
      "set-cookie": setCookie(META_STATE, state, request, 600),
      "cache-control": "private, no-store",
    },
  });
}
