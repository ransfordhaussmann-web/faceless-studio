import { json, sameOrigin } from "../_lib/http";
import { GRAPH, graphGet, graphPost, isMetaUploadHost, metaConfigured, readMeta } from "../_lib/meta";

const MAX_BYTES = 50 * 1024 * 1024;

type Container = { id?: string; uri?: string; error?: { message?: string } };
type Status = { status_code?: string; status?: string; error?: { message?: string } };
type Published = { id?: string; error?: { message?: string } };

async function waitForReady(id: string, token: string): Promise<string> {
  for (let i = 0; i < 30; i += 1) {
    const status = await graphGet<Status>(`/${id}`, token, { fields: "status_code,status" });
    const code = status.status_code || status.status || "";
    if (code === "FINISHED" || code === "PUBLISHED") return code;
    if (code === "ERROR" || status.error?.message) throw new Error(status.error?.message || "Instagram could not process the Reel.");
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return "IN_PROGRESS";
}

export async function POST(request: Request): Promise<Response> {
  if (!sameOrigin(request)) return json({ error: "bad origin" }, 403);
  if (!metaConfigured()) {
    return json(
      { error: "Add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in Cursor Secrets, then connect again." },
      501,
    );
  }
  const session = readMeta(request);
  if (!session?.igId) {
    return json({ error: "Link a professional Instagram account to your Facebook Page, then connect again." }, 401);
  }

  const form = await request.formData();
  const file = form.get("file");
  const title = String(form.get("title") || "Faceless Short").slice(0, 200);
  const caption = String(form.get("caption") || title).slice(0, 2100);
  if (!(file instanceof File) || file.size < 1000) return json({ error: "Missing video file" }, 400);
  if (file.size > MAX_BYTES) return json({ error: "Video is over 50 MB" }, 413);
  const bytes = new Uint8Array(await file.arrayBuffer());

  const created = await graphPost<Container>(`/${session.igId}/media`, session.pageToken, {
    media_type: "REELS",
    upload_type: "resumable",
    caption,
    share_to_feed: "true",
  });
  if (!created.id) {
    return json({ error: created.error?.message || "Instagram did not start the Reel upload." }, 400);
  }
  const uploadUrl = created.uri || `https://rupload.facebook.com/ig-api-upload/${GRAPH}/${created.id}`;
  if (!isMetaUploadHost(uploadUrl)) return json({ error: "Unexpected Instagram upload host" }, 502);

  const upload = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      authorization: `OAuth ${session.pageToken}`,
      offset: "0",
      file_size: String(bytes.byteLength),
      "content-type": file.type || "application/octet-stream",
    },
    body: bytes,
  });
  if (!upload.ok) return json({ error: "Instagram rejected the Reel file." }, 502);

  try {
    await waitForReady(created.id, session.pageToken);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Instagram processing failed" }, 502);
  }

  const published = await graphPost<Published>(`/${session.igId}/media_publish`, session.pageToken, {
    creation_id: created.id,
  });
  if (published.error?.message) return json({ error: published.error.message }, 400);
  return json({ ok: true, id: published.id ?? created.id, name: session.igName || "Instagram" });
}
