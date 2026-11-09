"use client";

import { FileText, Paperclip, Pin, Plus, Search, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react";

import { NoteDialog } from "@/components/notes/note-dialog";
import { Button } from "@/components/ui/button";
import {
  NOTE_COLORS,
  NOTE_TEMPLATES,
  cardAccent,
  createFromTemplate,
  createNote,
  exportNoteText,
  newItem,
  noteProgress,
  readNotes,
  slugify,
  sortNotes,
  tagHex,
  writeNotes,
  type Note,
  type NoteTag,
} from "@/lib/notes";
import { deleteNoteAttachments, listAttachments, saveAttachment } from "@/lib/notes-files";
import { cn, formatDateTime } from "@/lib/utils";

export function NotesView() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [ready, setReady] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [attachmentCounts, setAttachmentCounts] = useState<Record<string, number>>({});

  // Chargement côté client uniquement (localStorage), puis sauvegarde à chaque changement.
  useEffect(() => {
    setNotes(readNotes());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) writeNotes(notes);
  }, [notes, ready]);

  // Compte les pièces jointes de chaque note pour les cartes.
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      notes.map(async (note) => [note.id, (await listAttachments(note.id)).length] as const),
    ).then((pairs) => {
      if (!cancelled) setAttachmentCounts(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [notes]);

  const usedTags = useMemo(() => {
    const seen = new Map<string, NoteTag>();
    for (const note of notes) {
      for (const tag of note.tags) {
        if (!seen.has(tag.label)) seen.set(tag.label, tag);
      }
    }
    return Array.from(seen.values());
  }, [notes]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortNotes(notes).filter((note) => {
      if (tagFilter && !note.tags.some((tag) => tag.label === tagFilter)) return false;
      if (!q) return true;
      return (
        note.title.toLowerCase().includes(q) ||
        note.body.toLowerCase().includes(q) ||
        note.tags.some((tag) => tag.label.toLowerCase().includes(q)) ||
        note.items.some((item) => item.text.toLowerCase().includes(q))
      );
    });
  }, [notes, query, tagFilter]);

  const openNote = notes.find((note) => note.id === openId) ?? null;

  const patch = useCallback((id: string, change: (note: Note) => Partial<Note>) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id ? { ...note, ...change(note), updatedAt: new Date().toISOString() } : note,
      ),
    );
  }, []);

  function addNote(note: Note) {
    setNotes((prev) => [note, ...prev]);
    setOpenId(note.id);
  }

  function duplicate(note: Note) {
    addNote(
      createNote({
        title: note.title ? `${note.title} (copie)` : "",
        body: note.body,
        color: note.color,
        tags: note.tags,
        items: note.items.map((item) => newItem(item.text)),
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

  function deleteNote(note: Note) {
    setNotes((prev) => prev.filter((item) => item.id !== note.id));
    setOpenId(null);
    void deleteNoteAttachments(note.id);
  }

  /** Déposer des fichiers sur la page crée une note qui les contient. */
  async function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const files = Array.from(event.dataTransfer.files);
    if (!files.length) return;
    const note = createNote({ title: files.length === 1 ? files[0].name : "Nouveaux fichiers" });
    addNote(note);
    for (const file of files) {
      await saveAttachment(note.id, file);
    }
    setAttachmentCounts((prev) => ({ ...prev, [note.id]: files.length }));
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDragging(false);
      }}
      onDrop={(event) => void handleDrop(event)}
      className={cn(
        "min-h-[calc(100vh-14rem)] space-y-4 rounded-2xl border border-dashed p-1 transition",
        dragging ? "border-accent bg-accent/5" : "border-transparent",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher dans les notes, tags, étapes"
            className="h-9 w-full rounded-lg border border-line bg-surface pl-8 pr-3 text-[13px] text-ink outline-none transition focus:border-accent"
          />
        </label>
        <Button variant="primary" size="sm" onClick={() => addNote(createNote())}>
          <Plus className="size-4" />
          Nouvelle note
        </Button>
      </div>

      {usedTags.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTagFilter(null)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[11px] transition",
              tagFilter === null ? "border-accent text-ink" : "border-line text-muted hover:text-ink",
            )}
          >
            Tous
          </button>
          {usedTags.map((tag) => {
            const hex = tagHex(tag);
            const active = tagFilter === tag.label;
            return (
              <button
                key={tag.label}
                type="button"
                onClick={() => setTagFilter(active ? null : tag.label)}
                className="rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition"
                style={{
                  borderColor: `${hex}80`,
                  color: hex,
                  backgroundColor: active ? `${hex}33` : "transparent",
                }}
              >
                {tag.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {ready && notes.length === 0 ? (
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-line bg-surface py-12">
          <div className="text-center">
            <FileText className="mx-auto size-8 text-muted" />
            <h2 className="mt-3 text-base font-semibold text-ink">Commence une note</h2>
            <p className="mt-1 text-[13px] text-muted">
              Pars d'un modèle, d'une page vide, ou glisse directement tes fichiers ici.
            </p>
          </div>
          <div className="grid w-full max-w-[640px] gap-3 px-4 sm:grid-cols-3">
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
      ) : null}

      {visible.length === 0 && notes.length > 0 ? (
        <p className="py-10 text-center text-[13px] text-muted">Aucune note ne correspond à ce filtre.</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((note) => {
          const progress = noteProgress(note.items);
          const preview = note.body.trim().split("\n")[0] || note.items[0]?.text || "Note vide";
          const accent = cardAccent(note);
          const files = attachmentCounts[note.id] ?? 0;
          return (
            <button
              key={note.id}
              type="button"
              onClick={() => setOpenId(note.id)}
              className="group relative flex min-h-[150px] flex-col overflow-hidden rounded-xl border border-line bg-surface p-4 pl-5 text-left shadow-card transition hover:-translate-y-0.5 hover:border-line-strong"
            >
              <span
                className="absolute inset-y-0 left-0 w-1.5 transition-colors duration-300"
                style={{ backgroundColor: accent }}
                aria-hidden="true"
              />
              <div className="flex items-start gap-2">
                <h3 className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">
                  {note.title || "Sans titre"}
                </h3>
                {note.pinned ? <Pin className="size-3.5 shrink-0 text-accent" /> : null}
              </div>

              {note.tags.length ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {note.tags.map((tag) => (
                    <span
                      key={tag.label}
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{ backgroundColor: `${tagHex(tag)}26`, color: tagHex(tag) }}
                    >
                      {tag.label}
                    </span>
                  ))}
                </div>
              ) : null}

              <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-muted">{preview}</p>

              <div className="mt-auto space-y-2 pt-3">
                {progress.total ? (
                  <div className="flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full bg-accent transition-[width] duration-500"
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>
                    <span className="text-[10px] tabular-nums text-muted">
                      {progress.done}/{progress.total}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center gap-3 text-[10px] text-muted">
                  <span className="flex items-center gap-1" style={{ color: NOTE_COLORS[note.color].hex }}>
                    <span className="size-1.5 rounded-full bg-current" />
                    {NOTE_COLORS[note.color].label}
                  </span>
                  {files ? (
                    <span className="flex items-center gap-1">
                      <Paperclip className="size-3" />
                      {files}
                    </span>
                  ) : null}
                  <span className="ml-auto">{formatDateTime(note.updatedAt)}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {openNote ? (
        <NoteDialog
          key={openNote.id}
          note={openNote}
          onPatch={patch}
          onClose={() => setOpenId(null)}
          onDuplicate={duplicate}
          onExport={exportNote}
          onDelete={deleteNote}
        />
      ) : null}
    </div>
  );
}
