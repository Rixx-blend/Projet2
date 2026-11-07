import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { normalizeStatus } from "@/lib/constants";
import type {
  Checklist,
  ChecklistItem,
  ChecklistWithItems,
  Client,
  InboxItem,
  InboxSource,
  InboxStatus,
  Order,
  OrderBoard,
  OrderFile,
  OrderStatus,
  OrderWithClient,
  Settings,
} from "@/types/database";

/**
 * Base de données locale d'OrderBoard.
 *
 * Tout est stocké dans un dossier de données (par défaut
 * `%APPDATA%\OrderBoard\data` sous Windows) :
 *
 *   orderboard.json      commandes, clients, checklists, métadonnées fichiers
 *   boards/<orderId>.json  snapshot tldraw d'une commande
 *   files/<orderId>/…      fichiers importés (images, PSD, PDF, ZIP…)
 *
 * Aucun serveur, aucun compte : un simple dossier qu'on peut sauvegarder
 * ou copier pour emporter ses données.
 */

export type Database = {
  schema: number;
  clients: Client[];
  orders: Order[];
  files: OrderFile[];
  checklists: Checklist[];
  checklistItems: ChecklistItem[];
  inbox: InboxItem[];
  settings: Settings;
};

/** Réglages par défaut, appliqués aux fichiers créés avant leur ajout. */
export function defaultSettings(): Settings {
  return {
    monthly_goal: 0,
    messenger_links: { discord: "", twitter: "", instagram: "", email: "" },
    reminder_days: [3, 1, 0],
    reminder_overdue: true,
    reminder_quote_days: 3,
    notification_email: "",
    email_api_key: "",
    email_from: "onboarding@resend.dev",
    read_notifications: {},
    x_sync_enabled: true,
    x_sync_interval_minutes: 20,
    x_monthly_call_limit: 300,
    x_call_cost_estimate: 0.01,
  };
}

const SCHEMA_VERSION = 1;

/** Dossier racine des données (surchargeable pour les tests). */
export function dataDir(): string {
  const custom = process.env.ORDERBOARD_DATA_DIR?.trim();
  if (custom) return path.resolve(custom);

  const appData =
    process.platform === "win32"
      ? process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming")
      : process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share");

  return path.join(appData, "OrderBoard", "data");
}

export const dbFile = () => path.join(dataDir(), "orderboard.json");
export const boardsDir = () => path.join(dataDir(), "boards");
export const filesDir = () => path.join(dataDir(), "files");
export const boardFile = (orderId: string) =>
  path.join(boardsDir(), `${orderId}.json`);

function emptyDatabase(): Database {
  return {
    schema: SCHEMA_VERSION,
    clients: [],
    orders: [],
    files: [],
    checklists: [],
    checklistItems: [],
    inbox: [],
    settings: defaultSettings(),
  };
}

/** Sérialise les écritures : jamais deux enregistrements simultanés. */
let writeQueue: Promise<unknown> = Promise.resolve();

function serialize<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.catch(() => undefined);
  return run;
}

let tmpCounter = 0;

async function writeJsonAtomic(file: string, value: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  tmpCounter += 1;
  const tmp = `${file}.${process.pid}.${tmpCounter}.tmp`;
  const payload = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(tmp, payload, "utf8");

  // Sous Windows, un antivirus ou un indexeur peut verrouiller brièvement le
  // fichier : on retente le renommage avant de se rabattre sur une écriture directe.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await fs.rename(tmp, file);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EPERM" && code !== "EBUSY" && code !== "EACCES") {
        await fs.rm(tmp, { force: true });
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 60 * (attempt + 1)));
    }
  }

  await fs.writeFile(file, payload, "utf8");
  await fs.rm(tmp, { force: true });
}

