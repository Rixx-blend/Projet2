"use client";

import { ArrowLeft, Check, CloudOff, Copy, Loader2, Pencil, Save, Users, X } from "lucide-react";
import { useSync } from "@tldraw/sync";
import { Tldraw, getSnapshot, loadSnapshot, type Editor, type TLStore } from "tldraw";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { identityFromToken, LICENSE_KEY, sharedAssets, sharedUsers } from "@/components/workboards/live-shared";
import { useAppAuth } from "@/components/auth/app-auth";
import { sharedCollaboratorsComponents } from "@/components/workboards/shared-collaborators-badge";
import { TabLink } from "@/components/layout/tabs-context";
import { LIVE_BOARD_BASE, liveBoardUrl, liveSocketUrl } from "@/lib/live-board";
import type { Workboard } from "@/lib/local/workspaces";

type Share = "off" | "login" | "connecting" | "live" | "error";

// Connexion de l'application : jeton remis par la fenêtre de connexion (navigateur habituel).
async function currentToken(): Promise<string | null> {
  return window.rixxLive ? window.rixxLive.token() : null;
}

/** Planche partagée : se connecte à la salle et remonte son état à l'éditeur. */
function SharedBoard({ id, token, profile, onStore, onShare }: { id: string; token: string | null; profile: { name: string; picture?: string; cursorColor?: string; cursorStyle?: "arrow" | "dot" | "ring" | "diamond" }; onStore: (store: TLStore | null) => void; onShare: (state: Share, peers: string[]) => void }) {
  // Valeurs stables d'un rendu à l'autre : sinon la synchro se reconnecte sans arrêt (clignotement).
  const identity = useMemo(() => (token ? identityFromToken(token) : null), [token]);
  const sub = identity?.sub;
  const name = profile.name || identity?.name;
  const users = useMemo(() => (sub && name ? sharedUsers(sub, name, profile.cursorColor, profile.picture, profile.cursorStyle) : undefined), [sub, name, profile.cursorColor, profile.picture, profile.cursorStyle]);
  const uri = useMemo(() => `${liveSocketUrl(id)}${token ? `?token=${encodeURIComponent(token)}` : ""}`, [id, token]);
  const store = useSync({ uri, assets: sharedAssets, users: users as never });

  useEffect(() => {
    if (store.status === "synced-remote") {
      onStore(store.store);
      onShare("live", []);
    } else if (store.status === "error") {
      onStore(null);
      onShare("error", []);
    } else {
      onShare("connecting", []);
    }
  }, [store.status, store.store, onStore, onShare]);

  return null;
}

