"use server";

import { revalidatePath } from "next/cache";

import { createClient, updateClient, deleteClient } from "@/lib/local/db";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

function parseClient(formData: FormData) {
  const name = value(formData, "name");
  const rawSubscribers = value(formData, "subscribers");
  const subscribers = rawSubscribers ? Number(rawSubscribers) : null;
  const rawVideos = value(formData, "videos_count");
  const videosCount = rawVideos ? Number(rawVideos) : null;

  if (name.length < 2 || name.length > 120) {
    return { error: "Le nom doit contenir entre 2 et 120 caractères." } as const;
  }
  if (rawVideos && (!Number.isSafeInteger(videosCount) || (videosCount ?? -1) < 0)) {
    return { error: "Le nombre de vidéos doit être un entier positif." } as const;
  }
  if (rawSubscribers && (!Number.isSafeInteger(subscribers) || (subscribers ?? -1) < 0)) {
    return { error: "Le nombre d'abonnés doit être un entier positif." } as const;
  }

  const url = value(formData, "youtube_url");
  const avatar = value(formData, "avatar_url");
  for (const candidate of [url, avatar]) {
    if (!candidate) continue;
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error();
    } catch {
      return { error: "Les liens YouTube et photo doivent être des URL valides." } as const;
    }
  }

  return {
    data: {
      name,
      email: value(formData, "email") || null,
      discord: value(formData, "discord") || null,
      other_contact: value(formData, "other_contact") || null,
      youtube_url: url || null,
      avatar_url: avatar || null,
      subscribers,
      videos_count: videosCount,
      notes: value(formData, "notes") || null,
    },
  } as const;
}

export async function saveClientAction(
  _previous: { ok: boolean; error?: string },
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = parseClient(formData);
  if (parsed.error) return { ok: false, error: parsed.error };

  try {
    const id = value(formData, "id");
    if (id) {
      const updated = await updateClient(id, parsed.data);
      if (!updated) return { ok: false, error: "Client introuvable." };
    } else {
      await createClient(parsed.data);
    }
    revalidatePath("/clients");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Enregistrement impossible.",
    };
  }
}

export async function deleteClientAction(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!id || id.length > 128) return { ok: false, error: "Identifiant client invalide." };
  try {
    const removed = await deleteClient(id);
    if (!removed) return { ok: false, error: "Client introuvable." };
    revalidatePath("/clients");
    revalidatePath("/dashboard");
    revalidatePath("/orders");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Suppression impossible." };
  }
}
