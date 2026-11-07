"use client";

import { ClipboardPaste, File as FileIcon, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn, formatFileSize } from "@/lib/utils";

const fileKey = (file: File) => `${file.name}|${file.size}|${file.lastModified}`;

/** Fusionne sans doublon (même nom, même taille, même date). */
function mergeFiles(current: File[], added: File[]) {
  const known = new Set(current.map(fileKey));
  const next = [...current];
  for (const file of added) {
    if (known.has(fileKey(file))) continue;
    known.add(fileKey(file));
    next.push(file);
  }
  return next;
}

/** Les captures d'écran collées s'appellent toutes « image.png » : on leur donne un nom unique. */
function nameClipboardFiles(files: File[]) {
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  return files.map((file, index) => {
    if (file.name && !/^image\.[a-z0-9]+$/i.test(file.name)) return file;
    const extension = file.type.split("/")[1]?.split("+")[0] || "png";
    return new File([file], `capture-${stamp}-${index + 1}.${extension}`, {
      type: file.type,
      lastModified: Date.now() + index,
    });
  });
}

function hasFiles(event: { dataTransfer: DataTransfer | null }) {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

function Thumb({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  const isImage = file.type.startsWith("image/");

  useEffect(() => {
    if (!isImage) return;
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, isImage]);

  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="size-10 shrink-0 rounded-lg object-cover" />;
  }
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-panel text-muted">
      <FileIcon className="size-4" />
    </span>
  );
}

/**
 * Zone d'ajout de fichiers : clic (sélection multiple), glisser-déposer
 * et collage depuis le presse-papiers (Ctrl+V / Cmd+V).
 * Les fichiers restent dans l'état du parent : ils sont envoyés après l'enregistrement de la commande.
 */
export function FileDropzone({
  files,
  onChange,
  disabled = false,
  className,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  // Toujours la dernière valeur, pour les écouteurs globaux ci-dessous.
  const latest = useRef({ files, onChange, disabled });
  latest.current = { files, onChange, disabled };

  const add = (added: File[]) => {
    if (latest.current.disabled || added.length === 0) return;
    latest.current.onChange(mergeFiles(latest.current.files, added));
  };

  useEffect(() => {
    // Ctrl+V : uniquement si le presse-papiers contient des fichiers / images.
    // Le texte collé dans un champ n'est jamais intercepté.
    function onPaste(event: ClipboardEvent) {
      const data = event.clipboardData;
      if (!data) return;
      let pasted = Array.from(data.files);
      if (pasted.length === 0) {
        pasted = Array.from(data.items)
          .filter((item) => item.kind === "file")
          .map((item) => item.getAsFile())
          .filter((file): file is File => file !== null);
      }
      if (pasted.length === 0 || latest.current.disabled) return;
      event.preventDefault();
      // Empêche le board en arrière-plan de recevoir aussi le collage.
      event.stopImmediatePropagation();
      add(nameClipboardFiles(pasted));
    }

    // Un fichier lâché à côté de la zone ne doit pas faire naviguer la fenêtre.
    function blockStrayDrop(event: DragEvent) {
      if (hasFiles(event)) event.preventDefault();
    }

    window.addEventListener("paste", onPaste, true);
    window.addEventListener("dragover", blockStrayDrop);
    window.addEventListener("drop", blockStrayDrop);
    return () => {
      window.removeEventListener("paste", onPaste, true);
      window.removeEventListener("dragover", blockStrayDrop);
      window.removeEventListener("drop", blockStrayDrop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={0}
        aria-label="Ajouter des fichiers"
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!disabled) inputRef.current?.click();
          }
        }}
        onDragEnter={(event) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          dragDepth.current += 1;
          setDragging(true);
        }}
        onDragOver={(event) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={() => {
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        }}
        onDrop={(event) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          event.stopPropagation();
          dragDepth.current = 0;
          setDragging(false);
          add(Array.from(event.dataTransfer.files));
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition outline-none",
          "focus-visible:border-accent/70",
          dragging
            ? "border-accent bg-accent/10"
            : "border-line-strong bg-surface/50 hover:border-accent/60 hover:bg-accent/5",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        <span className="grid size-10 place-items-center rounded-xl border border-line bg-panel text-accent">
          <Plus className="size-5" />
        </span>
        <span className="text-sm font-medium text-ink">
          {dragging ? "Dépose tes fichiers ici" : "Choisir des fichiers ou les glisser ici"}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
          <ClipboardPaste className="size-3.5" />
          Tous formats · sélection multiple · Ctrl+V pour coller une image
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            const picked = Array.from(event.target.files ?? []);
            event.target.value = "";
            add(picked);
          }}
        />
      </div>

      {files.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {files.map((file) => (
            <li
              key={fileKey(file)}
              className="flex items-center gap-2.5 rounded-lg border border-line bg-panel-2/60 px-2 py-1.5"
            >
              <Thumb file={file} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] text-ink">{file.name}</span>
                <span className="block text-[10px] text-muted">{formatFileSize(file.size)}</span>
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(files.filter((entry) => entry !== file))}
                aria-label={`Retirer ${file.name}`}
                className="rounded p-1.5 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
