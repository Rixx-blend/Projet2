import { NextResponse } from "next/server";
import { z } from "zod";

import { safeEqual } from "@/lib/crypto";
import { addInboxItem } from "@/lib/local/db";
import {
  getBotSecret,
  readConnections,
  updateConnections,
} from "@/lib/local/connections";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Ingestion des demandes Discord (bot officiel).
 *
 * POST /api/inbox/discord
 * En-tête : x-orderboard-secret: <secret partagé, affiché dans Paramètres>
 *
 * Le bot tourne en continu chez un hébergeur ; cette route est la seule porte
 * d'entrée. Aucun self-bot, aucune lecture des MP du compte personnel : seuls
 * les messages envoyés AU bot et la commande /commande arrivent ici.
 */

const payloadSchema = z.object({
  external_id: z.string().trim().min(1).max(200),
  author: z.object({
    id: z.string().trim().max(64).optional(),
    name: z.string().trim().min(1).max(120),
    avatar: z.string().url().max(500).optional(),
  }),
  message: z.string().trim().min(1).max(8000),
  conversation_url: z.string().url().max(500).optional(),
  guild_id: z.string().trim().max(64).optional(),
  kind: z.enum(["dm", "command"]).optional(),
});

export async function POST(request: Request) {
  const expected = await getBotSecret();
  const provided = request.headers.get("x-orderboard-secret") ?? "";

  if (!provided || !safeEqual(provided, expected)) {
    return NextResponse.json({ error: "Secret invalide." }, { status: 401 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limit = rateLimit(`discord:${ip}`, 30, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Trop de requêtes, réessaie dans un instant." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Données invalides.",
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const data = parsed.data;

  try {
    const { item, created } = await addInboxItem({
      source: "discord",
      external_id: data.external_id,
      author_name: data.author.name,
      author_id: data.author.id ?? null,
      author_avatar: data.author.avatar ?? null,
      message: data.message,
      conversation_url: data.conversation_url ?? null,
      received_at: new Date().toISOString(),
    });

    await updateConnections((connections) => {
      connections.discord.last_seen_at = new Date().toISOString();
      connections.discord.last_author = data.author.name;
      connections.discord.last_error = null;
      if (data.guild_id) connections.discord.guild_id = data.guild_id;
    });

    return NextResponse.json(
      { ok: true, id: item.id, duplicate: !created },
      { status: created ? 201 : 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue.";
    await updateConnections((connections) => {
      connections.discord.last_error = message;
    }).catch(() => undefined);
    return NextResponse.json(
      { error: `Enregistrement impossible : ${message}` },
      { status: 500 },
    );
  }
}

/** Petit diagnostic public : la route est-elle configurée ? (sans secret) */
export async function GET() {
  const connections = await readConnections();
  return NextResponse.json({
    ok: true,
    configured: Boolean(connections.discord.application_id),
    last_seen_at: connections.discord.last_seen_at,
  });
}
