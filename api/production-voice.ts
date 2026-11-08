import { json } from "./_lib/http";

export async function GET(): Promise<Response> {
  return json({
    configured: false,
    setupAvailable: false,
    region: null,
    note: "Voice settings stay on this device. Azure keys are never stored on the server.",
  });
}
