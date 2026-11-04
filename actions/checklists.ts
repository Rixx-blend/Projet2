"use server";

import { revalidatePath } from "next/cache";

import {
  addChecklist,
  addChecklistItem,
  deleteChecklist,
  deleteChecklistItem,
  setChecklistItemDone,
} from "@/lib/local/db";

function revalidateOrder(orderId?: string) {
  revalidatePath("/dashboard");
  if (orderId) revalidatePath(`/orders/${orderId}`);
}

export async function addChecklistAction(orderId: string, title: string) {
  try {
    await addChecklist(orderId, title);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erreur inconnue.",
    };
  }
  revalidateOrder(orderId);
  return { ok: true };
}

export async function deleteChecklistAction(checklistId: string, orderId: string) {
  try {
    const removed = await deleteChecklist(checklistId);
    if (!removed) return { ok: false, error: "Checklist introuvable." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erreur inconnue.",
    };
  }
  revalidateOrder(orderId);
  return { ok: true };
}

export async function addChecklistItemAction(
  checklistId: string,
  text: string,
  orderId: string,
) {
  if (!text.trim()) return { ok: false, error: "Le texte est vide." };

  try {
    const item = await addChecklistItem(checklistId, text);
    if (!item) return { ok: false, error: "Checklist introuvable." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erreur inconnue.",
    };
  }
  revalidateOrder(orderId);
  return { ok: true };
}

export async function toggleChecklistItemAction(
  itemId: string,
  done: boolean,
  orderId: string,
) {
  try {
    const updated = await setChecklistItemDone(itemId, done);
    if (!updated) return { ok: false, error: "Élément introuvable." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erreur inconnue.",
    };
  }
  revalidateOrder(orderId);
  return { ok: true };
}

export async function deleteChecklistItemAction(itemId: string, orderId: string) {
  try {
    const removed = await deleteChecklistItem(itemId);
    if (!removed) return { ok: false, error: "Élément introuvable." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erreur inconnue.",
    };
  }
  revalidateOrder(orderId);
  return { ok: true };
}

