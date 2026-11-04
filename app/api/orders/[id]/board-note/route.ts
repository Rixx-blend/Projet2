import { NextResponse } from "next/server";

import { clearBoardNote, getOrder } from "@/lib/local/db";

/** DELETE /api/orders/[id]/board-note — le brief a été déposé sur le canvas. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!(await getOrder(id))) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }

  await clearBoardNote(id);
  return NextResponse.json({ ok: true });
}
