"use client";

/** URL locale d'un fichier stocké dans le dossier de données. */
export function fileUrl(storagePath: string) {
  const encoded = storagePath
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `/api/files/${encoded}`;
}

export type UploadedFile = {
  storagePath: string;
  name: string;
  type: string;
  size: number;
  url: string;
};

type FileApiResponse = {
  file?: { storage_path: string; name: string; type: string | null; size: number };
  error?: string;
};

/**
 * Envoie un fichier dans le dossier de données de la commande.
 * Le contenu part en corps brut (pas de multipart) pour supporter les gros PSD.
 */
export async function uploadOrderFile(
  file: File,
  orderId: string,
): Promise<{ file?: UploadedFile; error?: string }> {
  let response: Response;
  try {
    response = await fetch(`/api/orders/${orderId}/files`, {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "x-file-name": encodeURIComponent(file.name),
      },
      body: file,
    });
  } catch {
    return { error: "Envoi impossible : le logiciel ne répond pas." };
  }

  const payload = (await response.json().catch(() => null)) as FileApiResponse | null;

  if (!response.ok || !payload?.file) {
    return { error: payload?.error ?? "Impossible d'enregistrer le fichier." };
  }

  return {
    file: {
      storagePath: payload.file.storage_path,
      name: payload.file.name,
      type: payload.file.type ?? "application/octet-stream",
      size: payload.file.size,
      url: fileUrl(payload.file.storage_path),
    },
  };
}

/** Envoie plusieurs fichiers à la suite ; renvoie un message par fichier en échec (liste vide = tout est passé). */
export async function uploadOrderFiles(files: File[], orderId: string): Promise<string[]> {
  const failures: string[] = [];
  for (const file of files) {
    const result = await uploadOrderFile(file, orderId);
    if (result.error) failures.push(`« ${file.name} » : ${result.error}`);
  }
  return failures;
}

/** Supprime un fichier du disque et de la base. */
export async function deleteOrderFile(orderId: string, fileId: string) {
  const response = await fetch(
    `/api/orders/${orderId}/files?fileId=${encodeURIComponent(fileId)}`,
    { method: "DELETE" },
  );
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    return { ok: false, error: payload?.error ?? "Suppression impossible." };
  }
  return { ok: true };
}

export function isImageFile(file: { type: string | null; name?: string }) {
  if (file.type?.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(file.name ?? "");
}

export function isPdfFile(file: { type: string | null; name?: string }) {
  if (file.type === "application/pdf") return true;
  return /\.pdf$/i.test(file.name ?? "");
}
