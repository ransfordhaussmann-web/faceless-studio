import { json } from "./_lib/http";
import { GRAPH, metaConfigured, readMeta } from "./_lib/meta";
import { displayName, readSession, refreshSession, sessionCookie, tiktokConfigured } from "./_lib/tiktok";
import { readYouTube, refreshYouTube, youtubeConfigured, youtubeCookie } from "./_lib/youtube";

type ChannelMetrics = {
  connected: boolean;
  configured: boolean;
  name?: string;
  views: number | null;
  followers: number | null;
  posts: number | null;
  error?: string;
  href?: string;
};

type Snapshot = {
  source: "live" | "setup";
  checkedAt: string;
  connectedCount: number;
  channels: {
    youtube: ChannelMetrics;
    tiktok: ChannelMetrics;
    instagram: ChannelMetrics;
    facebook: ChannelMetrics;
  };
};

function empty(configured: boolean, href: string, error?: string): ChannelMetrics {
  return { connected: false, configured, views: null, followers: null, posts: null, href, error };
}

async function youtubeLive(request: Request): Promise<{ channel: ChannelMetrics; cookie?: string }> {
  const href = "/api/youtube/start";
  if (!youtubeConfigured()) {
    return {
      channel: empty(
        false,
        href,
        "YouTube is not configured yet. Add YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in Cursor Secrets.",
      ),
    };
  }
  const session = readYouTube(request);
  if (!session) return { channel: empty(true, href) };
  try {
    const fresh = await refreshYouTube(request, session);
    const response = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
      { headers: { authorization: `Bearer ${fresh.access}` } },
    );
    const data = (await response.json()) as {
      items?: Array<{
        snippet?: { title?: string };
        statistics?: { viewCount?: string; subscriberCount?: string; videoCount?: string };
      }>;
    };
    const item = data.items?.[0];
    const name = item?.snippet?.title || fresh.name || "YouTube";
    return {
      channel: {
        connected: true,
        configured: true,
        name,
        views: Number(item?.statistics?.viewCount ?? 0),
        followers: Number(item?.statistics?.subscriberCount ?? 0),
        posts: Number(item?.statistics?.videoCount ?? 0),
        href,
      },
      cookie: youtubeCookie({ ...fresh, name }, request),
    };
  } catch (error) {
    return {
      channel: empty(true, href, error instanceof Error ? error.message : "YouTube session expired"),
    };
  }
}

async function tiktokLive(request: Request): Promise<{ channel: ChannelMetrics; cookie?: string }> {
  const href = "/api/tiktok/start";
  if (!tiktokConfigured()) {
    return {
      channel: empty(
        false,
        href,
        "TikTok is not configured yet. Add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET in Cursor Secrets.",
      ),
    };
  }
  const session = readSession(request);
  if (!session) return { channel: empty(true, href) };
  try {
    const fresh = await refreshSession(request, session);
    const response = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=display_name,username,follower_count,video_count,likes_count",
      { headers: { authorization: `Bearer ${fresh.access}` } },
    );
    const data = (await response.json()) as {
      data?: {
        user?: {
          display_name?: string;
          username?: string;
          follower_count?: number;
          video_count?: number;
          likes_count?: number;
        };
      };
      error?: { message?: string };
    };
    const user = data.data?.user;
    const name = user?.username || user?.display_name || fresh.name || (await displayName(fresh.access));
    return {
      channel: {
        connected: true,
        configured: true,
        name,
        views: user?.likes_count ?? null,
        followers: user?.follower_count ?? null,
        posts: user?.video_count ?? null,
        href,
        error: data.error?.message,
      },
      cookie: sessionCookie({ ...fresh, name }, request),
    };
  } catch (error) {
    return {
      channel: empty(true, href, error instanceof Error ? error.message : "TikTok session expired"),
    };
  }
}

async function metaLive(request: Request): Promise<{ facebook: ChannelMetrics; instagram: ChannelMetrics }> {
  const href = "/api/meta/start";
  if (!metaConfigured()) {
    const missing = empty(
      false,
      href,
      "Facebook is not configured yet. Add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in Cursor Secrets.",
    );
    return { facebook: missing, instagram: { ...missing } };
  }
  const session = readMeta(request);
  if (!session) {
    return { facebook: empty(true, href), instagram: empty(true, href) };
  }

  let facebook: ChannelMetrics = {
    connected: true,
    configured: true,
    name: session.pageName,
    views: null,
    followers: null,
    posts: null,
    href,
  };
  try {
    const pageUrl = new URL(`https://graph.facebook.com/${GRAPH}/${session.pageId}`);
    pageUrl.searchParams.set("fields", "name,fan_count,followers_count");
    pageUrl.searchParams.set("access_token", session.pageToken);
    const page = (await (await fetch(pageUrl)).json()) as {
      name?: string;
      fan_count?: number;
      followers_count?: number;
      error?: { message?: string };
    };
    facebook = {
      connected: true,
      configured: true,
      name: page.name || session.pageName,
      views: null,
      followers: page.followers_count ?? page.fan_count ?? null,
      posts: null,
      href,
      error: page.error?.message,
    };
  } catch (error) {
    facebook.error = error instanceof Error ? error.message : "Facebook stats unavailable";
  }

  if (!session.igId) {
    return {
      facebook,
      instagram: empty(
        true,
        href,
        "Link a professional Instagram account to your Facebook Page, then connect again.",
      ),
    };
  }

  let instagram: ChannelMetrics = {
    connected: true,
    configured: true,
    name: session.igName || "Instagram",
    views: null,
    followers: null,
    posts: null,
    href,
  };
  try {
    const igUrl = new URL(`https://graph.facebook.com/${GRAPH}/${session.igId}`);
    igUrl.searchParams.set("fields", "username,followers_count,media_count");
    igUrl.searchParams.set("access_token", session.pageToken);
    const ig = (await (await fetch(igUrl)).json()) as {
      username?: string;
      followers_count?: number;
      media_count?: number;
      error?: { message?: string };
    };
    instagram = {
      connected: true,
      configured: true,
      name: ig.username || session.igName || "Instagram",
      views: null,
      followers: ig.followers_count ?? null,
      posts: ig.media_count ?? null,
      href,
      error: ig.error?.message,
    };
  } catch (error) {
    instagram.error = error instanceof Error ? error.message : "Instagram stats unavailable";
  }

  return { facebook, instagram };
}

export async function GET(request: Request): Promise<Response> {
  const [youtube, tiktok, meta] = await Promise.all([youtubeLive(request), tiktokLive(request), metaLive(request)]);
  const channels = {
    youtube: youtube.channel,
    tiktok: tiktok.channel,
    instagram: meta.instagram,
    facebook: meta.facebook,
  };
  const connectedCount = Object.values(channels).filter((item) => item.connected).length;
  const snapshot: Snapshot = {
    source: connectedCount ? "live" : "setup",
    checkedAt: new Date().toISOString(),
    connectedCount,
    channels,
  };

  const cookies = [youtube.cookie, tiktok.cookie].filter(Boolean) as string[];
  if (!cookies.length) return json({ snapshot });
  return new Response(JSON.stringify({ snapshot }), {
    status: 200,
    headers: [
      ["content-type", "application/json; charset=utf-8"],
      ["cache-control", "private, no-store"],
      ...cookies.map((cookie) => ["set-cookie", cookie] as [string, string]),
    ],
  });
}
