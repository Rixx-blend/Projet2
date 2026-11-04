import {
  getXClient,
  getXTokens,
  readConnections,
  recordXCall,
  resetXUsageIfNeeded,
  saveXTokens,
  updateConnections,
  xConnected,
} from "@/lib/local/connections";
import { addInboxItem, getSettings } from "@/lib/local/db";
import {
  conversationUrl,
  fetchDmEvents,
  refreshAccessToken,
  XApiError,
  type XDmEvent,
  type XUser,
} from "@/lib/x-api";

/**
 * Synchronisation des messages privés X.
 *
 * Appelée par le planificateur de l'application (toutes les N minutes) ou par
 * le bouton « Actualiser maintenant ». Une seule page de résultats par passage
 * (100 messages) : l'API X est facturée à l'appel.
 */

export type XSyncResult = {
  ok: boolean;
  /** Nombre de demandes ajoutées à la boîte de réception. */
  imported: number;
  /** Messages déjà connus (doublons ignorés). */
  duplicates: number;
  /** Messages reçus de ton propre compte, ignorés. */
  skipped: number;
  /** Appels API consommés par ce passage. */
  calls: number;
  error?: string;
  message?: string;
};

const EMPTY = { imported: 0, duplicates: 0, skipped: 0, calls: 0 };

function friendlyError(error: unknown): string {
  if (error instanceof XApiError) {
    if (error.status === 401) {
      return "Jeton X expiré ou révoqué : reconnecte ton compte dans Paramètres → Connexions.";
    }
    if (error.status === 403) {
      return "Accès refusé par X : vérifie que l’application a bien la permission « Messages privés » (dm.read).";
    }
    if (error.status === 429) {
      return "Limite de requêtes X atteinte. La synchronisation reprendra plus tard.";
    }
    return error.message;
  }
  if (error instanceof Error) {
    return `Synchronisation impossible : ${error.message}`;
  }
  return "Synchronisation impossible (erreur inconnue).";
}

function tokenExpired(expiresAt: string | null) {
  if (!expiresAt) return false;
  const time = Date.parse(expiresAt);
  if (Number.isNaN(time)) return false;
  // Marge de 2 minutes pour éviter un jeton expiré en cours d'appel.
  return time - Date.now() < 120_000;
}

async function fail(error: string): Promise<XSyncResult> {
  await updateConnections((next) => {
    next.x.last_error = error;
  });
  return { ok: false, ...EMPTY, error };
}

