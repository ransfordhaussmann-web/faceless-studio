import { json, originOf, readCookie, setCookie } from "./http";

export const TT_COOKIE = "fs_tiktok";
export const TT_STATE = "fs_tiktok_state";

type TikTokSession = {
  access: string;
  refresh: string;
  openId: string;
  expires: number;
  name: string;
};

export function tiktokConfigured(): boolean {
  return Boolean(process.env.TIKTOK_CLIENT_KEY?.trim() && process.env.TIKTOK_CLIENT_SECRET?.trim());
}

export function readSession(request: Request): TikTokSession | null {
  const raw = readCookie(request, TT_COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as TikTokSession;
    if (!parsed.access || !parsed.refresh) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function sessionCookie(session: TikTokSession, request: Request): string {
  return setCookie(TT_COOKIE, JSON.stringify(session), request);
}

export async function refreshSession(request: Request, session: TikTokSession): Promise<TikTokSession> {
  if (session.expires > Date.now() + 60_000) return session;
  const body = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY ?? "",
    client_secret: process.env.TIKTOK_CLIENT_SECRET ?? "",
    grant_type: "refresh_token",
    refresh_token: session.refresh,
  });
  const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    open_id?: string;
    error?: string;
    error_description?: string;
  };
  if (!data.access_token) {
    throw new Error(data.error_description || data.error || "TikTok session expired");
  }
  return {
    access: data.access_token,
    refresh: data.refresh_token || session.refresh,
    openId: data.open_id || session.openId,
    expires: Date.now() + (data.expires_in ?? 86400) * 1000,
    name: session.name,
  };
}

export async function displayName(access: string): Promise<string> {
  const response = await fetch(
    "https://open.tiktokapis.com/v2/user/info/?fields=display_name,username",
    { headers: { authorization: `Bearer ${access}` } },
  );
  const data = (await response.json()) as {
    data?: { user?: { display_name?: string; username?: string } };
  };
  return data.data?.user?.username || data.data?.user?.display_name || "TikTok";
}

export function missingConfig(): Response {
  return json(
    {
      configured: false,
      connected: false,
      error: "TikTok is not configured yet. Add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET in Cursor Secrets.",
    },
    200,
  );
}

export function redirectUri(request: Request): string {
  return `${originOf(request)}/api/tiktok/callback`;
}

export function isTikTokUploadHost(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.endsWith("tiktokapis.com");
  } catch {
    return false;
  }
}
