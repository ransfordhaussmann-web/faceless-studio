import type { Connect, Plugin, ViteDevServer } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";

const ROUTES = new Set([
  "/api/tiktok/start",
  "/api/tiktok/callback",
  "/api/tiktok/status",
  "/api/tiktok/disconnect",
  "/api/tiktok/publish",
  "/api/youtube/start",
  "/api/youtube/callback",
  "/api/youtube/status",
  "/api/youtube/disconnect",
  "/api/youtube/publish",
  "/api/meta/start",
  "/api/meta/callback",
  "/api/meta/status",
  "/api/meta/disconnect",
  "/api/facebook/publish",
  "/api/instagram/publish",
  "/api/channel-metrics",
  "/api/production-jobs",
  "/api/production-publications",
  "/api/production-voice",
  "/api/production-voice-settings",
]);

async function toWebRequest(req: IncomingMessage): Promise<Request> {
  const host = req.headers.host || "127.0.0.1:5173";
  const url = `http://${host}${req.url}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(", "));
  }
  const method = (req.method || "GET").toUpperCase();
  if (method === "GET" || method === "HEAD") {
    return new Request(url, { method, headers });
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return new Request(url, { method, headers, body: Buffer.concat(chunks) });
}

function applyResponse(web: Response, res: ServerResponse) {
  res.statusCode = web.status;
  const cookies =
    typeof web.headers.getSetCookie === "function" ? web.headers.getSetCookie() : [];
  if (cookies.length) {
    res.setHeader("set-cookie", cookies);
  }
  web.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") return;
    res.setHeader(key, value);
  });
}

async function handle(
  server: ViteDevServer,
  req: IncomingMessage,
  res: ServerResponse,
  next: Connect.NextFunction,
) {
  const path = req.url?.split("?")[0] ?? "";
  if (!ROUTES.has(path)) {
    next();
    return;
  }
  try {
    const mod = await server.ssrLoadModule(`${path}.ts`);
    const method = (req.method || "GET").toUpperCase();
    const handler = mod[method] as ((request: Request) => Promise<Response>) | undefined;
    if (typeof handler !== "function") {
      res.statusCode = 405;
      res.end("Method not allowed");
      return;
    }
    const web = await handler(await toWebRequest(req));
    applyResponse(web, res);
    res.end(Buffer.from(await web.arrayBuffer()));
  } catch (error) {
    next(error as Error);
  }
}

export function apiPlugin(): Plugin {
  return {
    name: "faceless-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        void handle(server, req, res, next);
      });
    },
  };
}
