"use client";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useCallback, useEffect, useRef, useState } from "react";

import { LIVE_BOARD_BASE, liveSocketUrl } from "@/lib/live-board";

declare global {
  interface Window {
    rixxLive?: {
      login: (returnPath: string) => Promise<{ ok: boolean; token: string | null }>;
      token: () => Promise<string | null>;
    };
  }
}

export type LiveStatus = "off" | "connecting" | "live" | "login" | "offline";
type Peer = { sub: string; name: string; color: string; x: number; y: number };

const COLORS = ["#B5CEA5", "#F2B45B", "#7C6CF0", "#FF647C", "#5EC1E0", "#E6A1D8"];
const colorFor = (sub: string) => COLORS[[...sub].reduce((total, char) => total + char.charCodeAt(0), 0) % COLORS.length];

// Empreinte d'une scène : évite de renvoyer ce qu'on vient de recevoir.
const keyOf = (elements: readonly { id: string; version: number; versionNonce: number }[]) =>
  elements.map((e) => `${e.id}:${e.version}:${e.versionNonce}`).join("|");

// Fusion : pour chaque élément, la version la plus récente gagne.
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

/** Synchro en direct d'une planche locale avec les autres personnes qui l'ouvrent. */
export function useLiveBoard(id: string, api: ExcalidrawImperativeAPI | null, enabled: boolean) {
  const [status, setStatus] = useState<LiveStatus>("off");
  const [peers, setPeers] = useState<string[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const apiRef = useRef(api);
  const lastKey = useRef("");
  const remotes = useRef(new Map<string, Peer>());
  const lastPointer = useRef(0);
  const [attempt, setAttempt] = useState(0);
  // Jeton de session remis par l'application de bureau (vide dans le navigateur, où le cookie suffit).
  const tokenRef = useRef<string | null>(null);
  apiRef.current = api;

  const pushCollaborators = useCallback(() => {
    const current = apiRef.current;
    if (!current) return;
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
    current.updateScene({ collaborators: map as never });
  }, []);

  const applyRemote = useCallback((elements: any[], files: any) => {
    const current = apiRef.current;
    if (!current) return;
    if (files && Object.keys(files).length) current.addFiles(Object.values(files) as never);
    const merged = mergeScenes(current.getSceneElementsIncludingDeleted() as any[], elements);
    lastKey.current = keyOf(merged as never);
    current.updateScene({ elements: merged as never });
  }, []);

  useEffect(() => {
    if (!enabled) {
      setStatus("off");
      setPeers([]);
      return;
    }
    let closed = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let heartbeat: ReturnType<typeof setInterval> | undefined;

    const sendCurrent = () => {
      const current = apiRef.current;
      const ws = socketRef.current;
      if (!current || !ws || ws.readyState !== WebSocket.OPEN) return;
      const elements = current.getSceneElementsIncludingDeleted();
      const key = keyOf(elements as never);
      if (key === lastKey.current) return;
      lastKey.current = key;
      ws.send(JSON.stringify({ type: "scene", elements, files: current.getFiles() }));
    };

    const open = () => {
      setStatus("connecting");
      const token = tokenRef.current;
      const ws = new WebSocket(`${liveSocketUrl(id)}${token ? `?token=${encodeURIComponent(token)}` : ""}`);
      socketRef.current = ws;
      let gotScene = false;
      ws.onopen = () => {
        setStatus("live");
        heartbeat = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send("ping"), 20000);
        // Si la planche est vide côté serveur, on lui envoie la version locale.
        setTimeout(() => { if (!gotScene) sendCurrent(); }, 600);
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);
          if (data.type === "scene") {
            gotScene = true;
            applyRemote(data.elements, data.files);
            sendCurrent();
          }
          if (data.type === "pointer" && data.user) {
            remotes.current.set(data.user.sub, { sub: data.user.sub, name: data.user.name, color: colorFor(data.user.sub), x: data.x, y: data.y });
            pushCollaborators();
          }
          if (data.type === "presence") {
            const users = data.users as { sub: string; name: string }[];
            const present = new Set(users.map((u) => u.sub));
            for (const sub of [...remotes.current.keys()]) if (!present.has(sub)) remotes.current.delete(sub);
            pushCollaborators();
            setPeers(users.map((u) => u.name));
          }
        } catch { /* message ignoré */ }
      };
      ws.onclose = () => {
        clearInterval(heartbeat);
        if (closed) return;
        // Le serveur refuse la connexion sans session : on propose de se connecter.
        setStatus("login");
        setPeers([]);
        retry = setTimeout(open, 4000);
      };
    };
    void (async () => {
      if (window.rixxLive && !tokenRef.current) tokenRef.current = await window.rixxLive.token();
      if (!closed) open();
    })();
    return () => {
      closed = true;
      clearTimeout(retry);
      clearInterval(heartbeat);
      socketRef.current?.close();
      socketRef.current = null;
      remotes.current.clear();
    };
  }, [id, enabled, attempt, applyRemote, pushCollaborators]);

  /** Envoie la scène locale aux autres (appelé à chaque modification). */
  const sendScene = useCallback((elements: readonly any[], files: any) => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const key = keyOf(elements as never);
    if (key === lastKey.current) return;
    lastKey.current = key;
    ws.send(JSON.stringify({ type: "scene", elements, files: files ?? {} }));
  }, []);

  /** Envoie la position du curseur, au plus toutes les 50 ms. */
  const sendPointer = useCallback((x: number, y: number) => {
    const ws = socketRef.current;
    const now = Date.now();
    if (!ws || ws.readyState !== WebSocket.OPEN || now - lastPointer.current < 50) return;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    lastPointer.current = now;
    ws.send(JSON.stringify({ type: "pointer", x, y }));
  }, []);

  /** Ouvre la connexion Google (fenêtre de l'application, ou onglet du navigateur en secours). */
  const login = useCallback(async () => {
    const path = `/b/${id}`;
    if (window.rixxLive) {
      const result = await window.rixxLive.login(path);
      if (result.token) {
        tokenRef.current = result.token;
        setAttempt((n) => n + 1);
      }
      return;
    }
    window.open(`${LIVE_BOARD_BASE}/auth/login?return=${encodeURIComponent(path)}`, "_blank", "noopener");
  }, [id]);

  return { status, peers, sendScene, sendPointer, login, retry: () => setAttempt((n) => n + 1) };
}
