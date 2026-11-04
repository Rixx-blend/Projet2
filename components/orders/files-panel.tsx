"use client";

import {
  Download,
  ExternalLink,
  FileArchive,
  FileText,
  ImageIcon,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  deleteOrderFile,
  fileUrl,
  isImageFile,
  isPdfFile,
  uploadOrderFile,
} from "@/lib/storage";
import { formatFileSize } from "@/lib/utils";
import type { OrderFile } from "@/types/database";

function FileIcon({ file }: { file: OrderFile }) {
  if (isImageFile(file)) return <ImageIcon className="size-4 text-blue" />;
  if (isPdfFile(file)) return <FileText className="size-4 text-danger" />;
  if (/\.(zip|rar|7z|tar|gz)$/i.test(file.name))
    return <FileArchive className="size-4 text-warning" />;
  return <FileText className="size-4 text-muted" />;
}

export function FilesPanel({
  orderId,
  files,
  onChanged,
}: {
  orderId: string;
  files: OrderFile[];
  onChanged: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<OrderFile | null>(null);

  async function handleFiles(list: File[]) {
    if (list.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of list) {
        const result = await uploadOrderFile(file, orderId);
        if (result.error) setError(result.error);
      }
      onChanged();
    } finally {
      setUploading(false);
    }
  }

  async function remove(file: OrderFile) {
    if (!window.confirm(`Supprimer « ${file.name} » ?`)) return;
    setError(null);
    const result = await deleteOrderFile(orderId, file.id);
    if (!result.ok) {
      setError(result.error ?? "Suppression impossible.");
      return;
    }
    onChanged();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted">
          {files.length} fichier{files.length > 1 ? "s" : ""} · PSD, .blend, PDF, ZIP, images…
        </p>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
          Importer
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => {
            const list = Array.from(event.target.files ?? []);
            event.target.value = "";
            void handleFiles(list);
          }}
        />
      </div>

      {error ? (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[11px] text-danger">
          {error}
        </p>
      ) : null}

      {files.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-3 py-8 text-center text-xs text-muted">
          Aucun fichier. Glisse un fichier sur le board ou clique sur Importer.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {files.map((file) => {
            const url = fileUrl(file.storage_path);
            return (
              <li
                key={file.id}
                className="flex items-center gap-2 rounded-lg border border-line bg-panel-2/60 px-2 py-1.5"
              >
                {isImageFile(file) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt={file.name}
                    className="size-8 shrink-0 rounded object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="grid size-8 shrink-0 place-items-center rounded bg-panel">
                    <FileIcon file={file} />
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setPreview(file)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-[12px] text-ink">{file.name}</span>
                  <span className="block text-[10px] text-muted">
                    {formatFileSize(file.size)} ·{" "}
                    {new Date(file.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </button>

                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Ouvrir ${file.name}`}
                  className="rounded p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-ink"
                >
                  <ExternalLink className="size-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => void remove(file)}
                  aria-label={`Supprimer ${file.name}`}
                  className="rounded p-1.5 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog
        open={preview !== null}
        onClose={() => setPreview(null)}
        title={preview?.name ?? "Aperçu"}
        description={preview ? formatFileSize(preview.size) : undefined}
        className="max-w-3xl"
      >
        {preview ? <FilePreview file={preview} /> : null}
      </Dialog>
    </div>
  );
}

function FilePreview({ file }: { file: OrderFile }) {
  const url = fileUrl(file.storage_path);

  if (isImageFile(file)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={file.name}
        className="mx-auto max-h-[70vh] w-auto rounded-lg border border-line"
      />
    );
  }

  if (isPdfFile(file)) {
    return (
      <iframe
        src={url}
        title={file.name}
        className="h-[70vh] w-full rounded-lg border border-line bg-white"
      />
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-line bg-panel-2 p-4 text-center">
      <p className="text-sm text-ink-soft">
        Aperçu non disponible pour ce format.
      </p>
      <p className="break-all text-xs text-muted">{file.name}</p>
      <a href={url} target="_blank" rel="noreferrer" download>
        <Button size="sm">
          <Download className="size-3.5" />
          Télécharger le fichier
        </Button>
      </a>
    </div>
  );
}
