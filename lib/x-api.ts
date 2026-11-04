/**
 * Client minimal de l'API X (Twitter) v2.
 *
 * Uniquement les API officielles :
 *  - OAuth 2.0 Authorization Code avec PKCE
 *  - GET /2/dm_events pour les messages privés du compte connecté
 *  - GET /2/users/me pour l'identité
 *
 * Aucun scraping, aucune connexion avec un mot de passe ou un jeton personnel.
 */

export const X_SCOPES = [
  "dm.read",
  "tweet.read",
  "users.read",
  "offline.access",
] as const;

export const X_AUTHORIZE_URL = "https://twitter.com/i/oauth2/authorize";

export function xApiBase() {
  return (process.env.X_API_BASE?.trim() || "https://api.x.com").replace(/\/$/, "");
}

export function xTokenUrl() {
  return `${xApiBase()}/2/oauth2/token`;
}

export type XTokenResponse = {
  token_type?: string;
  expires_in?: number;
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

export function buildAuthorizeUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    scope: X_SCOPES.join(" "),
    state: input.state,
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
  });
  return `${X_AUTHORIZE_URL}?${params.toString()}`;
}

function basicAuth(clientId: string, clientSecret: string) {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

async function postToken(
  body: Record<string, string>,
  client: { clientId: string; clientSecret: string | null },
): Promise<XTokenResponse> {
  const headers: Record<string, string> = {
    "content-type": "application/x-www-form-urlencoded",
  };
  const payload = { ...body, client_id: client.clientId };
  if (client.clientSecret) {
    headers.authorization = basicAuth(client.clientId, client.clientSecret);
  }

  const response = await fetch(xTokenUrl(), {
    method: "POST",
    headers,
    body: new URLSearchParams(payload).toString(),
    cache: "no-store",
  });

  const data = (await response.json().catch(() => ({}))) as XTokenResponse;
  if (!response.ok) {
    throw new XApiError(
      data.error_description || data.error || `Jeton refusé (HTTP ${response.status})`,
      response.status,
    );
  }
  return data;
}

export class XApiError extends Error {
  status: number;
  code: string | null;

  constructor(message: string, status: number, code: string | null = null) {
    super(message);
    this.name = "XApiError";
    this.status = status;
    this.code = code;
  }
}

export async function exchangeAuthorizationCode(input: {
  client: { clientId: string; clientSecret: string | null };
  code: string;
  redirectUri: string;
  codeVerifier: string;
}) {
  return postToken(
    {
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: input.redirectUri,
      code_verifier: input.codeVerifier,
    },
    input.client,
  );
}

export async function refreshAccessToken(input: {
  client: { clientId: string; clientSecret: string | null };
  refreshToken: string;
}) {
  return postToken(
    {
      grant_type: "refresh_token",
      refresh_token: input.refreshToken,
    },
    input.client,
  );
}

async function xGet<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${xApiBase()}${path}`, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  const data = (await response.json().catch(() => ({}))) as {
    title?: string;
    detail?: string;
    errors?: { message?: string }[];
  };

  if (!response.ok) {
    const detail =
      data.detail ||
      data.title ||
      data.errors?.[0]?.message ||
      `API X indisponible (HTTP ${response.status})`;
    throw new XApiError(detail, response.status);
  }

  return data as T;
}

export type XUser = {
  id: string;
  username: string;
  name?: string;
  profile_image_url?: string;
};

export async function fetchMe(accessToken: string) {
  const data = await xGet<{ data?: XUser }>(
    "/2/users/me?user.fields=username,name,profile_image_url",
    accessToken,
  );
  if (!data.data) throw new XApiError("Profil X illisible", 502);
  return data.data;
}

export type XDmEvent = {
  id: string;
  event_type?: string;
  text?: string;
  created_at?: string;
  sender_id?: string;
  conversation_id?: string;
  dm_conversation_id?: string;
};

export type XDmResponse = {
  data?: XDmEvent[];
  includes?: { users?: XUser[] };
  meta?: {
    newest_id?: string;
    oldest_id?: string;
    result_count?: number;
    next_token?: string;
  };
};

/**
 * Récupère les événements de messages privés.
 * `startTime` limite aux messages plus récents que la dernière synchronisation
 * (l'API facture à l'appel : on évite de tout redemander).
 */
export async function fetchDmEvents(input: {
  accessToken: string;
  startTime?: string | null;
  paginationToken?: string | null;
  maxResults?: number;
}) {
  const params = new URLSearchParams({
    max_results: String(input.maxResults ?? 100),
    "dm_event.fields": "created_at,sender_id,text,conversation_id",
    expansions: "sender_id",
    "user.fields": "username,name,profile_image_url",
  });
  if (input.startTime) params.set("start_time", input.startTime);
  if (input.paginationToken) params.set("pagination_token", input.paginationToken);

  return xGet<XDmResponse>(`/2/dm_events?${params.toString()}`, input.accessToken);
}

/** URL de la conversation, telle qu'affichée dans l'application X. */
export function conversationUrl(event: XDmEvent) {
  const id = event.dm_conversation_id || event.conversation_id;
  return id ? `https://x.com/messages/${id}` : "https://x.com/messages";
}

/** Coût d'appel estimé (l'API X est facturée à l'usage, prix non public stable). */
export function defaultXCallCost() {
  const fromEnv = Number(process.env.X_CALL_COST_EUR);
  return Number.isFinite(fromEnv) && fromEnv >= 0 ? fromEnv : 0.01;
}
