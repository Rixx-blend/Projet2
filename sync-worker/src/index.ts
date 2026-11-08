import { DurableObject } from "cloudflare:workers";
import { DurableObjectSqliteSyncWrapper, SQLiteSyncStorage, TLSocketRoom } from "@tldraw/sync-core";
import { createTLSchema, type TLRecord } from "@tldraw/tlschema";

interface Env {
  ROOMS: DurableObjectNamespace<BoardRoom>;
  DATA_ROOMS: DurableObjectNamespace<AccountDataRoom>;
  ASSETS: Fetcher;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}

type User = { sub: string; name: string; email?: string; picture?: string };

const MAX_SCENE_CHARS = 1_800_000;
const SESSION_COOKIE = "rx_session";
const SESSION_DAYS = 30;
const ROOM_ID = /^[0-9a-f-]{36}$/i;

// ---------- Outils de session (cookie signé HMAC) ----------

const enc = new TextEncoder();
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (text: string) => Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function signSession(user: User, secret: string): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify({ ...user, exp: Date.now() + SESSION_DAYS * 86400_000 })));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(body));
  return `${body}.${b64url(new Uint8Array(sig))}`;
}

async function readSession(request: Request, secret: string): Promise<User | null> {
  // Session du navigateur (cookie) ou jeton remis à l'application de bureau (paramètre token).
  const cookie = request.headers.get("Cookie") ?? "";
  const fromCookie = cookie.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  const authorization = request.headers.get("Authorization") ?? "";
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : undefined;
  const value = fromCookie ?? bearer ?? new URL(request.url).searchParams.get("token") ?? undefined;
  if (!value) return null;
  const [body, sig] = value.split(".");
  if (!body || !sig) return null;
  const ok = await crypto.subtle.verify("HMAC", await hmacKey(secret), fromB64url(sig), enc.encode(body));
  if (!ok) return null;
  const data = JSON.parse(new TextDecoder().decode(fromB64url(body))) as User & { exp: number };
  if (data.exp < Date.now()) return null;
  return { sub: data.sub, name: data.name, email: data.email, picture: data.picture };
}

const cookieHeader = (name: string, value: string, maxAge: number, sameSite = "Lax") => `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=${sameSite}; Max-Age=${maxAge}`;

// Origines autorisées à ouvrir une planche : ce site et l'application de bureau (localhost).
// Un autre site ne peut pas envoyer ces en-têtes : il ne peut donc pas utiliser la session de la personne.
function originAllowed(request: Request): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return false;
  if (origin === new URL(request.url).origin) return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

// ---------- Connexion Google ----------

async function login(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const state = b64url(crypto.getRandomValues(new Uint8Array(16)));
  const returnTo = url.searchParams.get("return") ?? "/";
  const safeReturn = /^\/b\/[0-9a-f-]{36}$/i.test(returnTo) ? returnTo : "/";
  // Port de l'application de bureau (boucle locale uniquement) pour lui remettre la session.
  const appPort = url.searchParams.get("app_port") ?? "";
  const safePort = /^\d{2,5}$/.test(appPort) ? appPort : "";
  const google = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  google.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${url.origin}/auth/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  }).toString();
  const headers = new Headers({ Location: google.toString() });
  headers.append("Set-Cookie", cookieHeader("rx_state", `${state}|${safeReturn}|${safePort}`, 600));
  return new Response(null, { status: 302, headers });
}

async function callback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const saved = (request.headers.get("Cookie") ?? "").match(/rx_state=([^;]+)/)?.[1];
  const [savedState, returnTo = "/", appPort = ""] = saved ? decodeURIComponent(saved).split("|") : [];
  if (!code || !state || state !== savedState) return new Response("Connexion annulée ou expirée. Réessaie.", { status: 400 });

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${url.origin}/auth/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenResponse.ok) {
    // Diagnostic : le motif renvoyé par Google (jamais le secret).
    const detail = await tokenResponse.text();
    return new Response(`Google a refusé la connexion (${tokenResponse.status}) : ${detail}`, { status: 401 });
  }
  const tokens = (await tokenResponse.json()) as { id_token: string };
  const claims = JSON.parse(new TextDecoder().decode(fromB64url(tokens.id_token.split(".")[1]))) as { sub: string; name?: string; email?: string; picture?: string };
  const user: User = { sub: claims.sub, name: claims.name || claims.email || "Invité", email: claims.email, picture: claims.picture };

  const session = await signSession(user, env.GOOGLE_CLIENT_SECRET);
  // Application de bureau : on lui remet la session sur la boucle locale, jamais ailleurs.
  const location = /^\d{2,5}$/.test(appPort) ? `http://127.0.0.1:${appPort}/session?token=${encodeURIComponent(session)}` : returnTo;
  const headers = new Headers({ Location: location });
  headers.append("Set-Cookie", cookieHeader(SESSION_COOKIE, session, SESSION_DAYS * 86400, "None"));
  headers.append("Set-Cookie", cookieHeader("rx_state", "", 0));
  return new Response(null, { status: 302, headers });
}

// ---------- Planche en direct (Durable Object tldraw) ----------

