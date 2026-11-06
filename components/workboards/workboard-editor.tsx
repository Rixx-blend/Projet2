"use client";

import { ArrowLeft, Check, CloudOff, Loader2, Pencil, Save } from "lucide-react";
import { Tldraw, getSnapshot, loadSnapshot, type Editor } from "tldraw";
import { useCallback, useEffect, useRef, useState } from "react";

import { TabLink } from "@/components/layout/tabs-context";
import type { Workboard } from "@/lib/local/workspaces";

export function WorkboardEditor({ workboard }: { workboard: Workboard }) {
  const editorRef = useRef<Editor | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  const [title, setTitle] = useState(workboard.title);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [notice, setNotice] = useState("");

  const save = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor || !dirty.current) return;
    dirty.current = false;
    setSaveState("saving");
    try {
      const response = await fetch(`/api/workboards/${workboard.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ snapshot: getSnapshot(editor.store), title }),
      });
      if (!response.ok) throw new Error("Sauvegarde impossible.");
      setSaveState("saved");
    } catch {
      dirty.current = true;
      setSaveState("error");
      setNotice("La sauvegarde a échoué. Tes changements restent en mémoire.");
    }
  }, [workboard.id, title]);

  const mount = useCallback((editor: Editor) => {
    editorRef.current = editor;
    editor.user.updateUserPreferences({ colorScheme: "dark" });
    editor.updateInstanceState({ isGridMode: true });
    const snapshot = workboard.snapshot;
    if (snapshot && typeof snapshot === "object") {
      const value = snapshot as Record<string, unknown>;
      const document = value.document ?? (value.store && value.schema ? value : null);
      if (document) {
        try { loadSnapshot(editor.store, { document } as never); } catch { setNotice("Impossible de charger l'ancien canvas. Une planche vierge est ouverte."); }
      }
    }
    editor.store.listen(() => {
      dirty.current = true;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void save(), 850);
    }, { source: "user", scope: "document" });
  }, [workboard.snapshot, save]);

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
    if (response.ok) setNotice("Nom enregistré.");
    else setNotice("Impossible d'enregistrer le nom.");
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
      <button onClick={() => void save()} className="grid size-9 place-items-center rounded-xl border border-line text-ink-soft hover:border-line-strong hover:text-ink" title="Enregistrer maintenant"><Save className="size-4" /></button>
    </header>
    <div className="relative min-h-0 flex-1">
      <Tldraw onMount={mount} />
      {notice ? <div role="status" className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-xl border border-line bg-panel px-4 py-2 text-xs text-ink-soft shadow-pop">{notice}</div> : null}
    </div>
  </div>;
}
