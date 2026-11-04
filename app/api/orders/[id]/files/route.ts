import { NextResponse } from "next/server";

import { addFile, getOrder, listFiles, removeFile } from "@/lib/local/db";
import { deleteStoredFile, saveUploadedStream } from "@/lib/local/files";

/** Décodage tolérant d'un nom de fichier passé en en-tête. */
function readFileName(request: Request): string {
  const raw = request.headers.get("x-file-name") ?? "";
  try {
    return decodeURIComponent(raw).slice(0, 255) || "fichier";
  } catch {
    return raw.slice(0, 255) || "fichier";
  }
}

/**
 * Envoi d'un fichier (corps de requête = contenu brut du fichier).
 * POST /api/orders/[id]/files
 * En-têtes : `x-file-name` (nom encodé), `content-type` (type MIME).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: orderId } = await params;

  if (!(await getOrder(orderId))) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }

  if (!request.body) {
    return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
  }

  const name = readFileName(request);
  const type = request.headers.get("content-type") || null;

  try {
    const { storagePath, size } = await saveUploadedStream(
      orderId,
      name,
      request.body,
    );

    const file = await addFile({
      order_id: orderId,
      name,
      type,
      size,
      storage_path: storagePath,
    });

    return NextResponse.json({
      file: { ...file, url: `/api/files/${storagePath}` },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Envoi impossible : ${
          error instanceof Error ? error.message : "erreur inconnue"
        }`,
      },
      { status: 500 },
    );
  }
}

/** Supprime un fichier du disque et de la base. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: orderId } = await params;
  const fileId = new URL(request.url).searchParams.get("fileId");

  if (!fileId) {
    return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
  }

  const file = (await listFiles(orderId)).find((entry) => entry.id === fileId);
  if (!file) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }

  try {
    await deleteStoredFile(file.storage_path);
    await removeFile(file.id);
  } catch (error) {
    return NextResponse.json(
      {
        error: `Suppression impossible : ${
          error instanceof Error ? error.message : "erreur inconnue"
        }`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
