"use client";

import { Copy, Download, ListChecks, Paperclip, Pin, PinOff, Plus, Trash2, Upload, X } from "lucide-react";
import { useEffect, useState, type DragEvent } from "react";

import { AttachmentPreview } from "@/components/notes/attachment-preview";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { PlayfulTodoList } from "@/components/ui/playful-todolist";
import {
  NOTE_COLORS,
  PRESET_TAGS,
  extractBullets,
  newItem,
  noteProgress,
  tagHex,
  wordCount,
  type Note,
  type NoteColor,
  type NoteTag,
} from "@/lib/notes";
import {
  deleteAttachment,
  listAttachments,
  saveAttachment,
  type NoteAttachment,
} from "@/lib/notes-files";
import { cn, formatDateTime } from "@/lib/utils";

const TAG_COLOR_CHOICES: NoteColor[] = ["rose", "amber", "sky", "violet", "sage", "neutral"];

type NoteDialogProps = {
  note: Note;
  onPatch: (id: string, change: (note: Note) => Partial<Note>) => void;
  onClose: () => void;
  onDuplicate: (note: Note) => void;
  onExport: (note: Note) => void;
  onDelete: (note: Note) => void;
};

function TagChip({ tag, onRemove }: { tag: NoteTag; onRemove?: () => void }) {
  const hex = tagHex(tag);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: `${hex}26`, borderColor: `${hex}80`, color: hex }}
    >
      {tag.label}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Retirer le tag ${tag.label}`}
          className="rounded-full p-0.5 opacity-70 hover:opacity-100"
        >
          <X className="size-3" />
        </button>
      ) : null}
    </span>
  );
}

export function NoteDialog({ note, onPatch, onClose, onDuplicate, onExport, onDelete }: NoteDialogProps) {
  const [attachments, setAttachments] = useState<NoteAttachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [draftItem, setDraftItem] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [customColor, setCustomColor] = useState<NoteColor>("sky");
  const [armedDelete, setArmedDelete] = useState(false);

  const progress = noteProgress(note.items);
  const bulletCount = extractBullets(note.body).items.length;
  const presentLabels = new Set(note.tags.map((tag) => tag.label));

  useEffect(() => {
    let cancelled = false;
    listAttachments(note.id).then((list) => {
      if (!cancelled) setAttachments(list);
    });
    return () => {
      cancelled = true;
    };
  }, [note.id]);

  async function reloadAttachments() {
    setAttachments(await listAttachments(note.id));
  }

  async function uploadFiles(files: File[]) {
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        await saveAttachment(note.id, file);
      }
      await reloadAttachments();
    } finally {
      setUploading(false);
    }
  }

  async function removeAttachment(id: string) {
    await deleteAttachment(id);
    await reloadAttachments();
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void uploadFiles(Array.from(event.dataTransfer.files));
  }

  function addTag(tag: NoteTag) {
    if (presentLabels.has(tag.label)) return;
    onPatch(note.id, (current) => ({ tags: [...current.tags, tag] }));
  }

  function removeTag(label: string) {
    onPatch(note.id, (current) => ({ tags: current.tags.filter((tag) => tag.label !== label) }));
  }

  function addCustomTag() {
    const label = customLabel.trim().slice(0, 24);
    if (!label) return;
    addTag({ label, color: customColor });
    setCustomLabel("");
  }

  function addItem() {
    const text = draftItem.trim();
    if (!text) return;
    onPatch(note.id, (current) => ({ items: [...current.items, newItem(text)] }));
    setDraftItem("");
  }

  function importBullets() {
    const { body, items } = extractBullets(note.body);
    if (!items.length) return;
    onPatch(note.id, (current) => ({ body, items: [...current.items, ...items.map(newItem)] }));
  }

  function handleDelete() {
    if (!armedDelete) {
      setArmedDelete(true);
      return;
    }
    onDelete(note);
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={note.title || "Sans titre"}
      description={`Modifiée le ${formatDateTime(note.updatedAt)} · ${wordCount(note.body)} mots`}
      className="max-w-3xl"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={note.title}
            onChange={(event) => onPatch(note.id, () => ({ title: event.target.value }))}
            placeholder="Titre de la note"
            className="min-w-0 flex-1 bg-transparent text-[20px] font-semibold text-ink outline-none placeholder:text-muted/60"
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label={note.pinned ? "Désépingler" : "Épingler"}
            onClick={() => onPatch(note.id, (current) => ({ pinned: !current.pinned }))}
          >
            {note.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
          </Button>
          <Button variant="ghost" size="icon" aria-label="Dupliquer" onClick={() => onDuplicate(note)}>
            <Copy className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Exporter en texte" onClick={() => onExport(note)}>
            <Download className="size-4" />
          </Button>
          <Button variant={armedDelete ? "danger" : "ghost"} size="sm" onClick={handleDelete}>
            <Trash2 className="size-4" />
            {armedDelete ? "Confirmer" : null}
          </Button>
        </div>

        <section className="space-y-3" aria-label="Tags">
          <div className="flex flex-wrap items-center gap-1.5">
            {note.tags.length ? (
              note.tags.map((tag) => (
                <TagChip key={tag.label} tag={tag} onRemove={() => removeTag(tag.label)} />
              ))
            ) : (
              <span className="text-[12px] text-muted">Aucun tag</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {PRESET_TAGS.filter((tag) => !presentLabels.has(tag.label)).map((tag) => (
              <button
                key={tag.label}
                type="button"
                onClick={() => addTag(tag)}
                className="rounded-full border border-dashed px-2 py-0.5 text-[11px] transition hover:opacity-100 opacity-70"
                style={{ borderColor: tagHex(tag), color: tagHex(tag) }}
              >
                + {tag.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={customLabel}
              onChange={(event) => setCustomLabel(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") addCustomTag();
              }}
              placeholder="Tag personnalisé"
              maxLength={24}
              className="h-8 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-[12px] text-ink outline-none focus:border-accent"
            />
            <div className="flex items-center gap-1" role="radiogroup" aria-label="Couleur du tag">
              {TAG_COLOR_CHOICES.map((color) => (
                <button
                  key={color}
                  type="button"
                  role="radio"
                  aria-checked={customColor === color}
                  aria-label={NOTE_COLORS[color].label}
                  onClick={() => setCustomColor(color)}
                  className={cn(
                    "size-4 rounded-full border-2 transition",
                    customColor === color ? "scale-110 border-ink" : "border-transparent",
                  )}
                  style={{ backgroundColor: NOTE_COLORS[color].hex }}
                />
              ))}
            </div>
            <Button variant="secondary" size="sm" onClick={addCustomTag}>
              <Plus className="size-4" />
              Ajouter
            </Button>
          </div>
        </section>

        <div className="flex items-center gap-2" role="radiogroup" aria-label="Couleur de la note">
          {(Object.keys(NOTE_COLORS) as NoteColor[]).map((color) => (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={note.color === color}
              aria-label={NOTE_COLORS[color].label}
              onClick={() => onPatch(note.id, () => ({ color }))}
              className={cn(
                "size-5 rounded-full border-2 transition",
                note.color === color ? "scale-110 border-ink" : "border-white/15 hover:scale-105",
              )}
              style={{ backgroundColor: NOTE_COLORS[color].hex }}
            />
          ))}
        </div>

        <textarea
          value={note.body}
          onChange={(event) => onPatch(note.id, () => ({ body: event.target.value }))}
          placeholder={"Brief, idées, notes…\nAstuce : une ligne « - élément » devient une case à cocher."}
          rows={6}
          className="w-full resize-y rounded-xl border border-line bg-panel px-4 py-3 text-[13px] leading-relaxed text-ink outline-none transition placeholder:text-muted/60 focus:border-accent"
        />

        <section className="space-y-3 rounded-xl border border-line bg-panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ListChecks className="size-4 text-muted" />
              <h3 className="text-[13px] font-medium text-ink">Cases à cocher</h3>
              {note.items.length ? (
                <span className="text-[11px] tabular-nums text-muted">
                  {progress.done}/{progress.total}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-1">
              {bulletCount ? (
                <Button variant="outline" size="sm" onClick={importBullets}>
                  Convertir les puces
                </Button>
              ) : null}
              {note.items.some((item) => item.done) ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onPatch(note.id, (current) => ({ items: current.items.filter((item) => !item.done) }))
                  }
                >
                  Retirer les cochées
                </Button>
              ) : null}
            </div>
          </div>

          {note.items.length ? (
            <div className="h-1 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          ) : null}

          <PlayfulTodoList
            items={note.items.map((item) => ({ id: item.id, label: item.text, checked: item.done }))}
            onToggle={(itemId, done) =>
              onPatch(note.id, (current) => ({
                items: current.items.map((item) => (item.id === itemId ? { ...item, done } : item)),
              }))
            }
            onRemove={(itemId) =>
              onPatch(note.id, (current) => ({ items: current.items.filter((item) => item.id !== itemId) }))
            }
          />

          <div className="flex items-center gap-2 pt-1">
            <input
              value={draftItem}
              onChange={(event) => setDraftItem(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") addItem();
              }}
              placeholder="Ajouter une étape puis Entrée"
              className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-[13px] text-ink outline-none transition focus:border-accent"
            />
            <Button variant="secondary" size="sm" onClick={addItem}>
              <Plus className="size-4" />
              Ajouter
            </Button>
          </div>
        </section>

        <section className="space-y-3" aria-label="Pièces jointes">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Paperclip className="size-4 text-muted" />
              <h3 className="text-[13px] font-medium text-ink">Fichiers</h3>
              {attachments.length ? (
                <span className="text-[11px] tabular-nums text-muted">{attachments.length}</span>
              ) : null}
            </div>
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-accent-strong hover:underline">
              <Upload className="size-3.5" />
              Choisir des fichiers
              <input
                type="file"
                multiple
                className="sr-only"
                onChange={(event) => {
                  void uploadFiles(Array.from(event.target.files ?? []));
                  event.target.value = "";
                }}
              />
            </label>
          </div>

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={cn(
              "rounded-xl border border-dashed p-4 text-center text-[12px] transition",
              dragging ? "border-accent bg-accent/10 text-ink" : "border-line-strong text-muted",
            )}
          >
            {uploading ? "Enregistrement…" : "Glisse ici n'importe quel fichier : image, vidéo, PDF, audio, texte…"}
          </div>

          {attachments.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="relative">
                  <AttachmentPreview attachment={attachment} />
                  <button
                    type="button"
                    onClick={() => void removeAttachment(attachment.id)}
                    aria-label={`Supprimer ${attachment.name}`}
                    className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-black/60 text-ink transition hover:bg-danger"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </Dialog>
  );
}
