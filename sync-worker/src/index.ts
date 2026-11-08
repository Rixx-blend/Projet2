import { DurableObject } from "cloudflare:workers";
import { DurableObjectSqliteSyncWrapper, SQLiteSyncStorage, TLSocketRoom } from "@tldraw/sync-core";
import { createTLSchema } from "@tldraw/tlschema";

interface Env {
  ROOMS: DurableObjectNamespace<BoardRoom>;
}

// Une Durable Object = une planche partagée. Son état est persisté en SQLite
// par Cloudflare, donc il survit aux redémarrages et à l'hibernation.
export class BoardRoom extends DurableObject<Env> {
  private room: TLSocketRoom<any, { sessionId: string }>;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    const sql = new DurableObjectSqliteSyncWrapper(ctx.storage);
    const storage = new SQLiteSyncStorage({ sql });
    this.room = new TLSocketRoom({ storage, schema: createTLSchema() as never });
  }

  async fetch(request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    server.accept();
    const sessionId = crypto.randomUUID();
    this.room.handleSocketConnect({ sessionId, socket: server as never, isReadonly: false, meta: { sessionId } } as never);
    return new Response(null, { status: 101, webSocket: client });
  }
}

const ROOM_ID = /^[0-9a-f-]{36}$/i;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    // Route attendue : /connect/<id-de-la-planche>, avec l'upgrade WebSocket.
    const match = url.pathname.match(/^\/connect\/([^/]+)$/);
    if (!match || !ROOM_ID.test(match[1])) return new Response("Not found", { status: 404 });
    if (request.headers.get("Upgrade") !== "websocket") return new Response("Expected WebSocket", { status: 426 });
    const stub = env.ROOMS.get(env.ROOMS.idFromName(match[1]));
    return stub.fetch(request);
  },
};
