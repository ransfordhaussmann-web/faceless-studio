import { json, originOf, readCookie, setCookie } from "./http";
import { forViewer, type Owned } from "./owned";

export const YT_COOKIE = "fs_youtube";
export const YT_STATE = "fs_youtube_state";

export type YouTubeSession = Owned & {
  access: string;
  refresh: string;
  expires: number;
  name: string;
};

export function youtubeConfigured(): boolean {
  return Boolean(process.env.YOUTUBE_CLIENT_ID?.trim() && process.env.YOUTUBE_CLIENT_SECRET?.trim());
}

export function readYouTube(request: Request, viewerSub: string): YouTubeSession | null {
  const raw = readCookie(request, YT_COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as YouTubeSession;
    if (!parsed.access || !parsed.refresh) return null;
    return forViewer(parsed, viewerSub);
  } catch {
    return null;
  }
}

export function youtubeCookie(session: YouTubeSession, request: Request): string {
  if (!session.owner) throw new Error("YouTube session missing owner");
  return setCookie(YT_COOKIE, JSON.stringify(session), request);
}

export function youtubeRedirect(request: Request): string {
  return `${originOf(request)}/api/youtube/callback`;
}

export async function refreshYouTube(request: Request, session: YouTubeSession): Promise<YouTubeSession> {
  if (session.expires > Date.now() + 60_000) return session;
  const body = new URLSearchParams({
    client_id: process.env.YOUTUBE_CLIENT_ID ?? "",
    client_secret: process.env.YOUTUBE_CLIENT_SECRET ?? "",
    grant_type: "refresh_token",
    refresh_token: session.refresh,
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!data.access_token) throw new Error(data.error || "YouTube session expired");
  return {
    ...session,
    owner: session.owner,
    access: data.access_token,
    expires: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
}

export function youtubeMissing(): Response {
  return json({
    configured: false,
    connected: false,
    error: "YouTube is not configured yet. Add YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in Cursor Secrets.",
  });
}
