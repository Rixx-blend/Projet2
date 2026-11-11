import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

import { dataDir } from "@/lib/local/db";
import { LIVE_BOARD_BASE } from "@/lib/live-board";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SnapshotFile = { path: string; data: string };
type Snapshot = { format: 1; files: SnapshotFile[] };
type SyncState = { accountSub: string; revision: number; hash: string };

const STATE_FILE = ".cloud-sync-state.json";
const MAX_RAW_BYTES = 25 * 1024 * 1024;
// Seules les données sont synchronisées : commandes, clients, planches, réglages.
// Les fichiers importés (dossier files/) restent sur chaque ordinateur.
const SYNCED_FILES = ["orderboard.json", "workboards.json"];
const SYNCED_DIRS = ["boards", "workboards"];
// Profil Google (noms, couleurs) : stocké hors du dossier de données, par l'application de bureau.
const PROFILE_ENTRY = "profile-preferences.json";
const PROFILE_FILE = process.env.ORDERBOARD_PROFILE_FILE?.trim() || "";

function isSyncedPath(relative: string): boolean {
  return SYNCED_FILES.includes(relative) || SYNCED_DIRS.some((dir) => relative.startsWith(dir + "/"));
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

async function authenticatedSub(token: string): Promise<string | null> {
  const response = await fetch(`${LIVE_BOARD_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  }).catch(() => null);
  if (!response?.ok) return null;
  const user = await response.json().catch(() => null) as { sub?: string } | null;
  return typeof user?.sub === "string" && user.sub.length > 0 ? user.sub : null;
}

async function walkFiles(root: string, current = root): Promise<SnapshotFile[]> {
  const entries = await fs.readdir(current, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const output: SnapshotFile[] = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink() || entry.name === STATE_FILE || entry.name.endsWith(".tmp")) continue;
    const absolute = path.join(current, entry.name);
    const relative = path.relative(root, absolute).split(path.sep).join("/");
    if (entry.isDirectory()) {
      if (!SYNCED_DIRS.some((dir) => relative === dir || relative.startsWith(dir + "/"))) continue;
      output.push(...await walkFiles(root, absolute));
      continue;
    }
    if (!entry.isFile() || !isSyncedPath(relative)) continue;
    let buffer = await fs.readFile(absolute);
    // Les clés API d'e-mail restent propres à chaque appareil : elles ne sont
    // jamais envoyées au stockage cloud.
    if (relative === "orderboard.json") {
      try {
        const parsed = JSON.parse(buffer.toString("utf8"));
        if (parsed.settings && typeof parsed.settings === "object") parsed.settings.email_api_key = "";
        buffer = Buffer.from(JSON.stringify(parsed, null, 2) + "\n", "utf8");
      } catch {
        throw new Error("La base locale orderboard.json est illisible. Aucune synchronisation effectuée.");
      }
    }
    output.push({ path: relative, data: buffer.toString("base64") });
  }
  return output;
}

async function makeSnapshot(): Promise<{ snapshot: Snapshot; hash: string; rawBytes: number }> {
  const files = await walkFiles(dataDir());
  if (PROFILE_FILE) {
    const profile = await fs.readFile(PROFILE_FILE).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (profile) files.push({ path: PROFILE_ENTRY, data: profile.toString("base64") });
  }
  let rawBytes = 0;
  for (const file of files) {
    rawBytes += Buffer.from(file.data, "base64").byteLength;
    if (rawBytes > MAX_RAW_BYTES) {
      throw new Error("Les fichiers de ce compte dépassent 25 Mo. La synchronisation cloud est interrompue pour éviter un transfert incomplet.");
    }
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  const snapshot: Snapshot = { format: 1, files };
  const hash = createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
  return { snapshot, hash, rawBytes };
}

function hasMeaningfulData(snapshot: Snapshot): boolean {
  for (const file of snapshot.files) {
    if (file.path === PROFILE_ENTRY) continue;
    if (file.path === "orderboard.json") {
      try {
        const db = JSON.parse(Buffer.from(file.data, "base64").toString("utf8"));
        if (["clients", "orders", "files", "checklists", "checklistItems", "inbox"].some((key) => Array.isArray(db[key]) && db[key].length > 0)) return true;
        const settings = db.settings ?? {};
        if (Number(settings.monthly_goal) > 0 || Object.values(settings.messenger_links ?? {}).some(Boolean) ||
          (settings.reminder_days ?? []).join(",") !== "3,1,0" || settings.reminder_overdue === false ||
          Number(settings.reminder_quote_days) !== 3 || Boolean(settings.notification_email) ||
          Boolean(settings.read_notifications && Object.keys(settings.read_notifications).length) ||
          settings.x_sync_enabled === false || Number(settings.x_sync_interval_minutes) !== 20) return true;
      } catch {
        return true;
      }
      continue;
    }
    if (file.path === "workboards.json") {
      try {
        if (JSON.parse(Buffer.from(file.data, "base64").toString("utf8")).length > 0) return true;
      } catch {
        return true;
      }
      continue;
    }
    if (Buffer.from(file.data, "base64").byteLength > 0) return true;
  }
  return false;
}

async function readState(): Promise<SyncState | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(dataDir(), STATE_FILE), "utf8")) as SyncState;
  } catch {
    return null;
  }
}

async function writeState(state: SyncState) {
  await fs.mkdir(dataDir(), { recursive: true });
  const target = path.join(dataDir(), STATE_FILE);
  const temporary = `${target}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(state), "utf8");
  await fs.rename(temporary, target);
}

function safeRelativePath(value: string): boolean {
  if (!value || value.length > 500 || path.isAbsolute(value) || value.includes("\\") || value.split("/").some((part) => !part || part === "." || part === "..")) return false;
  return /^[\p{L}\p{N}._@ -]+(?:\/[\p{L}\p{N}._@ -]+)*$/u.test(value);
}

async function restoreSnapshot(snapshot: Snapshot) {
  if (!snapshot || snapshot.format !== 1 || !Array.isArray(snapshot.files) || snapshot.files.length > 20_000) {
    throw new Error("Le contenu cloud est invalide.");
  }
  const root = dataDir();
  for (const file of snapshot.files) {
    if (file && typeof file.path === "string" && file.path !== PROFILE_ENTRY && !isSyncedPath(file.path)) {
      throw new Error("La sauvegarde cloud contient un fichier non synchronisé. Les données locales n'ont pas été touchées.");
    }
  }
  let validatedBytes = 0;
  const seen = new Set<string>();
  const paths = snapshot.files.map((file) => file?.path);
  for (const file of snapshot.files) {
    if (!file || typeof file.path !== "string" || !safeRelativePath(file.path) || typeof file.data !== "string" || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.data)) {
      throw new Error("Un fichier cloud contient un chemin ou un contenu invalide. Les données locales n'ont pas été touchées.");
    }
    if (seen.has(file.path)) throw new Error("La sauvegarde cloud contient des chemins en double.");
    seen.add(file.path);
    validatedBytes += Buffer.from(file.data, "base64").byteLength;
    if (validatedBytes > MAX_RAW_BYTES) throw new Error("La sauvegarde cloud dépasse la limite de 25 Mo.");
  }
  const sortedPaths = [...paths].filter((value): value is string => typeof value === "string").sort();
  for (let index = 1; index < sortedPaths.length; index += 1) {
    if (sortedPaths[index].startsWith(sortedPaths[index - 1] + "/")) {
      throw new Error("La sauvegarde cloud contient une structure de fichiers invalide.");
    }
  }
  const backup = `${root}.pre-cloud-sync-${Date.now()}`;
  for (const name of [...SYNCED_FILES, ...SYNCED_DIRS]) {
    await fs.cp(path.join(root, name), path.join(backup, name), { recursive: true, errorOnExist: false, force: false }).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
  const currentDbPath = path.join(root, "orderboard.json");
  let localEmailKey = "";
  try {
    const currentDb = JSON.parse(await fs.readFile(currentDbPath, "utf8"));
    localEmailKey = typeof currentDb.settings?.email_api_key === "string" ? currentDb.settings.email_api_key : "";
  } catch {
    // Première installation : aucune clé locale.
  }
  for (const name of SYNCED_FILES) await fs.rm(path.join(root, name), { force: true });
  for (const dir of SYNCED_DIRS) await fs.rm(path.join(root, dir), { recursive: true, force: true });
  await fs.mkdir(root, { recursive: true });
  for (const file of snapshot.files) {
    const bytes = Buffer.from(file.data, "base64");
    if (file.path === PROFILE_ENTRY) {
      if (PROFILE_FILE) {
        await fs.mkdir(path.dirname(PROFILE_FILE), { recursive: true });
        await fs.writeFile(PROFILE_FILE, bytes);
      }
      continue;
    }
    const destination = path.resolve(root, ...file.path.split("/"));
    if (!destination.startsWith(root + path.sep)) throw new Error("Chemin de restauration refusé.");
    await fs.mkdir(path.dirname(destination), { recursive: true });
    if (file.path === "orderboard.json" && localEmailKey) {
      const parsed = JSON.parse(bytes.toString("utf8"));
      parsed.settings = { ...(parsed.settings ?? {}), email_api_key: localEmailKey };
      await fs.writeFile(destination, JSON.stringify(parsed, null, 2) + "\n", "utf8");
    } else {
      await fs.writeFile(destination, bytes);
    }
  }
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token || token.length > 4000) return jsonError("Connexion Google requise.", 401);
  const accountSub = await authenticatedSub(token);
  if (!accountSub) return jsonError("La session Google a expiré. Reconnecte-toi.", 401);

  // Sauvegarde explicite demandée depuis les paramètres : les données de cet
  // ordinateur remplacent la sauvegarde du compte connecté.
  const replaceCloud = new URL(request.url).searchParams.get("mode") === "replace";

  try {
    const local = await makeSnapshot();
    const localMeaningful = hasMeaningfulData(local.snapshot);
    const state = await readState();
    const remoteResponse = await fetch(`${LIVE_BOARD_BASE}/account-data?metadata=1`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!remoteResponse.ok) return jsonError(remoteResponse.status === 401 ? "Session Google expirée." : "Impossible de lire l'état de la sauvegarde cloud.", remoteResponse.status);
    const remote = await remoteResponse.json() as { revision: number; updatedAt: string | null };

    if (replaceCloud) {
      if (!localMeaningful) return jsonError("Cet ordinateur ne contient aucune donnée à sauvegarder. La sauvegarde du compte n'a pas été modifiée.", 400);
      const pushed = await fetch(`${LIVE_BOARD_BASE}/account-data`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision: remote.revision, payload: local.snapshot }),
      });
      if (pushed.status === 409) return NextResponse.json({ ok: false, status: "conflict", error: "La sauvegarde a changé sur une autre machine pendant l'opération. Relance la sauvegarde." }, { status: 409 });
      if (!pushed.ok) return jsonError("Impossible d'envoyer les données vers le cloud.", pushed.status);
      const result = await pushed.json() as { revision: number };
      await writeState({ accountSub, revision: result.revision, hash: local.hash });
      return NextResponse.json({ ok: true, status: "uploaded", revision: result.revision });
    }
    const downloadRemoteSnapshot = async (): Promise<Snapshot> => {
      const response = await fetch(`${LIVE_BOARD_BASE}/account-data`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Impossible de télécharger la sauvegarde cloud.");
      const data = await response.json() as { payload: Snapshot | null };
      if (!data.payload) throw new Error("La sauvegarde cloud est vide.");
      return data.payload;
    };

    if (remote.revision === 0) {
      if (!localMeaningful) {
        await writeState({ accountSub, revision: 0, hash: local.hash });
        return NextResponse.json({ ok: true, status: "empty", revision: 0 });
      }
      const pushed = await fetch(`${LIVE_BOARD_BASE}/account-data`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision: 0, payload: local.snapshot }),
      });
      if (pushed.status === 409) return NextResponse.json({ ok: false, status: "conflict", error: "Une autre machine vient de synchroniser des données. Aucune donnée locale n'a été écrasée." }, { status: 409 });
      if (!pushed.ok) return jsonError("Impossible d'envoyer les données vers le cloud.", pushed.status);
      const result = await pushed.json() as { revision: number };
      await writeState({ accountSub, revision: result.revision, hash: local.hash });
      return NextResponse.json({ ok: true, status: "uploaded", revision: result.revision });
    }

    const stateMatchesAccount = state?.accountSub === accountSub;
    if (!stateMatchesAccount) {
      if (localMeaningful) {
        return NextResponse.json({ ok: false, status: "conflict", error: "Des données locales et une sauvegarde cloud existent déjà. Rien n'a été remplacé pour protéger tes fichiers." }, { status: 409 });
      }
      const remoteSnapshot = await downloadRemoteSnapshot();
      await restoreSnapshot(remoteSnapshot);
      const restored = await makeSnapshot();
      await writeState({ accountSub, revision: remote.revision, hash: restored.hash });
      return NextResponse.json({ ok: true, status: "downloaded", revision: remote.revision });
    }

    if (local.hash === state.hash && remote.revision === state.revision) {
      return NextResponse.json({ ok: true, status: "up-to-date", revision: remote.revision });
    }
    if (local.hash === state.hash && remote.revision !== state.revision) {
      const remoteSnapshot = await downloadRemoteSnapshot();
      await restoreSnapshot(remoteSnapshot);
      const restored = await makeSnapshot();
      await writeState({ accountSub, revision: remote.revision, hash: restored.hash });
      return NextResponse.json({ ok: true, status: "downloaded", revision: remote.revision });
    }
    if (local.hash !== state.hash && remote.revision === state.revision) {
      const pushed = await fetch(`${LIVE_BOARD_BASE}/account-data`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision: remote.revision, payload: local.snapshot }),
      });
      if (pushed.status === 409) return NextResponse.json({ ok: false, status: "conflict", error: "Les données ont changé sur une autre machine au même moment. Aucune modification n'a été écrasée." }, { status: 409 });
      if (!pushed.ok) return jsonError("Impossible d'envoyer les modifications vers le cloud.", pushed.status);
      const result = await pushed.json() as { revision: number };
      await writeState({ accountSub, revision: result.revision, hash: local.hash });
      return NextResponse.json({ ok: true, status: "uploaded", revision: result.revision });
    }

    return NextResponse.json({ ok: false, status: "conflict", error: "Cette machine et le cloud contiennent chacun des modifications non synchronisées. Rien n'a été écrasé." }, { status: 409 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Erreur de synchronisation inconnue.", 500);
  }
}
