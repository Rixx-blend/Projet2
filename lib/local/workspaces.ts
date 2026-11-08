import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { dataDir } from "@/lib/local/db";

export type Workboard = {
  id: string;
  title: string;
  category: string;
  created_at: string;
  updated_at: string;
  snapshot: unknown | null;
  live_board_id?: string | null;
};

type WorkboardIndexItem = Omit<Workboard, "snapshot">;
const indexFile = () => path.join(dataDir(), "workboards.json");
const boardFile = (id: string) => path.join(dataDir(), "workboards", `${id}.json`);
let queue: Promise<unknown> = Promise.resolve();

function serial<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task);
  queue = next.catch(() => undefined);
  return next;
}

async function readIndex(): Promise<WorkboardIndexItem[]> {
  try {
    const value = JSON.parse(await fs.readFile(indexFile(), "utf8")) as unknown;
    return Array.isArray(value) ? value as WorkboardIndexItem[] : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return [];
  }
}

async function writeIndex(items: WorkboardIndexItem[]) {
  await fs.mkdir(dataDir(), { recursive: true });
  const temp = `${indexFile()}.${process.pid}.tmp`;
  await fs.writeFile(temp, JSON.stringify(items, null, 2), "utf8");
  await fs.rename(temp, indexFile());
}

export async function listWorkboards() {
  return serial(async () => (await readIndex()).sort((a, b) => b.updated_at.localeCompare(a.updated_at)));
}

export async function getWorkboard(id: string): Promise<Workboard | null> {
  return serial(async () => {
    const index = await readIndex();
    const meta = index.find((item) => item.id === id);
    if (!meta) return null;
    try {
      const stored = JSON.parse(await fs.readFile(boardFile(id), "utf8")) as { snapshot?: unknown };
      return { ...meta, snapshot: stored.snapshot ?? null };
    } catch {
      return { ...meta, snapshot: null };
    }
  });
}

export async function createWorkboard(title: string, category = "Miniature") {
  return serial(async () => {
    const now = new Date().toISOString();
    const item: WorkboardIndexItem = {
      id: randomUUID(),
      title: title.trim().slice(0, 90) || "Nouvelle planche",
      category: category.trim().slice(0, 40) || "Miniature",
      created_at: now,
      updated_at: now,
    };
    const index = await readIndex();
    index.unshift(item);
    await writeIndex(index);
    await fs.mkdir(path.dirname(boardFile(item.id)), { recursive: true });
    await fs.writeFile(boardFile(item.id), JSON.stringify({ snapshot: null }), "utf8");
    return item;
  });
}

export async function updateWorkboard(id: string, patch: { title?: string; category?: string; snapshot?: unknown; live_board_id?: string | null }) {
  return serial(async () => {
    const index = await readIndex();
    const item = index.find((entry) => entry.id === id);
    if (!item) return null;
    if (typeof patch.title === "string") item.title = patch.title.trim().slice(0, 90) || item.title;
    if (typeof patch.category === "string") item.category = patch.category.trim().slice(0, 40) || item.category;
    if ("live_board_id" in patch) item.live_board_id = patch.live_board_id ?? null;
    item.updated_at = new Date().toISOString();
    if ("snapshot" in patch) {
      await fs.mkdir(path.dirname(boardFile(id)), { recursive: true });
      const temp = `${boardFile(id)}.${process.pid}.tmp`;
      await fs.writeFile(temp, JSON.stringify({ snapshot: patch.snapshot }), "utf8");
      await fs.rename(temp, boardFile(id));
    }
    await writeIndex(index);
    return item;
  });
}

export async function importLiveWorkboard(liveBoardId: string) {
  return serial(async () => {
    if (!/^[0-9a-f-]{36}$/i.test(liveBoardId)) throw new Error("Identifiant de planche invalide.");
    const index = await readIndex();
    const existing = index.find((item) => item.live_board_id === liveBoardId);
    if (existing) return existing;
    const now = new Date().toISOString();
    const item: WorkboardIndexItem = {
      id: randomUUID(),
      title: "Planche partagée",
      category: "Autre",
      created_at: now,
      updated_at: now,
      live_board_id: liveBoardId,
    };
    index.unshift(item);
    await writeIndex(index);
    await fs.mkdir(path.dirname(boardFile(item.id)), { recursive: true });
    await fs.writeFile(boardFile(item.id), JSON.stringify({ snapshot: null }), "utf8");
    return item;
  });
}

export async function deleteWorkboard(id: string) {
  return serial(async () => {
    const index = await readIndex();
    const next = index.filter((item) => item.id !== id);
    if (next.length === index.length) return false;
    await writeIndex(next);
    await fs.rm(boardFile(id), { force: true });
    return true;
  });
}
