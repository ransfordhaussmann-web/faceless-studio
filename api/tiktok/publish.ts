import { guardSensitive } from "../_lib/auth";
import { json } from "../_lib/http";
import {
  isTikTokUploadHost,
  missingConfig,
  readSession,
  refreshSession,
  sessionCookie,
  tiktokConfigured,
} from "../_lib/tiktok";

const MAX_BYTES = 50 * 1024 * 1024;

type TikTokJson = {
  error?: { code?: string; message?: string };
  data?: {
    privacy_level_options?: string[];
    publish_id?: string;
    upload_url?: string;
  };
};

async function tiktok(path: string, access: string, body?: unknown): Promise<TikTokJson> {
  const response = await fetch(`https://open.tiktokapis.com${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${access}`,
      "content-type": "application/json; charset=UTF-8",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return (await response.json()) as TikTokJson;
}

export async function POST(request: Request): Promise<Response> {
  const gate = await guardSensitive(request, { rateKey: "publish", limit: 6, windowMs: 60_000 });
  if (gate instanceof Response) return gate;
  if (!tiktokConfigured()) return missingConfig();
  const session = readSession(request, gate.sub);
  if (!session) return json({ error: "Connect TikTok in Channel first." }, 401);

  let fresh;
  try {
    fresh = await refreshSession(request, session);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "TikTok session expired" }, 401);
  }

  const form = await request.formData();
  const file = form.get("file");
  const title = String(form.get("title") || "Faceless Short").slice(0, 150);
  if (!(file instanceof File) || file.size < 1000) return json({ error: "Missing video file" }, 400);
  if (file.size > MAX_BYTES) return json({ error: "Video is over 50 MB" }, 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const info = await tiktok("/v2/post/publish/creator_info/query/", fresh.access);
  const privacy = info.data?.privacy_level_options?.includes("PUBLIC_TO_EVERYONE")
    ? "PUBLIC_TO_EVERYONE"
    : info.data?.privacy_level_options?.[0] || "SELF_ONLY";

  const initDirect = await tiktok("/v2/post/publish/video/init/", fresh.access, {
    post_info: {
      title,
      privacy_level: privacy,
      disable_duet: false,
      disable_comment: false,
      disable_stitch: false,
      video_cover_timestamp_ms: 1000,
    },
    source_info: {
      source: "FILE_UPLOAD",
      video_size: bytes.byteLength,
      chunk_size: bytes.byteLength,
      total_chunk_count: 1,
    },
  });

  let uploadUrl = initDirect.data?.upload_url;
  let publishId = initDirect.data?.publish_id;
  let mode: "direct" | "inbox" = "direct";

  if (!uploadUrl) {
    const inbox = await tiktok("/v2/post/publish/inbox/video/init/", fresh.access, {
      source_info: {
        source: "FILE_UPLOAD",
        video_size: bytes.byteLength,
        chunk_size: bytes.byteLength,
        total_chunk_count: 1,
      },
    });
    uploadUrl = inbox.data?.upload_url;
    publishId = inbox.data?.publish_id;
    mode = "inbox";
    if (!uploadUrl) {
      return json(
        {
          error:
            initDirect.error?.message ||
            inbox.error?.message ||
            "TikTok did not accept the upload. The developer app needs video.publish (or video.upload) approved.",
        },
        400,
        { "set-cookie": sessionCookie({ ...fresh, owner: gate.sub }, request) },
      );
    }
  }

  if (!isTikTokUploadHost(uploadUrl)) return json({ error: "Unexpected TikTok upload host" }, 502);

  const upload = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "content-type": file.type || "video/mp4",
      "content-length": String(bytes.byteLength),
      "content-range": `bytes 0-${bytes.byteLength - 1}/${bytes.byteLength}`,
    },
    body: bytes,
  });
  if (!upload.ok) {
    return json({ error: "TikTok rejected the video file. Export again as MP4 if you can." }, 502);
  }

  return json(
    {
      ok: true,
      publishId: publishId ?? null,
      mode,
      privacy,
      name: fresh.name,
    },
    200,
    { "set-cookie": sessionCookie({ ...fresh, owner: gate.sub }, request) },
  );
}
