import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const incoming = new URL(request.url);
    const raw = incoming.searchParams.get("url");
    if (!raw) return NextResponse.json({ error: "URL de photo manquante." }, { status: 400 });

    const imageUrl = new URL(raw);
    const host = imageUrl.hostname.toLowerCase();
    const trustedHost = host.endsWith(".googleusercontent.com") || host.endsWith(".ytimg.com");
    if (!trustedHost || !["https:"].includes(imageUrl.protocol)) {
      return NextResponse.json({ error: "Source de photo non autorisée." }, { status: 400 });
    }

    const upstream = await fetch(imageUrl.toString(), {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "image/avif,image/webp,image/png,image/jpeg,*/*" },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (!upstream.ok) return NextResponse.json({ error: "Photo YouTube introuvable." }, { status: 404 });

    const type = upstream.headers.get("content-type") || "image/jpeg";
    if (!type.startsWith("image/")) return NextResponse.json({ error: "Le fichier reçu n'est pas une image." }, { status: 415 });
    const extension = type.includes("png") ? "png" : type.includes("webp") ? "webp" : type.includes("avif") ? "avif" : "jpg";
    return new Response(await upstream.arrayBuffer(), {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `attachment; filename="photo-profil-youtube.${extension}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Impossible de télécharger cette photo de profil." }, { status: 400 });
  }
}
