import { DurableObject } from "cloudflare:workers";

interface Env {
  ROOMS: DurableObjectNamespace<BoardRoom>;
  ASSETS: Fetcher;
}

// Limite de taille d'une scène (les images sont dans la scène, en data URL).
const MAX_SCENE_CHARS = 1_800_000;

// Une Durable Object = une planche en direct. La dernière scène est gardée dans
// son stockage, et envoyée à chaque nouvel arrivant puis à tous les autres à chaque modification.
export class BoardRoom extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    this.ctx.acceptWebSocket(server);
    const latest = await this.ctx.storage.get<string>("scene");
    if (latest) server.send(latest);
    this.broadcastPresence();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const text = typeof message === "string" ? message : new TextDecoder().decode(message);
    // Signal de maintien en vie : pas de traitement.
    if (text === "ping") return;
    if (text.length > MAX_SCENE_CHARS) return;
    let data: { type?: unknown; elements?: unknown; files?: unknown };
    try {
      data = JSON.parse(text);
    } catch {
      return;
    }
    if (data.type !== "scene" || !Array.isArray(data.elements)) return;
    const payload = JSON.stringify({ type: "scene", elements: data.elements, files: data.files ?? {} });
    await this.ctx.storage.put("scene", payload);
    for (const other of this.ctx.getWebSockets()) {
      if (other !== ws) other.send(payload);
    }
  }

  webSocketClose(ws: WebSocket, code: number, reason: string): void {
    ws.close(code, reason || "closed");
    this.broadcastPresence();
  }

  // Nombre de personnes connectées à cette planche, envoyé à tout le monde.
  private broadcastPresence(): void {
    const sockets = this.ctx.getWebSockets();
    const payload = JSON.stringify({ type: "presence", count: sockets.length });
    for (const socket of sockets) socket.send(payload);
  }

  webSocketError(ws: WebSocket): void {
    ws.close(1011, "error");
  }
}

const ROOM_ID = /^[0-9a-f-]{36}$/i;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/connect\/([^/]+)$/);
    if (match) {
      if (!ROOM_ID.test(match[1])) return new Response("Not found", { status: 404 });
      if (request.headers.get("Upgrade") !== "websocket") return new Response("Expected WebSocket", { status: 426 });
      return env.ROOMS.get(env.ROOMS.idFromName(match[1])).fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};
