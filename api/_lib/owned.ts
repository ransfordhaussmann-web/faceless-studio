import { readCookie, setCookie } from "./http";

/** Session payload must name the Cursor viewer who connected it. */
export type Owned = { owner: string };

export function forViewer<T extends Owned>(session: T | null, viewerSub: string): T | null {
  if (!session?.owner || session.owner !== viewerSub) return null;
  return session;
}

export function oauthStateValue(nonce: string, owner: string): string {
  return JSON.stringify({ s: nonce, o: owner });
}

export function readOauthState(request: Request, cookieName: string, owner: string): string | null {
  const raw = readCookie(request, cookieName);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { s?: string; o?: string };
    if (!parsed.s || parsed.o !== owner) return null;
    return parsed.s;
  } catch {
    return null;
  }
}

export function writeOauthState(
  cookieName: string,
  nonce: string,
  owner: string,
  request: Request,
  maxAge = 600,
): string {
  return setCookie(cookieName, oauthStateValue(nonce, owner), request, maxAge);
}
