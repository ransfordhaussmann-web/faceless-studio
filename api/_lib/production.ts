/** Production jobs are device-local only. Server APIs stay closed. */

export function productionLocked(): Response {
  return new Response(
    JSON.stringify({
      error: "Production jobs stay on this device only. The shared server queue is disabled.",
    }),
    {
      status: 404,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "private, no-store",
      },
    },
  );
}
