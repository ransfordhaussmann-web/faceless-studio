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
  revenue: number | null;
  currency?: string;
  error?: string;
  href?: string;
};

type MoneyRow = {
  network: "youtube" | "tiktok" | "instagram" | "facebook";
  label: string;
  amount: number | null;
  currency: string;
  note: string;
};

type Snapshot = {
  source: "live" | "setup";
  checkedAt: string;
  connectedCount: number;
  period: { from: string; to: string; label: string };
  money: {
    total: number | null;
    currency: string;
    rows: MoneyRow[];
    note: string;
  };
  channels: {
    youtube: ChannelMetrics;
    tiktok: ChannelMetrics;
    instagram: ChannelMetrics;
    facebook: ChannelMetrics;
  };
};

function empty(configured: boolean, href: string, error?: string): ChannelMetrics {
  return {
    connected: false,
    configured,
    views: null,
    followers: null,
    posts: null,
    revenue: null,
    href,
    error,
  };
}

function periodRange() {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 28);
  const stamp = (value: Date) => value.toISOString().slice(0, 10);
  return {
    from: stamp(from),
    to: stamp(to),
    label: "Last 28 days",
  };
}

async function youtubeRevenue(access: string, from: string, to: string): Promise<{ amount: number | null; note: string }> {
  try {
    const url = new URL("https://youtubeanalytics.googleapis.com/v2/reports");
    url.searchParams.set("ids", "channel==MINE");
    url.searchParams.set("startDate", from);
    url.searchParams.set("endDate", to);
    url.searchParams.set("metrics", "estimatedRevenue");
    const response = await fetch(url, { headers: { authorization: `Bearer ${access}` } });
    const data = (await response.json()) as {
      rows?: number[][];
      error?: { message?: string };
    };
    if (data.error?.message) {
      return {
        amount: null,
        note: /insufficient|scope|permission|forbidden/i.test(data.error.message)
          ? "Reconnect YouTube and allow revenue access, or monetization is off."
          : data.error.message,
      };
    }
    const amount = data.rows?.[0]?.[0];
    if (typeof amount !== "number") {
      return { amount: null, note: "No YouTube revenue in this period yet." };
    }
    return { amount, note: "YouTube estimated revenue (ads)." };
  } catch (error) {
    return {
      amount: null,
      note: error instanceof Error ? error.message : "YouTube revenue unavailable",
    };
  }
}

async function youtubeLive(
  request: Request,
  from: string,
  to: string,
): Promise<{ channel: ChannelMetrics; cookie?: string; moneyNote: string }> {
  const href = "/api/youtube/start";
  if (!youtubeConfigured()) {
    return {
      channel: empty(
        false,
        href,
        "YouTube is not configured yet. Add YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in Cursor Secrets.",
      ),
      moneyNote: "Connect YouTube to load ad revenue.",
    };
  }
  const session = readYouTube(request);
  if (!session) return { channel: empty(true, href), moneyNote: "Connect YouTube to load ad revenue." };
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
    const money = await youtubeRevenue(fresh.access, from, to);
    return {
      channel: {
        connected: true,
        configured: true,
        name,
        views: Number(item?.statistics?.viewCount ?? 0),
        followers: Number(item?.statistics?.subscriberCount ?? 0),
        posts: Number(item?.statistics?.videoCount ?? 0),
        revenue: money.amount,
        currency: "CHF",
        href,
      },
      cookie: youtubeCookie({ ...fresh, name }, request),
      moneyNote: money.note,
    };
  } catch (error) {
    return {
      channel: empty(true, href, error instanceof Error ? error.message : "YouTube session expired"),
      moneyNote: "YouTube revenue unavailable.",
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
        revenue: null,
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

function numberish(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).reduce<number>((sum, item) => sum + numberish(item), 0);
  }
  return 0;
}

