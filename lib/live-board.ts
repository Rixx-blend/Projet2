// Adresse publique du serveur de synchro (Cloudflare Worker).
export const LIVE_BOARD_BASE = "https://rixx-sync.rixx-studio-sync.workers.dev";

export function liveBoardUrl(id: string) {
  return `${LIVE_BOARD_BASE}/b/${id}`;
}