// Une planche = une salle de synchro tldraw, persistée dans le SQLite de l'objet.
export class BoardRoom extends DurableObject<Env> {
  private room: TLSocketRoom<TLRecord, void>;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.room = new TLSocketRoom<TLRecord, void>({
      storage: new SQLiteSyncStorage({ sql: new DurableObjectSqliteSyncWrapper(ctx.storage) }),
      schema: createTLSchema(),
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId") ?? crypto.randomUUID();
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    server.accept();
    this.room.handleSocketConnect({ sessionId, socket: server as never });
    return new Response(null, { status: 101, webSocket: client });
  }
}

// ---------- Données OrderBoard synchronisées par compte Google ----------
// Un objet durable par identifiant Google. La révision empêche deux machines
// d'écraser silencieusement les modifications de l'autre.
export class AccountDataRoom extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS account_snapshot (id INTEGER PRIMARY KEY CHECK (id = 1), revision INTEGER NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL)"
    );
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method === "GET") {
      const rows = this.ctx.storage.sql.exec<{ revision: number; payload: string; updated_at: string }>(
        "SELECT revision, payload, updated_at FROM account_snapshot WHERE id = 1"
      ).toArray();
      if (!rows.length) return Response.json({ revision: 0, updatedAt: null });
      const row = rows[0];
      if (new URL(request.url).searchParams.get("metadata") === "1") {
        return Response.json({ revision: row.revision, updatedAt: row.updated_at });
      }
      return Response.json({ revision: row.revision, updatedAt: row.updated_at, payload: JSON.parse(row.payload) });
    }

    if (request.method !== "PUT") return new Response("Method not allowed", { status: 405 });
    const body = await request.json() as { expectedRevision?: number; payload?: unknown };
    if (!Number.isSafeInteger(body.expectedRevision) || (body.expectedRevision ?? -1) < 0 || body.payload === undefined) {
      return Response.json({ error: "Invalid sync payload" }, { status: 400 });
    }
    const serialized = JSON.stringify(body.payload);
    if (serialized.length > 40_000_000) return Response.json({ error: "Snapshot too large" }, { status: 413 });

    const rows = this.ctx.storage.sql.exec<{ revision: number }>(
      "SELECT revision FROM account_snapshot WHERE id = 1"
    ).toArray();
    const currentRevision = rows[0]?.revision ?? 0;
    if (currentRevision !== body.expectedRevision) {
      return Response.json({ error: "Revision conflict", revision: currentRevision }, { status: 409 });
    }
    const nextRevision = currentRevision + 1;
    const updatedAt = new Date().toISOString();
    this.ctx.storage.sql.exec(
      "INSERT INTO account_snapshot (id, revision, payload, updated_at) VALUES (1, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET revision = excluded.revision, payload = excluded.payload, updated_at = excluded.updated_at",
      nextRevision, serialized, updatedAt
    );
    return Response.json({ revision: nextRevision, updatedAt });
  }
}

// ---------- Routeur ----------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/auth/login") return login(request, env);
    if (url.pathname === "/auth/callback") return callback(request, env);
    if (url.pathname === "/auth/me") {
      const origin = request.headers.get("Origin");
      const headers = new Headers({ "Cache-Control": "no-store" });
      if (origin && originAllowed(request)) {
        headers.set("Access-Control-Allow-Origin", origin);
        headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
        headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
        headers.set("Access-Control-Allow-Credentials", "true");
        headers.set("Access-Control-Max-Age", "600");
        headers.set("Vary", "Origin");
      }
      if (request.method === "OPTIONS") {
        return new Response(null, { status: origin && originAllowed(request) ? 204 : 403, headers });
      }
      const user = await readSession(request, env.GOOGLE_CLIENT_SECRET);
      return user
        ? Response.json(user, { headers })
        : Response.json(null, { status: 401, headers });
    }
    if (url.pathname === "/account-data") {
      const user = await readSession(request, env.GOOGLE_CLIENT_SECRET);
      if (!user) return Response.json({ error: "Google login required" }, { status: 401 });
      const room = env.DATA_ROOMS.get(env.DATA_ROOMS.idFromName(user.sub));
      if (request.method === "GET") return room.fetch(new Request("https://account-data.internal/", { method: "GET" }));
      if (request.method === "PUT") return room.fetch(new Request("https://account-data.internal/", { method: "PUT", headers: { "Content-Type": "application/json" }, body: await request.text() }));
      return new Response("Method not allowed", { status: 405 });
    }

    if (url.pathname === "/auth/logout") {
      return new Response(null, { status: 302, headers: { Location: "/", "Set-Cookie": cookieHeader(SESSION_COOKIE, "", 0, "None") } });
    }

    const match = url.pathname.match(/^\/connect\/([^/]+)$/);
    if (match) {
      if (!ROOM_ID.test(match[1])) return new Response("Not found", { status: 404 });
      if (request.headers.get("Upgrade") !== "websocket") return new Response("Expected WebSocket", { status: 426 });
      if (!originAllowed(request)) return new Response("Origine refusée", { status: 403 });
      const user = await readSession(request, env.GOOGLE_CLIENT_SECRET);
      if (!user) return new Response("Connexion Google requise", { status: 401 });
      const headers = new Headers(request.headers);
      headers.set("X-User", JSON.stringify(user));
      return env.ROOMS.get(env.ROOMS.idFromName(match[1])).fetch(new Request(request, { headers }));
    }

    return env.ASSETS.fetch(request);
  },
};
