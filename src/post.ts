import { getFile } from "./files";
import type { Short } from "./studio";

export type AccountStatus = {
  configured: boolean;
  connected: boolean;
  name?: string;
  error?: string;
};

export type PostTarget = "tiktok" | "youtube";

export type PostResult = {
  target: PostTarget;
  ok: boolean;
  message: string;
  mode?: string;
};

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

export async function disconnectAccount(target: PostTarget): Promise<void> {
  await fetch(`/api/${target}/disconnect`, { method: "POST", credentials: "include" });
}

export async function publishFile(
  target: PostTarget,
  short: Short,
): Promise<PostResult> {
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
    const posted =
      target === "tiktok"
        ? data.mode === "inbox"
          ? "Sent to your TikTok inbox"
          : "Posted to TikTok"
        : "Posted to YouTube";
    return { target, ok: true, message: posted, mode: data.mode };
  } catch (error) {
    return { target, ok: false, message: error instanceof Error ? error.message : "Publish failed" };
  }
}

export async function publishReady(
  short: Short,
  accounts: { tiktok: AccountStatus; youtube: AccountStatus },
): Promise<PostResult[]> {
  const results: PostResult[] = [];
  if (accounts.tiktok.connected) results.push(await publishFile("tiktok", short));
  if (accounts.youtube.connected) results.push(await publishFile("youtube", short));
  return results;
}
