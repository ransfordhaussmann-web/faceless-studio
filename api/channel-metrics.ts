import { json } from "./_lib/http";

export async function GET(): Promise<Response> {
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  const fromDate = new Date(today);
  fromDate.setUTCDate(fromDate.getUTCDate() - 7);
  const from = fromDate.toISOString().slice(0, 10);
  return json({
    snapshot: {
      checkedAt: new Date().toISOString(),
      from,
      to,
      channels: {
        youtube: { views: 0, followers: 0, posts: 0 },
        tiktok: { views: 0, followers: 0, posts: 0 },
        instagram: { views: 0, followers: 0, posts: 0 },
        facebook: { views: 0, followers: 0, posts: 0 },
      },
    },
  });
}
