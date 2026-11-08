import { NextResponse } from "next/server";

import { deleteWorkboard, getWorkboard, updateWorkboard } from "@/lib/local/workspaces";

export const dynamic = "force-dynamic";
const MAX_SNAPSHOT_BYTES = 8_000_000;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workboard = await getWorkboard(id);
  if (!workboard) return NextResponse.json({ error: "Planche introuvable." }, { status: 404 });
  return NextResponse.json({ workboard });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let payload: { title?: unknown; category?: unknown; snapshot?: unknown; live_board_id?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  if (payload.snapshot && JSON.stringify(payload.snapshot).length > MAX_SNAPSHOT_BYTES) {
    return NextResponse.json({ error: "Planche trop volumineuse (8 Mo maximum)." }, { status: 413 });
  }
  const workboard = await updateWorkboard(id, {
    ...(typeof payload.title === "string" ? { title: payload.title } : {}),
    ...(typeof payload.category === "string" ? { category: payload.category } : {}),
    ...("live_board_id" in payload && (typeof payload.live_board_id === "string" || payload.live_board_id === null) ? { live_board_id: payload.live_board_id } : {}),
    ...("snapshot" in payload ? { snapshot: payload.snapshot } : {}),
  });
  if (!workboard) return NextResponse.json({ error: "Planche introuvable." }, { status: 404 });
  return NextResponse.json({ workboard });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = await deleteWorkboard(id);
  if (!deleted) return NextResponse.json({ error: "Planche introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
