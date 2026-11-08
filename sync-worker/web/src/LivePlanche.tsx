import { useEffect, useRef, useState } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "./excalidraw-skin.css";
import { WorkboardToolbar } from "./excalidraw-toolbar";

type Scene = { type: "scene"; elements: any[]; files: Record<string, unknown> };

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

// Empreinte d'une scène : permet de ne pas renvoyer ce qu'on vient de recevoir.
const keyOf = (elements: readonly { id: string; version: number; versionNonce: number }[]) =>
  elements.map((e) => `${e.id}:${e.version}:${e.versionNonce}`).join("|");

export function LivePlanche({ id }: { id: string }) {
  const [status, setStatus] = useState("Connexion…");
  const [tool, setTool] = useState("selection");
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const lastKey = useRef("");
  const pendingRemote = useRef<Scene | null>(null);
  const sendTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSent = useRef<{ elements: readonly any[]; files: any } | null>(null);

  function applyRemote(scene: Scene) {
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
          const data = JSON.parse(event.data as string) as Scene;
          if (data.type === "scene") applyRemote(data);
          if (data.type === "presence") setStatus(`Connecté · ${data.count} personne${data.count > 1 ? "s" : ""} sur la planche`);
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
  }, [id]);

  function sendScene(elements: readonly any[], files: any) {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const key = keyOf(elements as never);
    if (key === lastKey.current) return;
    lastKey.current = key;
    ws.send(JSON.stringify({ type: "scene", elements, files: files ?? {} }));
  }

  return (
    <div className="wb-canvas" style={{ position: "fixed", inset: 0 }}>
      <Excalidraw
        theme="dark"
        initialData={{ appState: { viewBackgroundColor: "transparent", gridModeEnabled: false } as never }}
        excalidrawAPI={(api) => {
          apiRef.current = api;
          if (pendingRemote.current) {
            const scene = pendingRemote.current;
            pendingRemote.current = null;
            applyRemote(scene);
          }
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
      <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 1000, background: "#222", color: "#eee", padding: "6px 12px", borderRadius: 8, fontFamily: "system-ui", fontSize: 13, pointerEvents: "none" }}>
        {status}
      </div>
    </div>
  );
}