async function insightSum(
  path: string,
  token: string,
  metric: string,
  from?: string,
  to?: string,
): Promise<number | null> {
  const url = new URL(`https://graph.facebook.com/${GRAPH}${path}`);
  url.searchParams.set("metric", metric);
  url.searchParams.set("period", "day");
  url.searchParams.set("access_token", token);
  if (from) url.searchParams.set("since", from);
  if (to) url.searchParams.set("until", to);
  const data = (await (await fetch(url)).json()) as {
    data?: Array<{ values?: Array<{ value?: unknown }> }>;
    error?: { message?: string };
  };
  if (data.error?.message) return null;
  const values = data.data?.[0]?.values || [];
  if (!values.length) return null;
  const total = values.reduce((sum, item) => sum + numberish(item.value), 0);
  return total;
}

async function facebookEarnings(
  pageId: string,
  token: string,
  from: string,
  to: string,
): Promise<{ amount: number | null; note: string }> {
  const metrics = [
    "page_daily_video_ad_break_earnings_by_crosspost_status",
    "post_video_ad_break_earnings",
  ];
  for (const metric of metrics) {
    const raw = await insightSum(`/${pageId}/insights`, token, metric, from, to);
    if (raw === null) continue;
    // Meta documents several ad-break earnings metrics in U.S. cents.
    const amount = raw > 1000 ? raw / 100 : raw;
    return {
      amount,
      note: "Facebook in-stream / ad-break estimate for this Page (last 28 days).",
    };
  }

  // Fallback: sum lifetime earnings on recent Page videos (cents → major units).
  try {
    const listUrl = new URL(`https://graph.facebook.com/${GRAPH}/${pageId}/videos`);
    listUrl.searchParams.set("fields", "id");
    listUrl.searchParams.set("limit", "20");
    listUrl.searchParams.set("access_token", token);
    const list = (await (await fetch(listUrl)).json()) as { data?: Array<{ id?: string }> };
    let cents = 0;
    let hits = 0;
    for (const video of list.data || []) {
      if (!video.id) continue;
      const insightUrl = new URL(`https://graph.facebook.com/${GRAPH}/${video.id}/video_insights`);
      insightUrl.searchParams.set("metric", "total_video_ad_break_earnings");
      insightUrl.searchParams.set("period", "lifetime");
      insightUrl.searchParams.set("access_token", token);
      const insight = (await (await fetch(insightUrl)).json()) as {
        data?: Array<{ values?: Array<{ value?: number }> }>;
      };
      const value = insight.data?.[0]?.values?.[0]?.value;
      if (typeof value === "number") {
        cents += value;
        hits += 1;
      }
    }
    if (hits) {
      return {
        amount: cents / 100,
        note: `Facebook ad-break estimate from ${hits} recent videos (lifetime, USD).`,
      };
    }
  } catch {
    /* optional */
  }
  return {
    amount: null,
    note: "No Facebook ad-break earnings in this period (monetization may be off).",
  };
}

