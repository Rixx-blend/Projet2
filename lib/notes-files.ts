/**
 * Pièces jointes des notes, stockées dans IndexedDB (les fichiers sont trop lourds pour localStorage).
 * Tout reste dans le navigateur de l'appli : aucun envoi réseau.
 */

export type NoteAttachment = {
  id: string;
  noteId: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
  blob: Blob;
};

export type AttachmentKind = "image" | "video" | "audio" | "pdf" | "text" | "other";

const DB_NAME = "rixx-studio-notes";
const STORE = "attachments";
const TEXT_EXTENSIONS = /\.(txt|md|csv|tsv|json|xml|html|css|js|jsx|ts|tsx|svg|log|yml|yaml|ini)$/i;

export function attachmentKind(type: string, name: string): AttachmentKind {
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  if (type === "application/pdf") return "pdf";
  if (type.startsWith("text/") || TEXT_EXTENSIONS.test(name)) return "text";
  return "other";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: "id" });
      store.createIndex("noteId", "noteId");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = action(transaction.objectStore(STORE));
    transaction.oncomplete = () => {
      db.close();
      resolve(request.result);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

function uid() {
  return `${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export async function listAttachments(noteId: string): Promise<NoteAttachment[]> {
  const records = await run<NoteAttachment[]>("readonly", (store) =>
    store.index("noteId").getAll(noteId),
  );
  return records.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function saveAttachment(noteId: string, file: File): Promise<NoteAttachment> {
  const record: NoteAttachment = {
    id: uid(),
    noteId,
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    createdAt: new Date().toISOString(),
    blob: file,
  };
  await run("readwrite", (store) => store.put(record));
  return record;
}

export async function deleteAttachment(id: string) {
  await run("readwrite", (store) => store.delete(id));
}

export async function deleteNoteAttachments(noteId: string) {
  const records = await listAttachments(noteId);
  await Promise.all(records.map((record) => deleteAttachment(record.id)));
}
