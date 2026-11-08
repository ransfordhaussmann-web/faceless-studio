import { json, randomState, setCookie } from "../_lib/http";
import { YT_STATE, youtubeConfigured, youtubeRedirect } from "../_lib/youtube";

export async function GET(request: Request): Promise<Response> {
  if (!youtubeConfigured()) {
    return json(
      { error: "Add YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in Cursor Secrets, then connect again." },
      501,
    );
  }
  const state = randomState();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.YOUTUBE_CLIENT_ID ?? "");
  url.searchParams.set("redirect_uri", youtubeRedirect(request));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly");
  url.searchParams.set("state", state);
  return new Response(null, {
    status: 302,
    headers: {
      location: url.toString(),
      "set-cookie": setCookie(YT_STATE, state, request, 600),
      "cache-control": "private, no-store",
    },
  });
}