async function readDatabaseFile(): Promise<Database> {
  try {
    const raw = await fs.readFile(dbFile(), "utf8");
    const parsed = JSON.parse(raw) as Partial<Database>;
    const base = emptyDatabase();
    return {
      schema: typeof parsed.schema === "number" ? parsed.schema : SCHEMA_VERSION,
      clients: Array.isArray(parsed.clients) ? parsed.clients : base.clients,
      orders: Array.isArray(parsed.orders)
        ? parsed.orders.map((order) => ({
            ...order,
            status: normalizeStatus(order.status as string),
          }))
        : base.orders,
      files: Array.isArray(parsed.files) ? parsed.files : base.files,
      checklists: Array.isArray(parsed.checklists) ? parsed.checklists : base.checklists,
      checklistItems: Array.isArray(parsed.checklistItems)
        ? parsed.checklistItems
        : base.checklistItems,
      inbox: Array.isArray(parsed.inbox) ? parsed.inbox : base.inbox,
      settings: {
        ...base.settings,
        ...(parsed.settings ?? {}),
        messenger_links: {
          ...base.settings.messenger_links,
          ...(parsed.settings?.messenger_links ?? {}),
        },
        reminder_days: Array.isArray(parsed.settings?.reminder_days)
          ? parsed.settings.reminder_days
          : base.settings.reminder_days,
        read_notifications:
          parsed.settings?.read_notifications &&
          typeof parsed.settings.read_notifications === "object"
            ? parsed.settings.read_notifications
            : {},
      },
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      // Fichier illisible (JSON corrompu) : on garde une copie avant de repartir.
      const broken = `${dbFile()}.corrompu-${Date.now()}`;
      await fs.rename(dbFile(), broken).catch(() => undefined);
      console.error(
        `[orderboard] Base illisible, copie conservée dans ${broken}`,
        error,
      );
    }
    const fresh = emptyDatabase();
    await writeJsonAtomic(dbFile(), fresh);
    return fresh;
  }
}

/** Chargement (et création si besoin) : à appeler uniquement dans la file. */
async function loadDatabase(): Promise<Database> {
  await fs.mkdir(dataDir(), { recursive: true });
  return readDatabaseFile();
}

/** Lecture : passe par la même file que les écritures pour éviter les courses. */
export async function readDb(): Promise<Database> {
  return serialize(loadDatabase);
}

/** Lecture + modification + écriture atomique, sérialisées. */
export async function mutateDb<T>(
  mutate: (db: Database) => T | Promise<T>,
): Promise<T> {
  return serialize(async () => {
    const db = await loadDatabase();
    const result = await mutate(db);
    await writeJsonAtomic(dbFile(), db);
    return result;
  });
}

const now = () => new Date().toISOString();

/* -------------------------------------------------------------------------- */
/* Réglages                                                                   */
/* -------------------------------------------------------------------------- */

export async function getSettings(): Promise<Settings> {
  const db = await readDb();
  return db.settings;
}

export async function updateSettings(
  patch: Partial<Settings>,
): Promise<Settings> {
  return mutateDb((db) => {
    db.settings = {
      ...db.settings,
      ...patch,
      messenger_links: {
        ...db.settings.messenger_links,
        ...(patch.messenger_links ?? {}),
      },
      read_notifications: {
        ...db.settings.read_notifications,
        ...(patch.read_notifications ?? {}),
      },
      reminder_days: patch.reminder_days ?? db.settings.reminder_days,
    };
    return db.settings;
  });
}

/* -------------------------------------------------------------------------- */
/* Clients                                                                    */
/* -------------------------------------------------------------------------- */

