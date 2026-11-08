"use client";

import { ArrowLeft, Check, CloudOff, Copy, Loader2, Pencil, Save, Users, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

import { TabLink } from "@/components/layout/tabs-context";
import { isExcalidrawSnapshot, type ExcalidrawSnapshot } from "@/lib/excalidraw-scene";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useLiveBoard } from "@/components/workboards/use-live-board";
import { liveBoardUrl } from "@/lib/live-board";
import type { Workboard } from "@/lib/local/workspaces";

const ExcalidrawCanvas = dynamic(() => import("@/components/workboards/excalidraw-canvas"), { ssr: false });

export function WorkboardEditor({ workboard }: { workboard: Workboard }) {
  // Une planche tldraw existante n'est jamais réécrite : on la garde en lecture seule.
  const legacy = !!workboard.snapshot && !isExcalidrawSnapshot(workboard.snapshot);
  const initial = isExcalidrawSnapshot(workboard.snapshot) ? workboard.snapshot : null;

  const pending = useRef<ExcalidrawSnapshot | null>(null);
  const lastKey = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [title, setTitle] = useState(workboard.title);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [notice, setNotice] = useState(legacy ? "Ancienne planche tldraw : lecture seule. Crée une nouvelle planche pour dessiner." : "");
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const [sharing, setSharing] = useState(false);
  const live = useLiveBoard(workboard.id, api, sharing && !legacy);

  function copyInvite() {
    void navigator.clipboard.writeText(liveBoardUrl(workboard.id)).then(
      () => setNotice("Lien copié. La personne ouvre le lien et se connecte avec Google."),
      () => setNotice(`Lien : ${liveBoardUrl(workboard.id)}`),
    );
  }

  const save = useCallback(async () => {
    const snapshot = pending.current;
    if (!snapshot) return;
    pending.current = null;
    setSaveState("saving");
    try {
      const response = await fetch(`/api/workboards/${workboard.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ snapshot, title }),
      });
      if (!response.ok) throw new Error("Sauvegarde impossible.");
      setSaveState("saved");
    } catch {
      pending.current = snapshot;
      setSaveState("error");
      setNotice("La sauvegarde a échoué. Tes changements restent en mémoire.");
    }
  }, [workboard.id, title]);

  function handleChange(snapshot: ExcalidrawSnapshot) {
    // Les mouvements de curseur et de sélection déclenchent aussi onChange : on ignore ce qui n'a pas changé.
    const key = (snapshot.elements as { id: string; version: number; versionNonce: number }[]).map((e) => `${e.id}:${e.version}:${e.versionNonce}`).join("|") + `#${Object.keys(snapshot.files).length}`;
    if (key === lastKey.current) return;
    lastKey.current = key;
    pending.current = snapshot;
    if (sharing) live.sendScene(snapshot.elements, snapshot.files);
    setSaveState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), 850);
  }

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      void save();
    };
  }, [save]);

  async function rename() {
    const response = await fetch(`/api/workboards/${workboard.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setNotice(response.ok ? "Nom enregistré." : "Impossible d'enregistrer le nom.");
  }

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
      {!legacy && !sharing ? <button onClick={() => setSharing(true)} className="flex h-9 items-center gap-1.5 rounded-xl border border-line px-3 text-xs text-ink-soft hover:border-line-strong hover:text-ink"><Users className="size-3.5" />Partager</button> : null}
      {!legacy && sharing ? <div className="flex items-center gap-1.5">
        <span className="hidden rounded-xl border border-line bg-bg px-2.5 py-1.5 text-[11px] text-ink-soft md:inline">
          {live.status === "live" ? (live.peers.length ? `En direct · ${live.peers.join(", ")}` : "En direct · seul sur la planche") : live.status === "login" ? "Connexion Google requise" : live.status === "off" ? "" : "Connexion…"}
        </span>
        {live.status === "login" ? <button onClick={() => void live.login()} className="h-9 rounded-xl bg-accent px-3 text-xs font-semibold text-accent-ink">Se connecter</button> : null}
        <button onClick={copyInvite} className="flex h-9 items-center gap-1.5 rounded-xl border border-line px-3 text-xs text-ink-soft hover:border-line-strong hover:text-ink"><Copy className="size-3.5" />Inviter</button>
        <button onClick={() => setSharing(false)} className="grid size-9 place-items-center rounded-xl border border-line text-ink-soft hover:border-line-strong hover:text-ink" title="Arrêter le partage"><X className="size-4" /></button>
      </div> : null}
      <button onClick={() => void save()} disabled={legacy} className="grid size-9 place-items-center rounded-xl border border-line text-ink-soft hover:border-line-strong hover:text-ink disabled:opacity-40" title="Enregistrer maintenant"><Save className="size-4" /></button>
    </header>
    <div className="relative min-h-0 flex-1">
      <ExcalidrawCanvas initial={initial} readOnly={legacy} onChange={handleChange} onApi={setApi} onPointer={live.sendPointer} />
      {notice ? <div role="status" className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-xl border border-line bg-panel px-4 py-2 text-xs text-ink-soft shadow-pop">{notice}</div> : null}
    </div>
  </div>;
}
