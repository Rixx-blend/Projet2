import { useEffect, useRef, useState } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "./excalidraw-skin.css";
import { WorkboardToolbar } from "./excalidraw-toolbar";

type User = { sub: string; name: string; picture?: string };
type Remote = { sub: string; name: string; color: string; x: number; y: number };

const COLORS = ["#B5CEA5", "#F2B45B", "#7C6CF0", "#FF647C", "#5EC1E0", "#E6A1D8"];
const colorFor = (sub: string) => COLORS[[...sub].reduce((total, char) => total + char.charCodeAt(0), 0) % COLORS.length];

// Empreinte d'une scène : permet de ne pas renvoyer ce qu'on vient de recevoir.
const keyOf = (elements: readonly { id: string; version: number; versionNonce: number }[]) =>
  elements.map((e) => `${e.id}:${e.version}:${e.versionNonce}`).join("|");

// Fusion des scènes : pour chaque élément, la version la plus récente gagne.
function mergeScenes(local: any[], remote: any[]): any[] {
  const byId = new Map<string, any>();
  for (const e of local) byId.set(e.id, e);
  for (const r of remote) {
    const l = byId.get(r.id);
    if (!l || r.version > l.version || (r.version === l.version && r.versionNonce < l.versionNonce)) byId.set(r.id, r);
  }
  const order = local.map((e) => e.id);
  for (const r of remote) if (!order.includes(r.id)) order.push(r.id);
  return order.map((id) => byId.get(id));
}

export function LivePlanche({ id }: { id: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  const [status, setStatus] = useState("Connexion…");
  const [tool, setTool] = useState("selection");
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const lastKey = useRef("");
  const pendingRemote = useRef<any | null>(null);
  const sendTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSent = useRef<{ elements: readonly any[]; files: any } | null>(null);
  const lastPointer = useRef(0);
  const remotes = useRef(new Map<string, Remote>());

  useEffect(() => {
    fetch("/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setChecked(true));
  }, []);

  function pushCollaborators() {
    const api = apiRef.current;
    if (!api) return;
    const map = new Map<string, unknown>();
    for (const [sub, r] of remotes.current) {
      map.set(sub, {
        pointer: { x: r.x, y: r.y, tool: "pointer" },
        button: "up",
        username: r.name,
        color: { background: r.color, stroke: r.color },
        selectedElementIds: {},
        isCurrentUser: false,
      });
    }
    api.updateScene({ collaborators: map as never });
  }

  function applyRemote(scene: any) {
    const api = apiRef.current;
    if (!api) {
      pendingRemote.current = scene;
      return;
    }
    try {
      if (scene.files && Object.keys(scene.files).length) api.addFiles(Object.values(scene.files) as never);
      const merged = mergeScenes(api.getSceneElementsIncludingDeleted() as any[], scene.elements);
      lastKey.current = keyOf(merged as never);
      api.updateScene({ elements: merged as never });
    } catch (error) {
      setStatus(`Erreur de synchro : ${error instanceof Error ? error.message : "inconnue"}`);
    }
  }

  useEffect(() => {
    if (!user) return;
    let closed = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const url = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/connect/${id}`;

    const open = () => {
      const ws = new WebSocket(url);
      socketRef.current = ws;
      setStatus("Connexion…");
      const heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send("ping");
      }, 20000);
      ws.onopen = () => setStatus("Connecté");
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);
          if (data.type === "scene") applyRemote(data);
          if (data.type === "pointer" && data.user) {
            remotes.current.set(data.user.sub, { sub: data.user.sub, name: data.user.name, color: colorFor(data.user.sub), x: data.x, y: data.y });
            pushCollaborators();
          }
          if (data.type === "presence") {
            const present = new Set<string>((data.users as User[]).map((u) => u.sub));
            for (const sub of [...remotes.current.keys()]) if (!present.has(sub)) remotes.current.delete(sub);
            pushCollaborators();
            const others = (data.users as User[]).filter((u) => u.sub !== user.sub).map((u) => u.name);
            setStatus(others.length ? `Avec ${others.join(", ")}` : "Connecté · seul sur la planche");
          }
        } catch { /* message ignoré */ }
      };
      ws.onclose = () => {
        clearInterval(heartbeat);
        if (closed) return;
        setStatus("Reconnexion…");
        retry = setTimeout(open, 1500);
      };
    };
    open();
    return () => {
      closed = true;
      clearTimeout(retry);
      socketRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  function sendScene(elements: readonly any[], files: any) {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const key = keyOf(elements as never);
    if (key === lastKey.current) return;
    lastKey.current = key;
    ws.send(JSON.stringify({ type: "scene", elements, files: files ?? {} }));
  }

  if (!checked) return <p style={{ padding: 24, fontFamily: "system-ui" }}>Vérification de la connexion…</p>;

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#222423", color: "#DEDFDD", fontFamily: "system-ui" }}>
        <div style={{ textAlign: "center", maxWidth: 360, padding: 24 }}>
          <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Planche partagée</h1>
          <p style={{ color: "#BFC2BE", fontSize: 14 }}>Connecte-toi avec ton compte Google pour rejoindre cette planche.</p>
          <a href={`/auth/login?return=/b/${id}`} style={{ display: "inline-block", marginTop: 12, padding: "10px 16px", borderRadius: 10, background: "#B5CEA5", color: "#222423", fontWeight: 600, textDecoration: "none" }}>Se connecter avec Google</a>
        </div>
      </div>
    );
  }

  return (
    <div className="wb-canvas" style={{ position: "fixed", inset: 0 }}>
      <Excalidraw
        theme="dark"
        excalidrawAPI={(api) => {
          apiRef.current = api;
          if (pendingRemote.current) {
            const scene = pendingRemote.current;
            pendingRemote.current = null;
            applyRemote(scene);
          }
        }}
        initialData={{ appState: { viewBackgroundColor: "transparent", gridModeEnabled: false } as never }}
        onPointerUpdate={(payload) => {
          const ws = socketRef.current;
          const now = Date.now();
          if (!ws || ws.readyState !== WebSocket.OPEN || now - lastPointer.current < 50) return;
          if (!Number.isFinite(payload.pointer.x) || !Number.isFinite(payload.pointer.y)) return;
          lastPointer.current = now;
          ws.send(JSON.stringify({ type: "pointer", x: payload.pointer.x, y: payload.pointer.y }));
        }}
        onChange={(elements, appState, files) => {
          setTool((appState as unknown as { activeTool: { type: string } }).activeTool.type);
          lastSent.current = { elements, files };
          if (sendTimer.current) clearTimeout(sendTimer.current);
          sendTimer.current = setTimeout(() => {
            const last = lastSent.current;
            if (last) sendScene(last.elements, last.files);
          }, 150);
        }}
      />
      <WorkboardToolbar active={tool} onPick={(type) => apiRef.current?.setActiveTool({ type: type as never })} />
      <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 1000, background: "#252726", color: "#DEDFDD", border: "1px solid #343735", padding: "6px 12px", borderRadius: 8, fontFamily: "system-ui", fontSize: 13, pointerEvents: "none" }}>
        {user.name} · {status}
      </div>
    </div>
  );
}
