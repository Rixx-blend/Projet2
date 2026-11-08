import { NextResponse } from "next/server";

import { importLiveWorkboard } from "@/lib/local/workspaces";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: { live_board_id?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  if (typeof payload.live_board_id !== "string") {
    return NextResponse.json({ error: "Identifiant de planche manquant." }, { status: 400 });
  }
  try {
    const workboard = await importLiveWorkboard(payload.live_board_id);
    return NextResponse.json({ workboard });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Import impossible." }, { status: 400 });
  }
}
