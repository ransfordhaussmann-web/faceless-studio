import { json, originOf, readCookie, setCookie } from "./http";

export const GRAPH = "v21.0";
export const META_COOKIE = "fs_meta";
export const META_STATE = "fs_meta_state";

export type MetaSession = {
  user: string;
  expires: number;
  pageId: string;
  pageToken: string;
  pageName: string;
  igId: string;
  igName: string;
};

export function metaConfigured(): boolean {
  return Boolean(process.env.FACEBOOK_APP_ID?.trim() && process.env.FACEBOOK_APP_SECRET?.trim());
}

export function readMeta(request: Request): MetaSession | null {
  const raw = readCookie(request, META_COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as MetaSession;
    if (!parsed.pageToken || !parsed.pageId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function metaCookie(session: MetaSession, request: Request): string {
  return setCookie(META_COOKIE, JSON.stringify(session), request);
}

export function metaRedirect(request: Request): string {
  return `${originOf(request)}/api/meta/callback`;
}

export function metaMissing(): Response {
  const account = {
    configured: false,
    connected: false,
    error: "Facebook is not configured yet. Add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in Cursor Secrets.",
  };
  return json({
    configured: false,
    connected: false,
    facebook: account,
    instagram: account,
    error: account.error,
  });
}

export function isMetaUploadHost(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname;
    return (
      host === "rupload.facebook.com" ||
      host === "graph.facebook.com" ||
      host === "graph-video.facebook.com" ||
      host.endsWith(".facebook.com") ||
      host.endsWith(".fbcdn.net")
    );
  } catch {
    return false;
  }
}

export async function graphGet<T>(path: string, token: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`https://graph.facebook.com/${GRAPH}${path}`);
  url.searchParams.set("access_token", token);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url);
  return (await response.json()) as T;
}

export async function graphPost<T>(path: string, token: string, body: Record<string, string>): Promise<T> {
  const url = new URL(`https://graph.facebook.com/${GRAPH}${path}`);
  const form = new URLSearchParams({ ...body, access_token: token });
  const response = await fetch(url, { method: "POST", body: form });
  return (await response.json()) as T;
}
