import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Chiffrement local des secrets (jetons OAuth, secret du bot).
 *
 * AES-256-GCM avec une clé aléatoire de 32 octets stockée dans le dossier de
 * données (`connections.key`, permissions 600). Les jetons ne sont jamais
 * écrits en clair, ni renvoyés au navigateur.
 */

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";

export async function loadOrCreateKey(keyFile: string): Promise<Buffer> {
  try {
    const raw = await fs.readFile(keyFile);
    if (raw.length === 32) return raw;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  const key = randomBytes(32);
  await fs.mkdir(path.dirname(keyFile), { recursive: true });
  await fs.writeFile(keyFile, key, { mode: 0o600 });
  return key;
}

export function encryptString(value: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decryptString(payload: string | null, key: Buffer): string | null {
  if (!payload) return null;
  const [version, ivRaw, tagRaw, dataRaw] = payload.split(":");
  if (version !== VERSION || !ivRaw || !tagRaw || !dataRaw) return null;

  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(ivRaw, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tagRaw, "base64"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataRaw, "base64")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    // Clé changée ou données altérées : on traite le secret comme absent.
    return null;
  }
}

/** Comparaison à temps constant, pour les secrets partagés. */
export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Code verifier PKCE (43 à 128 caractères, base64url). */
export function createPkceVerifier() {
  return randomBytes(48).toString("base64url");
}

export async function createPkceChallenge(verifier: string) {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(verifier).digest("base64url");
}
