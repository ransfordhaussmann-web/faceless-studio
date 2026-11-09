import { json, sameOrigin } from "./_lib/http";

export async function POST(request: Request): Promise<Response> {
  if (!sameOrigin(request)) return json({ error: "bad origin" }, 403);
  return json(
    {
      error: "Azure speech keys are not accepted on the server. Configure voice on this device only.",
    },
    404,
  );
}
