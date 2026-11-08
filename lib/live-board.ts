// Adresse publique du serveur de synchro (Cloudflare Worker).
// NEXT_PUBLIC_LIVE_BOARD_BASE permet de tester avec un serveur local (wrangler dev).
export const LIVE_BOARD_BASE = process.env.NEXT_PUBLIC_LIVE_BOARD_BASE || "https://rixx-sync.rixx-studio-sync.workers.dev";

export function liveBoardUrl(id: string) {
  return `${LIVE_BOARD_BASE}/b/${id}`;
}

// Adresse WebSocket de la planche (même serveur, protocole wss).
export function liveSocketUrl(id: string) {
  return `${LIVE_BOARD_BASE.replace(/^https:/, "wss:").replace(/^http:/, "ws:")}/connect/${id}`;
}
