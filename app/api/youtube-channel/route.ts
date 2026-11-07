import { NextResponse } from "next/server";

export const runtime = "nodejs";
type Obj = Record<string, unknown>;

function initialData(html: string): unknown {
  const marker = html.indexOf("ytInitialData");
  const start = marker < 0 ? -1 : html.indexOf("{", marker);
  if (start < 0) return null;
  let depth = 0, quoted = false, escaped = false;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      try { return JSON.parse(html.slice(start, i + 1)); } catch { return null; }
    }
  }
  return null;
}

function walk(value: unknown, fn: (o: Obj) => void): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) { value.forEach(v => walk(v, fn)); return; }
  const obj = value as Obj;
  fn(obj);
  Object.values(obj).forEach(v => walk(v, fn));
}

function txt(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (!value || typeof value !== "object") return "";
  const o = value as Obj;
  if (typeof o.simpleText === "string") return o.simpleText;
  // YouTube text runs use { text: "..." }, not always { simpleText: "..." }.
  if (typeof o.text === "string") return o.text;
  if (Array.isArray(o.runs)) return o.runs.map(txt).join("");
  return "";
}

function count(value: unknown): number | null {
  const raw = txt(value).replace(/[\u00a0\u202f]/g, " ").trim();
  const m = raw.match(/([\d][\d.,\s]*)\s*(k|m|b|million(?:s)?|millier(?:s)?|milliard(?:s)?)?/i);
  if (!m) return null;
  let n = m[1].replace(/\s/g, "");
  const suffix = (m[2] || "").toLowerCase();
  if (n.includes(",") && n.includes(".")) n = n.lastIndexOf(",") > n.lastIndexOf(".") ? n.replace(/\./g, "").replace(",", ".") : n.replace(/,/g, "");
  else if (n.includes(",")) {
    const p = n.split(",");
    n = p.length === 2 && p[1].length <= 2 && suffix ? p[0] + "." + p[1] : n.replace(/,/g, "");
  } else if (n.includes(".")) {
    const p = n.split(".");
    if (!(p.length === 2 && p[1].length <= 2 && suffix)) n = n.replace(/\./g, "");
  }
  const valueNumber = Number(n);
  if (!Number.isFinite(valueNumber)) return null;
  const factor = /^(k|millier)/.test(suffix) ? 1e3 : /^(m|million)/.test(suffix) ? 1e6 : /^(b|milliard)/.test(suffix) ? 1e9 : 1;
  return Math.round(valueNumber * factor);
}

async function page(url: string): Promise<{ html: string; data: unknown } | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36", "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8" },
      signal: AbortSignal.timeout(8500), cache: "no-store",
    });
    if (!response.ok) return null;
    const html = await response.text();
    return { html, data: initialData(html) };
  } catch { return null; }
}

