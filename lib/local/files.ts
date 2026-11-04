import { randomUUID } from "node:crypto";
import { createWriteStream, promises as fs } from "node:fs";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as WebReadableStream } from "node:stream/web";

import { filesDir } from "@/lib/local/db";

/** Nettoie un nom de fichier pour un usage sûr sur le disque. */
export function sanitizeFileName(name: string) {
  const base = path.basename(name);
  const cleaned = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(-90);
  return cleaned || "fichier";
}

/**
 * Chemin absolu d'un fichier stocké, ou `null` si le chemin sort du dossier
 * de données (protection contre `../`).
 */
export function resolveStoredPath(storagePath: string): string | null {
  const root = filesDir();
  const absolute = path.resolve(root, storagePath);
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }
  return absolute;
}

/** Enregistre un flux (upload) dans `files/<orderId>/` et renvoie son chemin relatif. */
export async function saveUploadedStream(
  orderId: string,
  originalName: string,
  stream: ReadableStream<Uint8Array>,
): Promise<{ storagePath: string; size: number }> {
  const storedName = `${randomUUID()}-${sanitizeFileName(originalName)}`;
  const storagePath = `${orderId}/${storedName}`;
  const absolute = resolveStoredPath(storagePath);
  if (!absolute) throw new Error("Chemin de fichier invalide.");

  await fs.mkdir(path.dirname(absolute), { recursive: true });

  let size = 0;
  const counter = new Transform({
    transform(chunk, _encoding, callback) {
      size += chunk.length;
      callback(null, chunk);
    },
  });

  await pipeline(
    Readable.fromWeb(stream as unknown as WebReadableStream<Uint8Array>),
    counter,
    createWriteStream(absolute),
  );

  return { storagePath, size };
}

export async function deleteStoredFile(storagePath: string): Promise<void> {
  const absolute = resolveStoredPath(storagePath);
  if (!absolute) return;
  await fs.rm(absolute, { force: true });
}

const MIME_BY_EXTENSION: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".json": "application/json",
  ".zip": "application/zip",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

/** Type MIME déduit de l'extension (secours si le type n'a pas été enregistré). */
export function mimeFromPath(filePath: string): string {
  return MIME_BY_EXTENSION[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

/** Taille d'un fichier stocké, ou `null` s'il n'existe pas. */
export async function storedFileSize(storagePath: string): Promise<number | null> {
  const absolute = resolveStoredPath(storagePath);
  if (!absolute) return null;
  try {
    const stats = await fs.stat(absolute);
    return stats.isFile() ? stats.size : null;
  } catch {
    return null;
  }
}