async function metaLive(
  request: Request,
  from: string,
  to: string,
): Promise<{ facebook: ChannelMetrics; instagram: ChannelMetrics; facebookMoneyNote: string; instagramMoneyNote: string }> {
  const href = "/api/meta/start";
  if (!metaConfigured()) {
    const missing = empty(
      false,
      href,
      "Facebook is not configured yet. Add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in Cursor Secrets.",
    );
    return {
      facebook: missing,
      instagram: { ...missing },
      facebookMoneyNote: "Connect Facebook to load Page earnings.",
      instagramMoneyNote: "Connect Instagram via Facebook first.",
    };
  }
  const session = readMeta(request);
  if (!session) {
    return {
      facebook: empty(true, href),
      instagram: empty(true, href),
      facebookMoneyNote: "Connect Facebook to load Page earnings.",
      instagramMoneyNote: "Connect Instagram via Facebook first.",
    };
  }

  let facebook: ChannelMetrics = {
    connected: true,
    configured: true,
    name: session.pageName,
    views: null,
    followers: null,
    posts: null,
    revenue: null,
    href,
  };
  let facebookMoneyNote = "Facebook earnings unavailable.";
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
    const impressions = await insightSum(
      `/${session.pageId}/insights`,
      session.pageToken,
      "page_impressions",
      from,
      to,
    );
    const money = await facebookEarnings(session.pageId, session.pageToken, from, to);
    facebookMoneyNote = money.note;
    facebook = {
      connected: true,
      configured: true,
      name: page.name || session.pageName,
      views: impressions,
      followers: page.followers_count ?? page.fan_count ?? null,
      posts: null,
      revenue: money.amount,
      currency: "CHF",
      href,
      error: page.error?.message,
    };
  } catch (error) {
    facebook.error = error instanceof Error ? error.message : "Facebook stats unavailable";
    facebookMoneyNote = facebook.error;
  }

  if (!session.igId) {
    return {
      facebook,
      instagram: empty(
        true,
        href,
        "Link a professional Instagram account to your Facebook Page, then connect again.",
      ),
      facebookMoneyNote,
      instagramMoneyNote: "Link a professional Instagram account to your Facebook Page.",
    };
  }

  let instagram: ChannelMetrics = {
    connected: true,
    configured: true,
    name: session.igName || "Instagram",
    views: null,
    followers: null,
    posts: null,
    revenue: null,
    href,
  };
  let instagramMoneyNote =
    "Instagram Reels bonuses / gifts are not exposed on this Graph login yet.";
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
    const reach = await insightSum(`/${session.igId}/insights`, session.pageToken, "reach", from, to);
    instagram = {
      connected: true,
      configured: true,
      name: ig.username || session.igName || "Instagram",
      views: reach,
      followers: ig.followers_count ?? null,
      posts: ig.media_count ?? null,
      revenue: null,
      href,
      error: ig.error?.message,
    };
  } catch (error) {
    instagram.error = error instanceof Error ? error.message : "Instagram stats unavailable";
    instagramMoneyNote = instagram.error;
  }

  return { facebook, instagram, facebookMoneyNote, instagramMoneyNote };
}

export async function GET(request: Request): Promise<Response> {
  const period = periodRange();
  const [youtube, tiktok, meta] = await Promise.all([
    youtubeLive(request, period.from, period.to),
    tiktokLive(request),
    metaLive(request, period.from, period.to),
  ]);
  const channels = {
    youtube: youtube.channel,
    tiktok: tiktok.channel,
    instagram: meta.instagram,
    facebook: meta.facebook,
  };
  const connectedCount = Object.values(channels).filter((item) => item.connected).length;
  const rows: MoneyRow[] = [
    {
      network: "youtube",
      label: channels.youtube.name || "YouTube",
      amount: channels.youtube.revenue,
      currency: "CHF",
      note: youtube.moneyNote,
    },
    {
      network: "tiktok",
      label: channels.tiktok.name || "TikTok",
      amount: channels.tiktok.revenue,
      currency: "CHF",
      note: channels.tiktok.connected
        ? "TikTok Creator Rewards are not available through the public posting API yet."
        : "Connect TikTok first.",
    },
    {
      network: "instagram",
      label: channels.instagram.name || "Instagram",
      amount: channels.instagram.revenue,
      currency: "CHF",
      note: meta.instagramMoneyNote,
    },
    {
      network: "facebook",
      label: channels.facebook.name || "Facebook",
      amount: channels.facebook.revenue,
      currency: "CHF",
      note: meta.facebookMoneyNote,
    },
  ];
  const known = rows.map((row) => row.amount).filter((value): value is number => typeof value === "number");
  const reporting = rows.filter((row) => channels[row.network].connected).length;
  const snapshot: Snapshot = {
    source: connectedCount ? "live" : "setup",
    checkedAt: new Date().toISOString(),
    connectedCount,
    period,
    money: {
      total: known.length ? known.reduce((sum, value) => sum + value, 0) : null,
      currency: "CHF",
      rows,
      note:
        known.length > 0
          ? `${period.label} · Money made from all connected accounts that report earnings (${known.length} of ${Math.max(reporting, 1)}).`
          : `${period.label} · Connect YouTube + Facebook (monetized) to fill Money made from all accounts. TikTok/Instagram payouts appear when those APIs allow it.`,
    },
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
