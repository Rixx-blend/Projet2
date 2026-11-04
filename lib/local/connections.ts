import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import {
  decryptString,
  encryptString,
  loadOrCreateKey,
} from "@/lib/crypto";
import { dataDir } from "@/lib/local/db";

/**
 * Connexions aux réseaux (Discord, X).
 *
 * Fichier séparé des données métier : `connections.json`, dans le dossier de
 * données. Les secrets (jetons OAuth, secret du bot) y sont chiffrés avec
 * `connections.key`. Rien de tout cela n'est envoyé au navigateur.
 */

export type DiscordConnection = {
  guild_id: string;
  application_id: string;
  /** URL publique utilisée par le bot (tunnel), affichée pour information. */
  public_url: string;
  secret_enc: string | null;
  last_seen_at: string | null;
  last_author: string | null;
  last_error: string | null;
};

export type XConnection = {
  client_id: string;
  client_secret_enc: string | null;
  access_token_enc: string | null;
  refresh_token_enc: string | null;
  expires_at: string | null;
  user_id: string | null;
  username: string | null;
  avatar_url: string | null;
  last_sync_at: string | null;
  last_event_at: string | null;
  last_error: string | null;
  usage_month: string;
  usage_calls: number;
  usage_cost: number;
};

export type Connections = {
  discord: DiscordConnection;
  x: XConnection;
};

const file = () => path.join(dataDir(), "connections.json");
export const connectionsKeyFile = () => path.join(dataDir(), "connections.key");

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function emptyConnections(): Connections {
  return {
    discord: {
      guild_id: "",
      application_id: "",
      public_url: "",
      secret_enc: null,
      last_seen_at: null,
      last_author: null,
      last_error: null,
    },
    x: {
      client_id: "",
      client_secret_enc: null,
      access_token_enc: null,
      refresh_token_enc: null,
      expires_at: null,
      user_id: null,
      username: null,
      avatar_url: null,
      last_sync_at: null,
      last_event_at: null,
      last_error: null,
      usage_month: currentMonth(),
      usage_calls: 0,
      usage_cost: 0,
    },
  };
}

let queue: Promise<unknown> = Promise.resolve();

function serialize<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