export function WorkboardEditor({ workboard }: { workboard: Workboard }) {
  const { profile } = useAppAuth();
  // Une planche tldraw existante est modifiable : elle garde son contenu.
  const legacy = false;
  const [title, setTitle] = useState(workboard.title);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [notice, setNotice] = useState("");
  const [sharing, setSharing] = useState(Boolean(workboard.live_board_id));
  const [share, setShare] = useState<Share>("off");
  const [token, setToken] = useState<string | null>(null);
  const [peers, setPeers] = useState<string[]>([]);
  const activeStore = useRef<TLStore | null>(null);
  const [liveStore, setLiveStore] = useState<TLStore | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  const [localStore, setLocalStore] = useState<TLStore | null>(null);

  useEffect(() => {
    if (!workboard.live_board_id) return;
    setShare("connecting");
    void currentToken().then((saved) => {
      if (window.rixxLive && saved) setToken(saved);
      else if (window.rixxLive) setShare("login");
    });
  }, [workboard.live_board_id]);
  // Dernière version enregistrée : la planche locale repart de là après un partage.
  const snapshotRef = useRef<unknown>(workboard.snapshot);

  const save = useCallback(async () => {
    const store = activeStore.current;
    if (!store || !dirty.current) return;
    dirty.current = false;
    setSaveState("saving");
    try {
      const response = await fetch(`/api/workboards/${workboard.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ snapshot: getSnapshot(store), title }),
      });
      if (!response.ok) throw new Error("Sauvegarde impossible.");
      snapshotRef.current = getSnapshot(store);
      setSaveState("saved");
    } catch {
      dirty.current = true;
      setSaveState("error");
      setNotice("La sauvegarde a échoué. Tes changements restent en mémoire.");
    }
  }, [workboard.id, title]);

  // Le store actif est celui de la planche locale, ou celui de la planche partagée.
  useEffect(() => {
    const store = sharing && liveStore ? liveStore : localStore;
    activeStore.current = store;
    if (!store) return;
    const stop = store.listen(() => {
      dirty.current = true;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void save(), 850);
    }, { scope: "document" });
    return () => stop();
  }, [sharing, liveStore, localStore, save]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      void save();
    };
  }, [save]);

  const onStore = useCallback((store: TLStore | null) => setLiveStore(store), []);
  const onShare = useCallback((state: Share, list: string[]) => {
    setShare(state);
    if (list.length) setPeers(list);
  }, []);

  async function startSharing() {
    const response = await fetch(`/api/workboards/${workboard.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ live_board_id: workboard.id }),
    });
    if (!response.ok) {
      setNotice("Impossible d’enregistrer cette planche collaborative.");
      return;
    }
    setSharing(true);
    setShare("connecting");
    if (!window.rixxLive) {
      // Navigateur : la connexion Google passe par le cookie du site.
      return;
    }
    const existing = await currentToken();
    if (existing) setToken(existing);
    else setShare("login");
  }

  async function login() {
    if (!window.rixxLive) {
      window.open(`${LIVE_BOARD_BASE}/auth/login?return=${encodeURIComponent(`/b/${workboard.id}`)}`, "_blank", "noopener");
      return;
    }
    const result = await window.rixxLive.login(`/b/${workboard.id}`);
    if (result.token) {
      setToken(result.token);
      setShare("connecting");
    }
  }

  function stopSharing() {
    setSharing(false);
    setLiveStore(null);
    setShare("off");
    setPeers([]);
  }

  const [copied, setCopied] = useState(false);
  function copyInvite() {
    const link = liveBoardUrl(workboard.id);
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    };
    void navigator.clipboard.writeText(link).then(done, () => {
      // Presse-papiers indisponible : le lien s'affiche pour être copié à la main.
      setNotice(`Lien à copier : ${link}`);
    });
  }

  async function rename() {
    const response = await fetch(`/api/workboards/${workboard.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setNotice(response.ok ? "Nom enregistré." : "Impossible d'enregistrer le nom.");
  }

  const mountLocal = useCallback((editor: Editor) => {
    editor.user.updateUserPreferences({ colorScheme: "dark" });
    editor.updateInstanceState({ isGridMode: true });
    const snapshot = snapshotRef.current;
    if (snapshot && typeof snapshot === "object") {
      const value = snapshot as Record<string, unknown>;
      const document = value.document ?? (value.store && value.schema ? value : null);
      if (document) {
        try { loadSnapshot(editor.store, { document } as never); } catch { setNotice("Impossible de charger l'ancien canvas. Une planche vierge est ouverte."); }
      }
    }
    setLocalStore(editor.store);
  }, []);

  const statusText = share === "live" ? (peers.length ? `En direct · ${peers.join(", ")}` : "En direct") : share === "connecting" ? "Connexion…" : share === "error" ? "Reconnexion nécessaire" : share === "login" ? "Connexion Google requise" : "";

  return <div className="flex h-full min-h-0 flex-col bg-bg">
    <header className="z-20 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-panel px-3 sm:px-5">
      <TabLink href="/workboards" title="Planches de travail" className="grid size-9 shrink-0 place-items-center rounded-xl border border-line text-ink-soft transition hover:border-line-strong hover:text-ink"><ArrowLeft className="size-4" /></TabLink>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2"><input value={title} onChange={(event) => setTitle(event.target.value)} onBlur={() => void rename()} onKeyDown={(event) => { if (event.key === "Enter") { event.currentTarget.blur(); void rename(); } }} className="w-full max-w-[420px] truncate bg-transparent text-sm font-semibold text-ink outline-none placeholder:text-muted" aria-label="Nom de la planche" /><Pencil className="size-3 shrink-0 text-muted" /></div>
        <p className="mt-0.5 text-[10px] text-muted">{workboard.category} · Canvas indépendant</p>
      </div>
      <div className="flex items-center gap-1.5 text-[11px]">
        {saveState === "saving" ? <><Loader2 className="size-3.5 animate-spin text-muted" /><span className="hidden text-muted sm:inline">Enregistrement</span></> : null}
        {saveState === "saved" ? <><Check className="size-3.5 text-accent" /><span className="hidden text-muted sm:inline">Enregistré</span></> : null}
        {saveState === "error" ? <><CloudOff className="size-3.5 text-danger" /><span className="hidden text-danger sm:inline">Erreur</span></> : null}
      </div>
      {!sharing ? <button onClick={() => void startSharing()} className="flex h-9 items-center gap-1.5 rounded-xl border border-line px-3 text-xs text-ink-soft hover:border-line-strong hover:text-ink"><Users className="size-3.5" />Partager</button> : <div className="flex items-center gap-1.5">
        {statusText ? <span className="hidden rounded-xl border border-line bg-bg px-2.5 py-1.5 text-[11px] text-ink-soft md:inline">{statusText}</span> : null}
        {share === "login" || share === "error" ? <button onClick={() => void login()} className="h-9 rounded-xl bg-accent px-3 text-xs font-semibold text-accent-ink">Se connecter</button> : null}
        {share === "live" ? <button onClick={copyInvite} className="flex h-9 items-center gap-1.5 rounded-xl border border-line px-3 text-xs text-ink-soft hover:border-line-strong hover:text-ink"><Copy className="size-3.5" />{copied ? "Lien copié" : "Inviter"}</button> : null}
        <button onClick={stopSharing} className="grid size-9 place-items-center rounded-xl border border-line text-ink-soft hover:border-line-strong hover:text-ink" title="Arrêter le partage"><X className="size-4" /></button>
      </div>}
      <button onClick={() => void save()} disabled={legacy} className="grid size-9 place-items-center rounded-xl border border-line text-ink-soft hover:border-line-strong hover:text-ink disabled:opacity-40" title="Enregistrer maintenant"><Save className="size-4" /></button>
    </header>
    <div className="relative min-h-0 flex-1">
      {sharing && (token || !window.rixxLive) ? <SharedBoard key={token ?? "cookie"} id={workboard.id} token={token} profile={profile} onStore={onStore} onShare={onShare} /> : null}
      <div className={`absolute inset-0 ${sharing && liveStore ? "invisible" : ""}`}>
        <Tldraw key="local" onMount={mountLocal} licenseKey={LICENSE_KEY} />
      </div>
      {sharing && liveStore ? <div className="absolute inset-0"><Tldraw key="shared" store={liveStore} licenseKey={LICENSE_KEY} components={sharedCollaboratorsComponents} onMount={(editor) => { editor.user.updateUserPreferences({ colorScheme: "dark" }); editor.updateInstanceState({ isGridMode: true }); }} /></div> : null}
      {sharing && !liveStore ? <div className="absolute inset-0 z-10 grid place-items-center bg-bg/85 p-6 text-center backdrop-blur-sm">
        <p className="text-sm text-muted">{share === "login" || share === "error" ? "Connecte-toi avec ton compte Google pour ouvrir cette planche à deux." : "Connexion à la planche partagée…"}</p>
      </div> : null}
      {notice ? <div role="status" className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-xl border border-line bg-panel px-4 py-2 text-xs text-ink-soft shadow-pop">{notice}</div> : null}
    </div>
  </div>;
}
