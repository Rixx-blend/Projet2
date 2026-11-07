import { NextResponse } from "next/server";

export const runtime = "nodejs";

function findJsonObject(html: string): unknown {
  const markerIndex = html.indexOf("ytInitialData");
  if (markerIndex < 0) return null;
  const start = html.indexOf("{", markerIndex);
  if (start < 0) return null;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let i = start; i < html.length; i += 1) {
    const char = html[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        try { return JSON.parse(html.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

function collect(value: unknown, keys: Set<string>, found: Record<string, unknown> = {}): Record<string, unknown> {
  if (!value || typeof value !== "object") return found;
  if (Array.isArray(value)) {
    for (const item of value) collect(item, keys, found);
    return found;
  }
  const record = value as Record<string, unknown>;
  for (const [key, child] of Object.entries(record)) {
    if (keys.has(key) && found[key] === undefined) found[key] = child;
    collect(child, keys, found);
  }
  return found;
}

function textValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  const item = value as Record<string, unknown>;
  if (typeof item.simpleText === "string") return item.simpleText;
  if (Array.isArray(item.runs)) return item.runs.map((run) => textValue(run)).join("");
  return "";
}

function parseCount(value: unknown): number | null {
  const raw = textValue(value).replace(/\u00a0/g, " ").trim();
  if (!raw) return null;
  const match = raw.match(/[\d\s.,]+\s*([kmb]|millions?|milliers?|milliards?)?/i);
  if (!match) return null;
  const number = Number(match[0].replace(/[^\d.,]/g, "").replace(",", "."));
  if (!Number.isFinite(number)) return null;
  const suffix = (match[1] || "").toLowerCase();
  const multiplier = /^(k|millier)/.test(suffix) ? 1_000 : /^(m|million)/.test(suffix) ? 1_000_000 : /^(b|milliard)/.test(suffix) ? 1_000_000_000 : 1;
  return Math.round(number * multiplier);
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { url?: string };
    const input = typeof body.url === "string" ? body.url.trim() : "";
    const url = new URL(input);
    if (!["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) {
      return NextResponse.json({ error: "Colle un lien youtube.com valide." }, { status: 400 });
    }
    if (!url.pathname.startsWith("/@") && !url.pathname.startsWith("/channel/") && !url.pathname.startsWith("/c/") && !url.pathname.startsWith("/user/")) {
      return NextResponse.json({ error: "Utilise le lien public de la chaîne, pas un lien de vidéo." }, { status: 400 });
    }

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("YouTube n'a pas répondu correctement. Réessaie dans quelques instants.");
    const html = await response.text();
    const data = findJsonObject(html);
    if (!data) throw new Error("YouTube n'a pas fourni les données de cette chaîne.");
    const found = collect(data, new Set(["channelMetadataRenderer", "c4TabbedHeaderRenderer", "subscriberCountText", "videosCountText", "videoCountText"]));
    const metadata = found.channelMetadataRenderer as Record<string, unknown> | undefined;
    const header = found.c4TabbedHeaderRenderer as Record<string, unknown> | undefined;
    const name = typeof metadata?.title === "string" ? metadata.title : "";
    const avatar = metadata?.avatar as { thumbnails?: { url?: string }[] } | undefined;
    const avatarUrl = avatar?.thumbnails?.[avatar.thumbnails.length - 1]?.url || "";
    const subscribers = parseCount(found.subscriberCountText ?? header?.subscriberCountText);
    const videosCount = parseCount(found.videosCountText ?? found.videoCountText);
    if (!name || !avatarUrl) throw new Error("Profil introuvable ou informations masquées par YouTube.");
    return NextResponse.json({ name, avatarUrl, subscribers, videosCount });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Impossible de lire cette chaîne." }, { status: 400 });
  }
}
