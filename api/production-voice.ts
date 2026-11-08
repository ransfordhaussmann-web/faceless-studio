import { json } from "./_lib/http";
import { voiceStatus } from "./_lib/production";

export async function GET(): Promise<Response> {
  return json(voiceStatus());
}
