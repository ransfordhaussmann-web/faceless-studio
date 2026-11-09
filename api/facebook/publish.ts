import { guardSensitive } from "../_lib/auth";
import { json } from "../_lib/http";
import { graphPost, isMetaUploadHost, metaConfigured, readMeta } from "../_lib/meta";

const MAX_BYTES = 50 * 1024 * 1024;

type Start = { video_id?: string; upload_url?: string; error?: { message?: string } };
type Finish = { success?: boolean; error?: { message?: string } };
type Legacy = { id?: string; error?: { message?: string } };

export async function POST(request: Request): Promise<Response> {
  const gate = await guardSensitive(request, { rateKey: "publish", limit: 6, windowMs: 60_000 });
  if (gate instanceof Response) return gate;
  if (!metaConfigured()) {
    return json(
      { error: "Add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in Cursor Secrets, then connect again." },
      501,
    );
  }
  const session = readMeta(request);
  if (!session) return json({ error: "Connect Facebook in Channel first." }, 401);

  const form = await request.formData();
  const file = form.get("file");
  const title = String(form.get("title") || "Faceless Short").slice(0, 200);
  if (!(file instanceof File) || file.size < 1000) return json({ error: "Missing video file" }, 400);
  if (file.size > MAX_BYTES) return json({ error: "Video is over 50 MB" }, 413);
  const bytes = new Uint8Array(await file.arrayBuffer());

  const start = await graphPost<Start>(`/${session.pageId}/video_reels`, session.pageToken, {
    upload_phase: "start",
  });
  if (start.upload_url && start.video_id && isMetaUploadHost(start.upload_url)) {
    const upload = await fetch(start.upload_url, {
      method: "POST",
      headers: {
        authorization: `OAuth ${session.pageToken}`,
        offset: "0",
        file_size: String(bytes.byteLength),
        "content-type": file.type || "application/octet-stream",
      },
      body: bytes,
    });
    if (!upload.ok) return json({ error: "Facebook rejected the Reel upload." }, 502);
    const finish = await graphPost<Finish>(`/${session.pageId}/video_reels`, session.pageToken, {
      upload_phase: "finish",
      video_id: start.video_id,
      video_state: "PUBLISHED",
      description: title,
    });
    if (finish.error?.message) return json({ error: finish.error.message }, 400);
    return json({ ok: true, mode: "reels", name: session.pageName });
  }

  const legacyUrl = new URL(`https://graph-video.facebook.com/v21.0/${session.pageId}/videos`);
  const body = new FormData();
  body.append("access_token", session.pageToken);
  body.append("title", title);
  body.append("description", title);
  body.append("published", "true");
  body.append("source", new Blob([bytes], { type: file.type || "video/mp4" }), file.name || "short.mp4");
  const legacy = await fetch(legacyUrl, { method: "POST", body });
  const data = (await legacy.json()) as Legacy;
  if (!legacy.ok || !data.id) {
    return json({ error: start.error?.message || data.error?.message || "Facebook did not accept the video." }, 400);
  }
  return json({ ok: true, mode: "video", name: session.pageName });
}
