import { NextResponse } from "next/server";

import { createWorkboard, listWorkboards } from "@/lib/local/workspaces";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ workboards: await listWorkboards() });
}

export async function POST(request: Request) {
  let payload: { title?: unknown; category?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const title = typeof payload.title === "string" ? payload.title : "Nouvelle planche";
  const category = typeof payload.category === "string" ? payload.category : "Miniature";
  const workboard = await createWorkboard(title, category);
  return NextResponse.json({ workboard }, { status: 201 });
}