async function writeAtomic(value: unknown) {
  const target = file();
  await fs.mkdir(path.dirname(target), { recursive: true });
  const tmp = `${target}.${process.pid}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(tmp, target);
}

function normalize(parsed: Partial<Connections> | null): Connections {
  const base = emptyConnections();
  const x = { ...base.x, ...(parsed?.x ?? {}) };
  if (x.usage_month !== currentMonth()) {
    x.usage_month = currentMonth();
    x.usage_calls = 0;
    x.usage_cost = 0;
  }
  return {
    discord: { ...base.discord, ...(parsed?.discord ?? {}) },
    x,
  };
}

export async function readConnections(): Promise<Connections> {
  return serialize(async () => {
    try {
      const raw = await fs.readFile(file(), "utf8");
      return normalize(JSON.parse(raw) as Partial<Connections>);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("[orderboard] connections.json illisible", error);
      }
      return emptyConnections();
    }
  });
}

export async function updateConnections(
  mutate: (connections: Connections) => void | Promise<void>,
): Promise<Connections> {
  return serialize(async () => {
    let current = emptyConnections();
    try {
      const raw = await fs.readFile(file(), "utf8");
      current = normalize(JSON.parse(raw) as Partial<Connections>);
    } catch {
      // Fichier absent : on part des valeurs par défaut.
    }
    await mutate(current);
    await writeAtomic(current);
    return current;
  });
}

async function key() {
  return loadOrCreateKey(connectionsKeyFile());
}

/* -------------------------------------------------------------------------- */
/* Discord                                                                    */
/* -------------------------------------------------------------------------- */

/** Secret partagé avec le bot Discord (variable d'environnement prioritaire). */
export async function getBotSecret(): Promise<string> {
  const fromEnv = process.env.ORDERBOARD_INBOX_SECRET?.trim();
  if (fromEnv) return fromEnv;

  const connections = await readConnections();
  const stored = decryptString(connections.discord.secret_enc, await key());
  if (stored) return stored;

  const secret = randomBytes(32).toString("base64url");
  const encryptionKey = await key();
  await updateConnections((next) => {
    next.discord.secret_enc = encryptString(secret, encryptionKey);
  });
  return secret;
}

export function discordConfigured(connections: Connections) {
  return Boolean(
    (process.env.ORDERBOARD_INBOX_SECRET?.trim() || connections.discord.secret_enc) &&
      (connections.discord.application_id ||
        process.env.DISCORD_APPLICATION_ID?.trim()),
  );
}

/* -------------------------------------------------------------------------- */
/* X (Twitter)                                                                */
/* -------------------------------------------------------------------------- */

export async function getXClient(): Promise<{
  clientId: string;
  clientSecret: string | null;
}> {
  const connections = await readConnections();
  return {
    clientId:
      process.env.X_CLIENT_ID?.trim() || connections.x.client_id.trim(),
    clientSecret:
      process.env.X_CLIENT_SECRET?.trim() ||
      decryptString(connections.x.client_secret_enc, await key()),
  };
}

export async function getXTokens(): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
}> {
  const connections = await readConnections();
  const encryptionKey = await key();
  return {
    accessToken: decryptString(connections.x.access_token_enc, encryptionKey),
    refreshToken: decryptString(connections.x.refresh_token_enc, encryptionKey),
    expiresAt: connections.x.expires_at,
  };
}

export async function saveXTokens(tokens: {
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: string | null;
  userId?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
}) {
  const encryptionKey = await key();
  await updateConnections((next) => {
    if (tokens.accessToken !== undefined) {
      next.x.access_token_enc = tokens.accessToken
        ? encryptString(tokens.accessToken, encryptionKey)
        : null;
    }
    if (tokens.refreshToken !== undefined) {
      next.x.refresh_token_enc = tokens.refreshToken
        ? encryptString(tokens.refreshToken, encryptionKey)
        : null;
    }
    if (tokens.expiresAt !== undefined) next.x.expires_at = tokens.expiresAt;
    if (tokens.userId !== undefined) next.x.user_id = tokens.userId;
    if (tokens.username !== undefined) next.x.username = tokens.username;
    if (tokens.avatarUrl !== undefined) next.x.avatar_url = tokens.avatarUrl;
  });
}

export async function saveXClientSecret(secret: string | null) {
  const encryptionKey = await key();
  await updateConnections((next) => {
    next.x.client_secret_enc = secret
      ? encryptString(secret, encryptionKey)
      : null;
  });
}

export async function saveXClientId(clientId: string) {
  await updateConnections((next) => {
    next.x.client_id = clientId.trim();
  });
}

export function xConnected(connections: Connections) {
  return Boolean(connections.x.access_token_enc);
}

/** Remet le compteur d'appels à zéro au changement de mois. */
export async function resetXUsageIfNeeded(): Promise<Connections> {
  const connections = await readConnections();
  if (connections.x.usage_month === currentMonth()) return connections;
  return updateConnections((next) => {
    next.x.usage_month = currentMonth();
    next.x.usage_calls = 0;
    next.x.usage_cost = 0;
  });
}

/** Enregistre un appel API X (compteur + coût estimé). */
export async function recordXCall(costEstimate: number) {
  await updateConnections((next) => {
    if (next.x.usage_month !== currentMonth()) {
      next.x.usage_month = currentMonth();
      next.x.usage_calls = 0;
      next.x.usage_cost = 0;
    }
    next.x.usage_calls += 1;
    next.x.usage_cost = Math.round((next.x.usage_cost + costEstimate) * 1000) / 1000;
  });
}
