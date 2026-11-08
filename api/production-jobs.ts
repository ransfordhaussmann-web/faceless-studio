import { json, sameOrigin } from "./_lib/http";
import { listJobs, upsertJob } from "./_lib/production";

export async function GET(): Promise<Response> {
  return json({ jobs: listJobs() });
}

export async function POST(request: Request): Promise<Response> {
  if (!sameOrigin(request)) return json({ error: "bad origin" }, 403);
  try {
    const body = (await request.json()) as {
      action?: string;
      id?: string;
      title?: string;
      scriptDe?: string;
      scriptEn?: string;
      videoDe?: string;
      videoEn?: string;
      revision?: number;
    };
    if (!body.action || !body.id) return json({ error: "action und id sind nötig." }, 400);
    const job = upsertJob({
      action: body.action,
      id: body.id,
      title: body.title,
      scriptDe: body.scriptDe,
      scriptEn: body.scriptEn,
      videoDe: body.videoDe,
      videoEn: body.videoEn,
      revision: body.revision,
    });
    return json({ job, jobs: listJobs() });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Auftrag fehlgeschlagen" }, 400);
  }
}
