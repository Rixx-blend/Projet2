"use client";

import { Download, FileIcon, Music } from "lucide-react";
import { useEffect, useState } from "react";

import { attachmentKind, type NoteAttachment } from "@/lib/notes-files";
import { cn, formatFileSize } from "@/lib/utils";

/** Aperçu d'une pièce jointe : image, vidéo, audio, PDF, texte, ou repli avec icône. */
export function AttachmentPreview({
  attachment,
  className,
}: {
  attachment: NoteAttachment;
  className?: string;
}) {
  const kind = attachmentKind(attachment.type, attachment.name);
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(attachment.blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [attachment.blob]);

  useEffect(() => {
    if (kind !== "text") return;
    let cancelled = false;
    attachment.blob
      .slice(0, 4000)
      .text()
      .then((content) => {
        if (!cancelled) setText(content);
      });
    return () => {
      cancelled = true;
    };
  }, [attachment.blob, kind]);

  return (
    <figure
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-lg border border-line bg-surface",
        className,
      )}
    >
      <div className="grid min-h-[120px] place-items-center bg-black/30">
        {url && kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={attachment.name} className="h-40 w-full object-contain" />
        ) : null}
        {url && kind === "video" ? (
          <video src={url} controls className="h-40 w-full bg-black object-contain" />
        ) : null}
        {url && kind === "audio" ? (
          <div className="flex w-full items-center gap-3 p-3">
            <Music className="size-5 shrink-0 text-accent" />
            <audio src={url} controls className="w-full" />
          </div>
        ) : null}
        {url && kind === "pdf" ? (
          <iframe src={url} title={attachment.name} className="h-48 w-full bg-white" />
        ) : null}
        {kind === "text" ? (
          <pre className="h-40 w-full overflow-auto whitespace-pre-wrap break-words bg-panel p-3 font-mono text-[11px] leading-relaxed text-ink-soft">
            {text ?? "Chargement…"}
          </pre>
        ) : null}
        {kind === "other" ? (
          <div className="flex flex-col items-center gap-2 py-8 text-muted">
            <FileIcon className="size-8" />
            <span className="text-[11px]">Aperçu indisponible pour ce format</span>
          </div>
        ) : null}
      </div>
      <figcaption className="flex items-center gap-2 border-t border-line px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-[12px] text-ink" title={attachment.name}>
          {attachment.name}
        </span>
        <span className="shrink-0 text-[10px] tabular-nums text-muted">
          {formatFileSize(attachment.size)}
        </span>
        {url ? (
          <a
            href={url}
            download={attachment.name}
            aria-label={`Télécharger ${attachment.name}`}
            className="grid size-6 shrink-0 place-items-center rounded-md text-muted transition hover:text-accent"
          >
            <Download className="size-3.5" />
          </a>
        ) : null}
      </figcaption>
    </figure>
  );
}
