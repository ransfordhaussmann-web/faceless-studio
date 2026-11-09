import { guardSensitive } from "../_lib/auth";
import { json } from "../_lib/http";
import { readYouTube, refreshYouTube, youtubeConfigured, youtubeCookie, youtubeMissing } from "../_lib/youtube";

const MAX_BYTES = 50 * 1024 * 1024;

export async function POST(request: Request): Promise<Response> {
  const gate = await guardSensitive(request, { rateKey: "publish", limit: 6, windowMs: 60_000 });
  if (gate instanceof Response) return gate;
  if (!youtubeConfigured()) return youtubeMissing();
  const session = readYouTube(request);
  if (!session) return json({ error: "Connect YouTube in Channel first." }, 401);
  let fresh;
  try {
    fresh = await refreshYouTube(request, session);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "YouTube session expired" }, 401);
  }

  const form = await request.formData();
  const file = form.get("file");
  const title = String(form.get("title") || "Faceless Short").slice(0, 90);
  const description = String(form.get("caption") || title);
  if (!(file instanceof File) || file.size < 1000) return json({ error: "Missing video file" }, 400);
  if (file.size > MAX_BYTES) return json({ error: "Video is over 50 MB" }, 413);

  const metadata = {
    snippet: { title, description, categoryId: "28" },
    status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
  };
  const start = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${fresh.access}`,
        "content-type": "application/json; charset=UTF-8",
        "x-upload-content-type": file.type || "video/mp4",
        "x-upload-content-length": String(file.size),
      },
      body: JSON.stringify(metadata),
    },
  );
  const uploadUrl = start.headers.get("location");
  if (!start.ok || !uploadUrl) {
    const err = (await start.json().catch(() => ({}))) as { error?: { message?: string } };
    return json({ error: err.error?.message || "YouTube did not start the upload." }, 400);
  }
  const host = new URL(uploadUrl);
  if (host.protocol !== "https:" || !host.hostname.endsWith("googleapis.com")) {
    return json({ error: "Unexpected YouTube upload host" }, 502);
  }
  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${fresh.access}`,
      "content-type": file.type || "video/mp4",
      "content-length": String(file.size),
    },
    body: await file.arrayBuffer(),
  });
  if (!put.ok) return json({ error: "YouTube rejected the video file." }, 502);
  const uploaded = (await put.json()) as { id?: string };
  return json(
    { ok: true, videoId: uploaded.id ?? null, name: fresh.name },
    200,
    { "set-cookie": youtubeCookie(fresh, request) },
  );
}