function socialLinks(data: unknown, html: string) {
  const links = new Map<string, { label: string; url: string; kind: string }>();
  const add = (label: string, raw: string) => {
    try {
      const u = new URL(raw.startsWith("//") ? "https:" + raw : raw);
      if (!["http:", "https:"].includes(u.protocol)) return;
      const host = u.hostname.replace(/^www\./, "").toLowerCase();
      if (host.includes("youtube.com") || host.includes("youtu.be") || host.includes("google.com")) return;
      const kind = host.includes("instagram.com") ? "instagram" : host.includes("discord.") ? "discord"
        : host.includes("tiktok.com") ? "tiktok" : host === "x.com" || host.includes("twitter.com") ? "x"
        : host.includes("twitch.tv") ? "twitch" : host.includes("t.me") || host.includes("telegram.") ? "telegram" : "website";
      links.set(u.href, { label: label || host, url: u.href, kind });
    } catch { /* invalid external link */ }
  };
  walk(data, o => {
    const r = (o.channelExternalLinkRenderer || o.channelExternalLinkViewModel) as Obj | undefined;
    if (!r) return;
    const label = txt(r.title) || txt(r.titleText) || txt(r.linkText);
    let href = typeof r.url === "string" ? r.url : "";
    walk(r, n => {
      const endpoint = n.urlEndpoint as Obj | undefined;
      if (!href && typeof endpoint?.url === "string") href = endpoint.url;
    });
    if (href) add(label, href);
  });
  const matches = html.match(/https?:\\?\/\\?\/[^\s"'<>\\]+/g) || [];
  for (const match of matches) {
    const url = match.replace(/\\u0026/g, "&").replace(/\\\//g, "/").replace(/\\\\/g, "").replace(/[),.;]+$/, "");
    if (/instagram\.com|discord\.(?:gg|com)|tiktok\.com|twitch\.tv|x\.com|twitter\.com|t\.me|linktr\.ee|beacons\.ai/i.test(url)) add("", url);
  }
  return [...links.values()].slice(0, 12);
}

function deepStrings(value: unknown, output: string[] = []): string[] {
  if ( typeof value === "string") output.push(value);
  else if (Array.isArray(value)) value.forEach(item => deepStrings(item, output));
  else if (value && typeof value === "object") Object.values(value as Obj).forEach(item => deepStrings(item, output));
  return output;
}

function countFromMatchingText(data: unknown, pattern: RegExp): number | null {
  const candidates = [...new Set(deepStrings(data))].filter(value => pattern.test(value));
  for (const candidate of candidates) {
    const result = count(candidate);
    if (result !== null) return result;
  }
  return null;
}

function rendererViews(renderer: Obj): number | null {
  const preferred = [renderer.viewCountText, renderer.shortViewCountText, renderer.viewCount];
  for (const value of preferred) {
    const result = count(value);
    if (result !== null) return result;
  }
  const candidates = deepStrings(renderer).filter(value => /\b(?:views?|vues?)\b/i.test(value));
  for (const candidate of candidates) {
    const result = count(candidate);
    if (result !== null) return result;
  }
  return null;
}

function videoStats(data: unknown, shortsPage = false) {
  const found = new Map<string, { views: number | null; short: boolean }>();
  walk(data, o => {
    const isReel = Boolean(o.reelItemRenderer || o.shortsLockupViewModel);
    const renderer = (o.videoRenderer || o.gridVideoRenderer || o.reelItemRenderer || o.shortsLockupViewModel) as Obj | undefined;
    if (!renderer) return;
    let id = typeof renderer.videoId === "string" ? renderer.videoId
      : typeof renderer.video_id === "string" ? renderer.video_id : "";
    if (!id) {
      walk(renderer, nested => {
        const endpoint = nested.reelWatchEndpoint as Obj | undefined;
        if (!id && typeof endpoint?.videoId === "string") id = endpoint.videoId;
        if (!id && typeof nested.videoId === "string") id = nested.videoId;
      });
    }
    // Shorts lockups can omit the video ID in some YouTube responses.
    if (!id && (shortsPage || isReel)) id = "short-" + found.size;
    if (!id) return;
    const views = rendererViews(renderer);
    if (!found.has(id)) found.set(id, { views, short: shortsPage || isReel });
  });
  const regular = [...found.values()].filter(video => !video.short && video.views !== null).slice(0, 12);
  return {
    averageViews: regular.length ? Math.round(regular.reduce((sum, video) => sum + (video.views || 0), 0) / regular.length) : null,
    sampledVideos: regular.length,
    shortsCount: [...found.values()].filter(video => video.short).length,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { url?: string };
    const url = new URL(typeof body.url === "string" ? body.url.trim() : "");
    if (!["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) return NextResponse.json({ error: "Colle un lien youtube.com valide." }, { status: 400 });
    if (!url.pathname.startsWith("/@") && !url.pathname.startsWith("/channel/") && !url.pathname.startsWith("/c/") && !url.pathname.startsWith("/user/")) return NextResponse.json({ error: "Utilise le lien public de la chaîne, pas un lien de vidéo." }, { status: 400 });

    const base = url.origin + url.pathname.replace(/\/$/, "");
    const [main, videos, shorts, about] = await Promise.all([page(base), page(base + "/videos"), page(base + "/shorts"), page(base + "/about")]);
    if (!main?.data) throw new Error("YouTube n'a pas fourni les données de cette chaîne.");
    const metadata: Obj[] = [];
    walk(main.data, o => { if (o.channelMetadataRenderer) metadata.push(o.channelMetadataRenderer as Obj); });
    const channel = metadata[0];
    const name = typeof channel?.title === "string" ? channel.title : "";
    const avatar = channel?.avatar as { thumbnails?: { url?: string }[] } | undefined;
    const avatarUrl = avatar?.thumbnails?.[avatar.thumbnails.length - 1]?.url || "";
    const subscribersText: unknown[] = [];
    const videoCountTexts: unknown[] = [];
    walk(main.data, o => {
      for (const key of ["subscriberCountText", "subscriberCount", "subscriberCountTextContent"]) {
        if (o[key] !== undefined && o[key] !== null) subscribersText.push(o[key]);
      }
      for (const key of ["videosCountText", "videoCountText", "videoCount"]) {
        if (o[key] !== undefined && o[key] !== null) videoCountTexts.push(o[key]);
      }
    });
    // Prefer explicit YouTube channel-header fields; use matching visible labels only as fallback.
    const subscriberFallback = countFromMatchingText(main.data, /abonnés|subscribers/i);
    const videoCountFallback = countFromMatchingText(main.data, /\bvidéos?\b|\bvideos?\b/i);
    if (!name || !avatarUrl) throw new Error("Profil introuvable ou informations masquées par YouTube.");
    const links = [...socialLinks(main.data, main.html), ...(videos ? socialLinks(videos.data, videos.html) : []), ...(about ? socialLinks(about.data, about.html) : [])]
      .filter((link, index, all) => all.findIndex(item =>
        item.kind === link.kind && (link.kind === "website"
          ? new URL(item.url).hostname === new URL(link.url).hostname
          : true)
      ) === index).slice(0, 12);
    const video = videos?.data ? videoStats(videos.data) : { averageViews: null, sampledVideos: 0, shortsCount: 0 };
    const short = shorts?.data ? videoStats(shorts.data) : { averageViews: null, sampledVideos: 0, shortsCount: 0 };

    return NextResponse.json({
      name, avatarUrl,
      subscribers: subscribersText.map(count).find(value => value !== null) ?? subscriberFallback,
      videosCount: count(channel?.videoCountText ?? channel?.videosCountText) ?? videoCountTexts.map(count).find(value => value !== null) ?? videoCountFallback,
      averageViews: video.averageViews, sampledVideos: video.sampledVideos,
      shortsCount: short.shortsCount, socialLinks: links,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Impossible de lire cette chaîne." }, { status: 400 });
  }
}