export async function syncX(): Promise<XSyncResult> {
  const settings = await getSettings();
  const connections = await resetXUsageIfNeeded();

  if (!settings.x_sync_enabled) {
    return {
      ok: false,
      ...EMPTY,
      error: "La synchronisation X est désactivée dans les paramètres.",
    };
  }
  if (!xConnected(connections)) {
    return {
      ok: false,
      ...EMPTY,
      error: "Aucun compte X connecté.",
    };
  }

  const limit = settings.x_monthly_call_limit;
  if (limit > 0 && connections.x.usage_calls >= limit) {
    const error = `Plafond mensuel atteint (${connections.x.usage_calls}/${limit} appels). La synchronisation est en pause jusqu’au mois prochain.`;
    return { ok: false, ...EMPTY, error };
  }

  const client = await getXClient();
  if (!client.clientId) {
    return fail("Identifiant client X manquant : renseigne-le dans Paramètres → Connexions.");
  }

  const cost = Math.max(0, settings.x_call_cost_estimate);
  let calls = 0;
  let tokens = await getXTokens();

  if (!tokens.accessToken || !tokens.refreshToken) {
    return fail("Connexion X incomplète : reconnecte ton compte.");
  }

  let accessToken = tokens.accessToken;

  try {
    if (tokenExpired(tokens.expiresAt)) {
      if (limit > 0 && connections.x.usage_calls + calls >= limit) {
        return fail(
          `Plafond mensuel atteint (${limit} appels) avant le renouvellement du jeton.`,
        );
      }
      const refreshed = await refreshAccessToken({
        client,
        refreshToken: tokens.refreshToken,
      });
      calls += 1;
      await recordXCall(cost);
      if (!refreshed.access_token) {
        return fail("X n’a pas renvoyé de jeton d’accès. Reconnecte ton compte.");
      }
      accessToken = refreshed.access_token;
      const expiresAt = refreshed.expires_in
        ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
        : null;
      await saveXTokens({
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token ?? tokens.refreshToken,
        expiresAt,
      });
    }

    if (limit > 0 && connections.x.usage_calls + calls >= limit) {
      return fail(
        `Plafond mensuel atteint (${limit} appels). Aucun nouvel appel n’a été effectué.`,
      );
    }

    const response = await fetchDmEvents({
      accessToken,
      startTime: connections.x.last_event_at,
      maxResults: 100,
    });
    calls += 1;
    await recordXCall(cost);

    const users = new Map<string, XUser>();
    for (const user of response.includes?.users ?? []) users.set(user.id, user);

    const events = [...(response.data ?? [])].sort((a, b) =>
      (a.created_at ?? "").localeCompare(b.created_at ?? ""),
    );

    let imported = 0;
    let duplicates = 0;
    let skipped = 0;
    let newest = connections.x.last_event_at;

    for (const event of events) {
      if (!event.id) continue;
      const createdAt = event.created_at ?? new Date().toISOString();
      if (!newest || createdAt > newest) newest = createdAt;

      if (
        (event.event_type && event.event_type !== "MessageCreate") ||
        !event.text?.trim()
      ) {
        skipped += 1;
        continue;
      }
      if (connections.x.user_id && event.sender_id === connections.x.user_id) {
        skipped += 1;
        continue;
      }

      const sender = event.sender_id ? users.get(event.sender_id) : undefined;
      const result = await addInboxItem({
        source: "twitter",
        external_id: `x:${event.id}`,
        author_name: sender?.username
          ? `@${sender.username}`
          : `Utilisateur ${event.sender_id ?? "inconnu"}`,
        author_id: event.sender_id ?? null,
        author_avatar: sender?.profile_image_url ?? null,
        message: event.text,
        conversation_url: conversationUrl(event),
        received_at: createdAt,
      });
      if (result.created) imported += 1;
      else duplicates += 1;
    }

    await updateConnections((next) => {
      next.x.last_sync_at = new Date().toISOString();
      next.x.last_event_at = newest;
      next.x.last_error = null;
    });

    const parts: string[] = [];
    parts.push(
      imported > 0
        ? `${imported} nouvelle${imported > 1 ? "s" : ""} demande${imported > 1 ? "s" : ""}`
        : "Aucun nouveau message",
    );
    if (duplicates > 0) parts.push(`${duplicates} doublon${duplicates > 1 ? "s" : ""}`);
    if (calls > 0) parts.push(`${calls} appel${calls > 1 ? "s" : ""} API`);

    return {
      ok: true,
      imported,
      duplicates,
      skipped,
      calls,
      message: parts.join(" · "),
    };
  } catch (error) {
    return fail(friendlyError(error));
  }
}

/** Indique si une synchronisation automatique est due. */
export async function xSyncDue(): Promise<{
  enabled: boolean;
  connected: boolean;
  due: boolean;
  intervalMinutes: number;
  lastSyncAt: string | null;
  monthlyCalls: number;
  monthlyLimit: number;
  estimatedCost: number;
  lastError: string | null;
  username: string | null;
  capReached: boolean;
}> {
  const settings = await getSettings();
  const connections = await resetXUsageIfNeeded();
  const last = connections.x.last_sync_at;
  const interval = settings.x_sync_interval_minutes;
  const elapsed = last ? Date.now() - Date.parse(last) : Number.POSITIVE_INFINITY;
  const connected = xConnected(connections);
  const capReached =
    settings.x_monthly_call_limit > 0 &&
    connections.x.usage_calls >= settings.x_monthly_call_limit;

  return {
    enabled: settings.x_sync_enabled,
    connected,
    due:
      settings.x_sync_enabled &&
      connected &&
      !capReached &&
      (Number.isNaN(elapsed) || elapsed >= interval * 60_000),
    intervalMinutes: interval,
    lastSyncAt: last,
    monthlyCalls: connections.x.usage_calls,
    monthlyLimit: settings.x_monthly_call_limit,
    estimatedCost: connections.x.usage_cost,
    lastError: connections.x.last_error,
    username: connections.x.username,
    capReached,
  };
}
