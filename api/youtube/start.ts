import { clientError, guardSensitive } from "../_lib/auth";
import { randomState } from "../_lib/http";
import { writeOauthState } from "../_lib/owned";
import { YT_STATE, youtubeConfigured, youtubeRedirect } from "../_lib/youtube";

export async function GET(request: Request): Promise<Response> {
  const gate = await guardSensitive(request, { rateKey: "oauth-start", limit: 10, windowMs: 60_000 });
  if (gate instanceof Response) return gate;
  if (!youtubeConfigured()) {
    return clientError(
      request,
      "Add YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in Cursor Secrets (Publish Settings), then connect again.",
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
  url.searchParams.set(
    "scope",
    [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/yt-analytics.readonly",
      "https://www.googleapis.com/auth/yt-analytics-monetary.readonly",
    ].join(" "),
  );
  url.searchParams.set("state", state);
  return new Response(null, {
    status: 302,
    headers: {
      location: url.toString(),
      "set-cookie": writeOauthState(YT_STATE, state, gate.sub, request),
      "cache-control": "private, no-store",
    },
  });
}
