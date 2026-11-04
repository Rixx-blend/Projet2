import { createReadStream, promises as fs } from "node:fs";
import { Readable } from "node:stream";

import { getFileByPath } from "@/lib/local/db";
import { mimeFromPath, resolveStoredPath } from "@/lib/local/files";

/**
 * Sert un fichier stocké localement (images du board, aperçus PDF…).
 * GET /api/files/<orderId>/<nom-du-fichier>
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const segments = (await params).path ?? [];
  const storagePath = segments.join("/");
  const absolute = resolveStoredPath(storagePath);

  if (!absolute) {
    return new Response("Chemin invalide.", { status: 400 });
  }

  let size: number;
  try {
    const stats = await fs.stat(absolute);
    if (!stats.isFile()) throw new Error("pas un fichier");
    size = stats.size;
  } catch {
    return new Response("Fichier introuvable.", { status: 404 });
  }

  const meta = await getFileByPath(storagePath);
  const type = meta?.type || mimeFromPath(absolute);
  const fileName = meta?.name ?? segments[segments.length - 1] ?? "fichier";

  const body = Readable.toWeb(createReadStream(absolute)) as unknown as ReadableStream;

  return new Response(body, {
    headers: {
      "Content-Type": type,
      "Content-Length": String(size),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
