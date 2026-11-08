import { json } from "./_lib/http";
import { listPublications } from "./_lib/production";

export async function GET(): Promise<Response> {
  return json({ publications: listPublications() });
}