export async function listClients(): Promise<Client[]> {
  const db = await readDb();
  return [...db.clients].sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export async function createClient(input: {
  name: string;
  email?: string | null;
  discord?: string | null;
  other_contact?: string | null;
  youtube_url?: string | null;
  avatar_url?: string | null;
  subscribers?: number | null;
  videos_count?: number | null;
  notes?: string | null;
}): Promise<Client> {
  return mutateDb((db) => {
    const client: Client = {
      id: randomUUID(),
      name: input.name.trim(),
      email: input.email?.trim() || null,
      discord: input.discord?.trim() || null,
      other_contact: input.other_contact?.trim() || null,
      youtube_url: input.youtube_url?.trim() || null,
      avatar_url: input.avatar_url?.trim() || null,
      subscribers: Number.isFinite(input.subscribers) ? input.subscribers ?? null : null,
      videos_count: Number.isFinite(input.videos_count) ? input.videos_count ?? null : null,
      notes: input.notes?.trim() || null,
      created_at: now(),
    };
    db.clients.push(client);
    return client;
  });
}

export async function updateClient(
  id: string,
  patch: Partial<Omit<Client, "id" | "created_at">>,
): Promise<Client | null> {
  return mutateDb((db) => {
    const client = db.clients.find((entry) => entry.id === id);
    if (!client) return null;
    Object.assign(client, patch);
    return client;
  });
}

/* -------------------------------------------------------------------------- */
/* Commandes                                                                  */
/* -------------------------------------------------------------------------- */

function withClient(order: Order, db: Database): OrderWithClient {
  return {
    ...order,
    client: db.clients.find((client) => client.id === order.client_id) ?? null,
  };
}

export async function listOrdersWithClients(): Promise<OrderWithClient[]> {
  const db = await readDb();
  return [...db.orders]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((order) => withClient(order, db));
}

export async function getOrder(id: string): Promise<OrderWithClient | null> {
  const db = await readDb();
  const order = db.orders.find((entry) => entry.id === id);
  return order ? withClient(order, db) : null;
}

export type NewOrder = Omit<Order, "id" | "created_at" | "updated_at">;

export async function createOrder(input: NewOrder): Promise<Order> {
  const order = await mutateDb((db) => {
    const timestamp = now();
    const created: Order = {
      ...input,
      id: randomUUID(),
      created_at: timestamp,
      updated_at: timestamp,
    };
    db.orders.push(created);

    // Checklist de suivi prête à l'emploi, affichée dans le panneau du board.
    const checklist: Checklist = {
      id: randomUUID(),
      order_id: created.id,
      title: "Suivi",
      position: 0,
      created_at: timestamp,
    };
    db.checklists.push(checklist);

    [
      "Brief validé",
      "Première version envoyée",
      "Retours client intégrés",
      "Livraison finale",
    ].forEach((text, index) => {
      db.checklistItems.push({
        id: randomUUID(),
        checklist_id: checklist.id,
        text,
        done: false,
        position: index,
        created_at: timestamp,
      });
    });

    return created;
  });

  await saveBoard(order.id, null);
  return order;
}

export async function updateOrder(
  id: string,
  patch: Partial<Omit<Order, "id" | "created_at">>,
): Promise<Order | null> {
  return mutateDb((db) => {
    const order = db.orders.find((entry) => entry.id === id);
    if (!order) return null;
    Object.assign(order, patch, { updated_at: now() });
    return order;
  });
}

export async function setOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<boolean> {
  return mutateDb((db) => {
    const order = db.orders.find((entry) => entry.id === id);
    if (!order) return false;
    order.status = status;
    order.updated_at = now();
    return true;
  });
}

export async function deleteOrder(id: string): Promise<boolean> {
  const removed = await mutateDb((db) => {
    const index = db.orders.findIndex((entry) => entry.id === id);
    if (index === -1) return false;

    db.orders.splice(index, 1);
    db.files = db.files.filter((file) => file.order_id !== id);

    const checklistIds = db.checklists
      .filter((checklist) => checklist.order_id === id)
      .map((checklist) => checklist.id);
    db.checklists = db.checklists.filter((checklist) => checklist.order_id !== id);
    db.checklistItems = db.checklistItems.filter(
      (item) => !checklistIds.includes(item.checklist_id),
    );
    return true;
  });

  if (removed) {
    await fs.rm(boardFile(id), { force: true });
    await fs.rm(path.join(filesDir(), id), { recursive: true, force: true });
  }
  return removed;
}

/* -------------------------------------------------------------------------- */
/* Board tldraw                                                               */
/* -------------------------------------------------------------------------- */

export async function getBoard(orderId: string): Promise<OrderBoard | null> {
  try {
    const raw = await fs.readFile(boardFile(orderId), "utf8");
    const parsed = JSON.parse(raw) as Partial<OrderBoard>;
    return {
      order_id: orderId,
      content: parsed.content ?? null,
      version: typeof parsed.version === "number" ? parsed.version : 0,
      updated_at: typeof parsed.updated_at === "string" ? parsed.updated_at : now(),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    console.error(`[orderboard] Board illisible pour ${orderId}`, error);
    return null;
  }
}

export async function saveBoard(
  orderId: string,
  content: unknown,
): Promise<{ version: number; savedAt: string }> {
  return serialize(async () => {
    const existing = await getBoard(orderId);
    const version = (existing?.version ?? 0) + 1;
    const savedAt = now();
    await writeJsonAtomic(boardFile(orderId), {
      order_id: orderId,
      content,
      version,
      updated_at: savedAt,
    } satisfies OrderBoard);
    return { version, savedAt };
  });
}

/* -------------------------------------------------------------------------- */
/* Fichiers                                                                   */
/* -------------------------------------------------------------------------- */

export async function listFiles(orderId: string): Promise<OrderFile[]> {
  const db = await readDb();
  return db.files
    .filter((file) => file.order_id === orderId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** Tous les fichiers importés, toutes commandes confondues (page Ressources). */
export async function listAllFiles(): Promise<OrderFile[]> {
  const db = await readDb();
  return [...db.files].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getFileByPath(
  storagePath: string,
): Promise<OrderFile | null> {
  const db = await readDb();
  return db.files.find((file) => file.storage_path === storagePath) ?? null;
}

export async function addFile(input: {
  order_id: string;
  name: string;
  type: string | null;
  size: number;
  storage_path: string;
}): Promise<OrderFile> {
  return mutateDb((db) => {
    const file: OrderFile = {
      id: randomUUID(),
      order_id: input.order_id,
      name: input.name,
      type: input.type,
      size: input.size,
      storage_path: input.storage_path,
      created_at: now(),
    };
    db.files.push(file);
    return file;
  });
}

export async function removeFile(fileId: string): Promise<OrderFile | null> {
  const removed = await mutateDb((db) => {
    const index = db.files.findIndex((file) => file.id === fileId);
    if (index === -1) return null;
    return db.files.splice(index, 1)[0] ?? null;
  });
  return removed;
}

/* -------------------------------------------------------------------------- */
/* Checklists                                                                 */
/* -------------------------------------------------------------------------- */

export async function listChecklists(
  orderId: string,
): Promise<ChecklistWithItems[]> {
  const db = await readDb();
  return db.checklists
    .filter((checklist) => checklist.order_id === orderId)
    .sort((a, b) => a.position - b.position)
    .map((checklist) => ({
      ...checklist,
      items: db.checklistItems
        .filter((item) => item.checklist_id === checklist.id)
        .sort((a, b) => a.position - b.position),
    }));
}

export async function addChecklist(
  orderId: string,
  title: string,
): Promise<Checklist> {
  return mutateDb((db) => {
    const checklist: Checklist = {
      id: randomUUID(),
      order_id: orderId,
      title: title.trim().slice(0, 120) || "Checklist",
      position: db.checklists.filter((entry) => entry.order_id === orderId).length,
      created_at: now(),
    };
    db.checklists.push(checklist);
    return checklist;
  });
}

export async function deleteChecklist(checklistId: string): Promise<boolean> {
  return mutateDb((db) => {
    const index = db.checklists.findIndex((entry) => entry.id === checklistId);
    if (index === -1) return false;
    db.checklists.splice(index, 1);
    db.checklistItems = db.checklistItems.filter(
      (item) => item.checklist_id !== checklistId,
    );
    return true;
  });
}

export async function addChecklistItem(
  checklistId: string,
  text: string,
): Promise<ChecklistItem | null> {
  return mutateDb((db) => {
    const checklist = db.checklists.find((entry) => entry.id === checklistId);
    if (!checklist) return null;

    const item: ChecklistItem = {
      id: randomUUID(),
      checklist_id: checklistId,
      text: text.trim().slice(0, 300),
      done: false,
      position: db.checklistItems.filter((entry) => entry.checklist_id === checklistId)
        .length,
      created_at: now(),
    };
    db.checklistItems.push(item);
    return item;
  });
}

export async function setChecklistItemDone(
  itemId: string,
  done: boolean,
): Promise<boolean> {
  return mutateDb((db) => {
    const item = db.checklistItems.find((entry) => entry.id === itemId);
    if (!item) return false;
    item.done = done;
    return true;
  });
}

export async function deleteChecklistItem(itemId: string): Promise<boolean> {
  return mutateDb((db) => {
    const index = db.checklistItems.findIndex((entry) => entry.id === itemId);
    if (index === -1) return false;
    db.checklistItems.splice(index, 1);
    return true;
  });
}

/* -------------------------------------------------------------------------- */
/* Boîte de réception                                                         */
/* -------------------------------------------------------------------------- */

export async function listInbox(): Promise<InboxItem[]> {
  const db = await readDb();
  return [...db.inbox].sort((a, b) => b.received_at.localeCompare(a.received_at));
}

export async function getInboxItem(id: string): Promise<InboxItem | null> {
  const db = await readDb();
  return db.inbox.find((item) => item.id === id) ?? null;
}

export async function countNewInbox(): Promise<number> {
  const items = await listInbox();
  return items.filter((item) => item.status === "nouvelle").length;
}

export type NewInboxItem = {
  source: InboxSource;
  external_id: string;
  author_name: string;
  author_id?: string | null;
  author_avatar?: string | null;
  message: string;
  conversation_url?: string | null;
  received_at?: string;
  status?: InboxStatus;
};

/**
 * Ajoute une demande. `source` + `external_id` forment une clé unique :
 * réenvoyer le même message Discord/X ne crée pas de doublon.
 */
export async function addInboxItem(
  input: NewInboxItem,
): Promise<{ item: InboxItem; created: boolean }> {
  return mutateDb((db) => {
    const existing = db.inbox.find(
      (entry) =>
        entry.source === input.source && entry.external_id === input.external_id,
    );
    if (existing) return { item: existing, created: false };

    const timestamp = now();
    const item: InboxItem = {
      id: randomUUID(),
      source: input.source,
      external_id: input.external_id,
      author_name: input.author_name.trim().slice(0, 120) || "Inconnu",
      author_id: input.author_id?.trim() || null,
      author_avatar: input.author_avatar?.trim() || null,
      message: input.message.trim().slice(0, 8000),
      conversation_url: input.conversation_url?.trim() || null,
      received_at: input.received_at ?? timestamp,
      status: input.status ?? "nouvelle",
      order_id: null,
      created_at: timestamp,
    };
    db.inbox.push(item);
    return { item, created: true };
  });
}

export async function setInboxStatus(
  id: string,
  status: InboxStatus,
): Promise<InboxItem | null> {
  return mutateDb((db) => {
    const item = db.inbox.find((entry) => entry.id === id);
    if (!item) return null;
    item.status = status;
    return item;
  });
}

export async function linkInboxToOrder(
  id: string,
  orderId: string,
): Promise<boolean> {
  return mutateDb((db) => {
    const item = db.inbox.find((entry) => entry.id === id);
    if (!item) return false;
    item.order_id = orderId;
    item.status = "traitee";
    return true;
  });
}

/** Efface le brief en attente une fois déposé sur le board. */
export async function clearBoardNote(orderId: string): Promise<void> {
  await mutateDb((db) => {
    const order = db.orders.find((entry) => entry.id === orderId);
    if (order) order.board_note = null;
  });
}
