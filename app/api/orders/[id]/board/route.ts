import { NextResponse } from "next/server";

import { promises as fs } from "node:fs";

import { boardFile, getOrder, saveBoard } from "@/lib/local/db";

const MAX_SNAPSHOT_BYTES = 8_000_000;

/**
 * Autosave du board tldraw (stocké dans `boards/<orderId>.json`).
 * PUT /api/orders/[id]/board  { content: snapshot }
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: orderId } = await params;

  let payload: { content?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const { content } = payload;
  if (!content || typeof content !== "object") {
    return NextResponse.json({ error: "Snapshot manquant." }, { status: 400 });
  }

  if (JSON.stringify(content).length > MAX_SNAPSHOT_BYTES) {
    return NextResponse.json(
      { error: "Board trop volumineux (8 Mo maximum)." },
      { status: 413 },
    );
  }

  if (!(await getOrder(orderId))) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }

  try {
    if (new URL(request.url).searchParams.get("backup") === "1") {
      await fs
        .copyFile(boardFile(orderId), `${boardFile(orderId)}.sauvegarde-${Date.now()}`)
        .catch(() => undefined);
    }
    const saved = await saveBoard(orderId, content);
    return NextResponse.json(saved);
  } catch (error) {
    return NextResponse.json(
      {
        error: `Sauvegarde impossible : ${
          error instanceof Error ? error.message : "erreur inconnue"
        }`,
      },
      { status: 500 },
    );
  }
}
