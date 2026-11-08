"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { useSync } from "@tldraw/sync";
import { Tldraw } from "tldraw";
import { useEffect, useMemo, useState } from "react";

import { identityFromToken, LICENSE_KEY, sharedAssets, sharedUsers } from "@/components/workboards/live-shared";
import { sharedCollaboratorsComponents } from "@/components/workboards/shared-collaborators-badge";
import { TabLink } from "@/components/layout/tabs-context";
import { LIVE_BOARD_BASE, liveSocketUrl } from "@/lib/live-board";

// Planche partagée ouverte depuis un lien : elle vit sur le serveur, sans copie locale.
export function LiveWorkboard({ id }: { id: string }) {
  const [token, setToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    void fetch("/api/workboards/import-live", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ live_board_id: id }) });
  }, [id]);

  useEffect(() => {
    // Navigateur (pas l'application) : le cookie du site sert de connexion, d'où le jeton vide.
    void (async () => setToken(window.rixxLive ? await window.rixxLive.token() : ""))();
  }, []);

  async function login() {
    if (!window.rixxLive) {
      window.open(`${LIVE_BOARD_BASE}/auth/login?return=${encodeURIComponent(`/b/${id}`)}`, "_blank", "noopener");
      return;
    }
    const result = await window.rixxLive.login(`/b/${id}`);
    if (result.token) setToken(result.token);
  }

  return <div className="flex h-full min-h-0 flex-col bg-bg">
    <header className="z-20 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-panel px-3 sm:px-5">
      <TabLink href="/workboards" title="Planches de travail" className="grid size-9 shrink-0 place-items-center rounded-xl border border-line text-ink-soft transition hover:border-line-strong hover:text-ink"><ArrowLeft className="size-4" /></TabLink>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">Planche partagée</p>
        <p className="mt-0.5 text-[10px] text-muted">Synchronisée en direct</p>
      </div>
      {token ? null : token === null ? <button onClick={() => void login()} className="h-9 rounded-xl bg-accent px-3 text-xs font-semibold text-accent-ink">Se connecter avec Google</button> : null}
    </header>
    <div className="relative min-h-0 flex-1">
      {token === undefined ? <p className="p-6 text-sm text-muted"><Loader2 className="mr-2 inline size-4 animate-spin" />Chargement…</p> : null}
      {token === null ? <p className="p-6 text-sm text-muted">Connecte-toi avec ton compte Google pour ouvrir cette planche.</p> : null}
      {token !== null && token !== undefined ? <SharedCanvas id={id} token={token} onAuthError={() => setToken(null)} /> : null}
    </div>
  </div>;
}

function SharedCanvas({ id, token, onAuthError }: { id: string; token: string; onAuthError: () => void }) {
  const identity = useMemo(() => (token ? identityFromToken(token) : null), [token]);
  const sub = identity?.sub;
  const name = identity?.name;
  const users = useMemo(() => (sub && name ? sharedUsers(sub, name) : undefined), [sub, name]);
  const uri = useMemo(() => (token ? `${liveSocketUrl(id)}?token=${encodeURIComponent(token)}` : liveSocketUrl(id)), [id, token]);
  const store = useSync({ uri, assets: sharedAssets, users: users as never });

  useEffect(() => {
    if (store.status === "error") onAuthError();
  }, [store.status, onAuthError]);

  if (store.status !== "synced-remote") {
    return <p className="p-6 text-sm text-muted"><Loader2 className="mr-2 inline size-4 animate-spin" />Connexion à la planche…</p>;
  }
  return (
    <div className="absolute inset-0">
      <Tldraw
        store={store.store}
        licenseKey={LICENSE_KEY}
        components={sharedCollaboratorsComponents}
        onMount={(editor) => {
          editor.user.updateUserPreferences({ colorScheme: "dark" });
          editor.updateInstanceState({ isGridMode: true });
        }}
      />
    </div>
  );
}
