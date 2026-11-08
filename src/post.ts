import { getFile } from "./files";
import type { Short } from "./studio";

export type AccountStatus = {
  configured: boolean;
  connected: boolean;
  name?: string;
  error?: string;
};

export type Accounts = {
  tiktok: AccountStatus;
  youtube: AccountStatus;
  facebook: AccountStatus;
  instagram: AccountStatus;
};

export type PostTarget = "tiktok" | "youtube" | "facebook" | "instagram";

export type PostResult = {
  target: PostTarget;
  ok: boolean;
  message: string;
  mode?: string;
};

export function emptyAccounts(): Accounts {
  return {
    tiktok: { configured: false, connected: false },
    youtube: { configured: false, connected: false },
    facebook: { configured: false, connected: false },
    instagram: { configured: false, connected: false },
  };
}

export function anyConnected(accounts: Accounts): boolean {
  return accounts.tiktok.connected || accounts.youtube.connected || accounts.facebook.connected || accounts.instagram.connected;
}

async function statusOf(path: string): Promise<AccountStatus> {
  try {
    const response = await fetch(path, { credentials: "include" });
    if (response.status === 404) {
      return { configured: false, connected: false, error: "static" };
    }
    return (await response.json()) as AccountStatus;
  } catch {
    return { configured: false, connected: false, error: "offline" };
  }
}

export function tiktokStatus(): Promise<AccountStatus> {
  return statusOf("/api/tiktok/status");
}

export function youtubeStatus(): Promise<AccountStatus> {
  return statusOf("/api/youtube/status");
}

export async function metaStatus(): Promise<{ facebook: AccountStatus; instagram: AccountStatus }> {
  try {
    const response = await fetch("/api/meta/status", { credentials: "include" });
    if (response.status === 404) {
      const missing = { configured: false, connected: false, error: "static" };
      return { facebook: missing, instagram: missing };
    }
    const data = (await response.json()) as {
      configured?: boolean;
      facebook?: AccountStatus;
      instagram?: AccountStatus;
      error?: string;
    };
    const fallback: AccountStatus = {
      configured: Boolean(data.configured),
      connected: false,
      error: data.error,
    };
    return {
      facebook: data.facebook ?? fallback,
      instagram: data.instagram ?? fallback,
    };
  } catch {
    const offline = { configured: false, connected: false, error: "offline" };
    return { facebook: offline, instagram: offline };
  }
}

export async function disconnectAccount(target: PostTarget): Promise<void> {
  const path = target === "facebook" || target === "instagram" ? "/api/meta/disconnect" : `/api/${target}/disconnect`;
  await fetch(path, { method: "POST", credentials: "include" });
}

function postedLabel(target: PostTarget, mode?: string): string {
  if (target === "tiktok") return mode === "inbox" ? "Sent to your TikTok inbox" : "Posted to TikTok";
  if (target === "youtube") return "Posted to YouTube";
  if (target === "facebook") return mode === "reels" ? "Posted a Facebook Reel" : "Posted to Facebook";
  return "Posted an Instagram Reel";
}

export async function publishFile(target: PostTarget, short: Short): Promise<PostResult> {
  const file = getFile(short.id);
  if (!file) return { target, ok: false, message: "Export the video first." };
  const form = new FormData();
  form.append("file", file.blob, file.name);
  form.append("title", short.title);
  form.append("caption", short.beats.map((beat) => beat.caption).join(" "));
  try {
    const response = await fetch(`/api/${target}/publish`, {
      method: "POST",
      body: form,
      credentials: "include",
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      mode?: string;
      ok?: boolean;
    };
    if (response.status === 404) {
      return { target, ok: false, message: "static" };
    }
    if (!response.ok) {
      return { target, ok: false, message: data.error || `${target} publish failed` };
    }
    return { target, ok: true, message: postedLabel(target, data.mode), mode: data.mode };
  } catch (error) {
    return { target, ok: false, message: error instanceof Error ? error.message : "Publish failed" };
  }
}

export async function publishReady(short: Short, accounts: Accounts): Promise<PostResult[]> {
  const results: PostResult[] = [];
  if (accounts.tiktok.connected) results.push(await publishFile("tiktok", short));
  if (accounts.youtube.connected) results.push(await publishFile("youtube", short));
  if (accounts.facebook.connected) results.push(await publishFile("facebook", short));
  if (accounts.instagram.connected) results.push(await publishFile("instagram", short));
  return results;
}
