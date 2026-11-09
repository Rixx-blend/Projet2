"use client";

import { Copy, Download, FileText, ListChecks, Pin, PinOff, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { PlayfulTodoList } from "@/components/ui/playful-todolist";
import {
  NOTE_COLORS,
  NOTE_TEMPLATES,
  createFromTemplate,
  createNote,
  exportNoteText,
  extractBullets,
  newItem,
  noteProgress,
  readNotes,
  slugify,
  sortNotes,
  wordCount,
  writeNotes,
  type Note,
  type NoteColor,
  type NoteItem,
} from "@/lib/notes";
import { cn, formatDateTime } from "@/lib/utils";

function ProgressBar({ percent, className }: { percent: number; className?: string }) {
  return (
    <div className={cn("h-1 overflow-hidden rounded-full bg-line", className)}>
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export function NotesView() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [ready, setReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draftItem, setDraftItem] = useState("");
  const [armedDelete, setArmedDelete] = useState(false);

  // Chargement côté client uniquement (localStorage), puis sauvegarde à chaque changement.
  useEffect(() => {
    const loaded = readNotes();
    setNotes(loaded);
    setSelectedId(sortNotes(loaded)[0]?.id ?? null);
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) writeNotes(notes);
  }, [notes, ready]);

  const visible = useMemo(() => {
    const sorted = sortNotes(notes);
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (note) =>
        note.title.toLowerCase().includes(q) ||
        note.body.toLowerCase().includes(q) ||
        note.items.some((item) => item.text.toLowerCase().includes(q)),
    );
  }, [notes, query]);

  const selected = notes.find((note) => note.id === selectedId) ?? null;

  const patch = useCallback((id: string, change: (note: Note) => Partial<Note>) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id
          ? { ...note, ...change(note), updatedAt: new Date().toISOString() }
          : note,
      ),
    );
  }, []);

  function addNote(note: Note) {
    setNotes((prev) => [note, ...prev]);
    setSelectedId(note.id);
    setArmedDelete(false);
  }

  function toggleItem(note: Note, itemId: string, done: boolean) {
    patch(note.id, (current) => ({
      items: current.items.map((item) => (item.id === itemId ? { ...item, done } : item)),
    }));
  }

  function addItem(note: Note) {
    const text = draftItem.trim();
    if (!text) return;
    patch(note.id, (current) => ({ items: [...current.items, newItem(text)] }));
    setDraftItem("");
  }

  function removeItem(note: Note, itemId: string) {
    patch(note.id, (current) => ({
      items: current.items.filter((item) => item.id !== itemId),
    }));
  }

  function clearDone(note: Note) {
    patch(note.id, (current) => ({ items: current.items.filter((item) => !item.done) }));
  }

  function importBullets(note: Note) {
    const { body, items } = extractBullets(note.body);
    if (!items.length) return;
    patch(note.id, (current) => ({ body, items: [...current.items, ...items.map(newItem)] }));
  }

  function duplicate(note: Note) {
    addNote(
      createNote({
        title: note.title ? `${note.title} (copie)` : "",
        body: note.body,
        color: note.color,
        items: note.items.map((item: NoteItem) => newItem(item.text)),
      }),
    );
  }

  function exportNote(note: Note) {
    const blob = new Blob([exportNoteText(note)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(note.title || "note")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function removeNote(note: Note) {
    if (!armedDelete) {
      setArmedDelete(true);
      return;
    }
    setNotes((prev) => prev.filter((item) => item.id !== note.id));
    setSelectedId(null);
    setArmedDelete(false);
  }

  return (
    <div className="grid min-h-[calc(100vh-14rem)] gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col gap-3 rounded-2xl border border-line bg-surface p-3">
        <div className="flex items-center gap-2">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher"
              className="h-9 w-full rounded-lg border border-line bg-panel pl-8 pr-3 text-[13px] text-ink outline-none transition focus:border-accent"
            />
          </label>
          <Button
            size="icon"
            variant="secondary"
            aria-label="Nouvelle note vide"
            onClick={() => addNote(createNote())}
          >
            <Plus className="size-4" />
          </Button>
        </div>

        <div className="flex max-h-[62vh] flex-col gap-1.5 overflow-y-auto pr-1">
          {visible.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted">
              {notes.length === 0 ? "Aucune note pour l'instant." : "Aucun résultat."}
            </p>
          ) : null}
          {visible.map((note) => {
            const progress = noteProgress(note.items);
            const preview = note.body.trim().split("\n")[0] || note.items[0]?.text || "Note vide";
            const active = note.id === selectedId;
            return (
              <button
                key={note.id}
                type="button"
                onClick={() => {
                  setSelectedId(note.id);
                  setArmedDelete(false);
                }}
                className={cn(
                  "w-full rounded-xl border px-3 py-2.5 text-left transition",
                  active
                    ? "border-accent bg-panel-2"
                    : "border-line bg-panel hover:border-line-strong",
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: NOTE_COLORS[note.color].hex }}
                  />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
                    {note.title || "Sans titre"}
                  </span>
                  {note.pinned ? <Pin className="size-3 shrink-0 text-accent" /> : null}
                </div>
                <p className="mt-1 truncate text-[11px] text-muted">{preview}</p>
                {progress.total ? (
                  <div className="mt-2 flex items-center gap-2">
                    <ProgressBar percent={progress.percent} className="flex-1" />
                    <span className="text-[10px] tabular-nums text-muted">
                      {progress.done}/{progress.total}
                    </span>
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </aside>

      <section className="flex min-w-0 flex-col rounded-2xl border border-line bg-surface p-5">
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 py-10">
            <div className="text-center">
              <FileText className="mx-auto size-8 text-muted" />
              <h2 className="mt-3 text-base font-semibold text-ink">Commence une note</h2>
              <p className="mt-1 text-[13px] text-muted">
                Pars d'un modèle ou d'une page vide. Coche les étapes au fil de ta production.
              </p>
            </div>
            <div className="grid w-full max-w-[640px] gap-3 sm:grid-cols-3">
              {NOTE_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => addNote(createFromTemplate(template))}
                  className="rounded-xl border border-line bg-panel p-4 text-left transition hover:border-accent"
                >
                  <Sparkles className="size-4 text-accent" />
                  <p className="mt-2 text-[13px] font-medium text-ink">{template.label}</p>
                  <p className="mt-1 text-[11px] leading-snug text-muted">{template.hint}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={selected.title}
                onChange={(event) => patch(selected.id, () => ({ title: event.target.value }))}
                placeholder="Titre de la note"
                className="min-w-0 flex-1 bg-transparent text-[20px] font-semibold text-ink outline-none placeholder:text-muted/60"
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label={selected.pinned ? "Désépingler" : "Épingler"}
                onClick={() => patch(selected.id, (note) => ({ pinned: !note.pinned }))}
              >
                {selected.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
              </Button>
              <Button variant="ghost" size="icon" aria-label="Dupliquer" onClick={() => duplicate(selected)}>
                <Copy className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Exporter en texte" onClick={() => exportNote(selected)}>
                <Download className="size-4" />
              </Button>
              <Button
                variant={armedDelete ? "danger" : "ghost"}
                size="sm"
                onClick={() => removeNote(selected)}
              >
                <Trash2 className="size-4" />
                {armedDelete ? "Confirmer" : null}
              </Button>
            </div>

            <div className="flex items-center gap-2" role="radiogroup" aria-label="Couleur de la note">
              {(Object.keys(NOTE_COLORS) as NoteColor[]).map((color) => (
                <button
                  key={color}
                  type="button"
                  role="radio"
                  aria-checked={selected.color === color}
                  aria-label={NOTE_COLORS[color].label}
                  onClick={() => patch(selected.id, () => ({ color }))}
                  className={cn(
                    "size-6 rounded-full border-2 transition",
                    selected.color === color
                      ? "scale-110 border-ink ring-2 ring-accent/40"
                      : "border-white/15 hover:scale-105",
                  )}
                  style={{ backgroundColor: NOTE_COLORS[color].hex }}
                />
              ))}
            </div>

            <textarea
              value={selected.body}
              onChange={(event) => patch(selected.id, () => ({ body: event.target.value }))}
              placeholder={"Écris tes idées, ton brief, tes notes…\nAstuce : une ligne « - élément » devient une case à cocher."}
              rows={7}
              className="w-full resize-y rounded-xl border border-line bg-panel px-4 py-3 text-[13px] leading-relaxed text-ink outline-none transition placeholder:text-muted/60 focus:border-accent"
            />

            <div className="space-y-3 rounded-xl border border-line bg-panel p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ListChecks className="size-4 text-muted" />
                  <h3 className="text-[13px] font-medium text-ink">Cases à cocher</h3>
                  {selected.items.length ? (
                    <span className="text-[11px] tabular-nums text-muted">
                      {noteProgress(selected.items).done}/{selected.items.length}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  {extractBullets(selected.body).items.length ? (
                    <Button variant="outline" size="sm" onClick={() => importBullets(selected)}>
                      Convertir les puces
                    </Button>
                  ) : null}
                  {selected.items.some((item) => item.done) ? (
                    <Button variant="ghost" size="sm" onClick={() => clearDone(selected)}>
                      Retirer les cochées
                    </Button>
                  ) : null}
                </div>
              </div>

              {selected.items.length ? (
                <ProgressBar percent={noteProgress(selected.items).percent} />
              ) : null}

              <PlayfulTodoList
                items={selected.items.map((item) => ({
                  id: item.id,
                  label: item.text,
                  checked: item.done,
                }))}
                onToggle={(itemId, done) => toggleItem(selected, itemId, done)}
                onRemove={(itemId) => removeItem(selected, itemId)}
              />

              <div className="flex items-center gap-2 pt-1">
                <input
                  value={draftItem}
                  onChange={(event) => setDraftItem(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") addItem(selected);
                  }}
                  placeholder="Ajouter une étape puis Entrée"
                  className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-[13px] text-ink outline-none transition focus:border-accent"
                />
                <Button variant="secondary" size="sm" onClick={() => addItem(selected)}>
                  <Plus className="size-4" />
                  Ajouter
                </Button>
              </div>
            </div>

            <p className="mt-auto text-[11px] text-muted">
              Modifiée le {formatDateTime(selected.updatedAt)} · {wordCount(selected.body)} mots ·{" "}
              {NOTE_COLORS[selected.color].label}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
