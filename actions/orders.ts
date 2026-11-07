"use server";

import { revalidatePath } from "next/cache";

import {
  createClient,
  createOrder,
  addFile,
  deleteOrder,
  getOrder,
  setOrderStatus,
  updateOrder,
} from "@/lib/local/db";
import { field, orderFormSchema } from "@/lib/validations";
import { saveUploadedStream } from "@/lib/local/files";
import { parseTags } from "@/lib/utils";
import type { Order, OrderStatus, PaymentStatus } from "@/types/database";

export type OrderFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  orderId?: string;
};

function readNumber(formData: FormData, name: string) {
  const raw = formData.get(name);
  if (typeof raw !== "string" || raw.trim() === "") return 0;
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) ? value : Number.NaN;
}

function readDeadline(formData: FormData): string | null {
  const raw = field(formData, "deadline");
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseOrderForm(formData: FormData) {
  return orderFormSchema.safeParse({
    id: field(formData, "id") ?? undefined,
    client_id: field(formData, "client_id"),
    new_client_name: field(formData, "new_client_name"),
    new_client_email: field(formData, "new_client_email"),
    new_client_discord: field(formData, "new_client_discord"),
    title: formData.get("title") ?? "",
    service_type: formData.get("service_type") ?? "",
    description: field(formData, "description"),
    status: formData.get("status") ?? "brief",
    payment_status: formData.get("payment_status") ?? "non_paye",
    priority: formData.get("priority") ?? "normale",
    total_price: readNumber(formData, "total_price"),
    deposit: readNumber(formData, "deposit"),
    deadline: readDeadline(formData),
    revisions_included: readNumber(formData, "revisions_included"),
    revisions_used: readNumber(formData, "revisions_used"),
    time_spent_minutes: readNumber(formData, "time_spent_minutes"),
    tags: field(formData, "tags"),
  });
}

function toFieldErrors(
  issues: { path: (string | number | symbol)[]; message: string }[],
) {
  const errors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] = [...(errors[key] ?? []), issue.message];
  }
  return errors;
}

/** Renvoie l'identifiant du client, en le créant à la volée si besoin. */
async function resolveClientId(data: {
  client_id?: string | null;
  new_client_name?: string | null;
  new_client_email?: string | null;
  new_client_discord?: string | null;
}): Promise<{ clientId: string | null; error?: string }> {
  if (data.client_id) return { clientId: data.client_id };
  if (!data.new_client_name) return { clientId: null, error: "Client manquant." };

  try {
    const client = await createClient({
      name: data.new_client_name,
      email: data.new_client_email,
      discord: data.new_client_discord,
    });
    return { clientId: client.id };
  } catch (error) {
    return {
      clientId: null,
      error: `Impossible de créer le client : ${
        error instanceof Error ? error.message : "erreur inconnue"
      }`,
    };
  }
}

/**
 * Dates de paiement utilisées par les statistiques de revenus.
 * Elles ne sont renseignées qu'au moment où le paiement est constaté.
 */
function paymentDates(
  status: PaymentStatus,
  existing?: Pick<Order, "paid_at" | "deposit_at"> | null,
) {
  const now = new Date().toISOString();
  if (status === "paye") {
    return {
      paid_at: existing?.paid_at ?? now,
      deposit_at: existing?.deposit_at ?? now,
    };
  }
  if (status === "acompte") {
    return { paid_at: null, deposit_at: existing?.deposit_at ?? now };
  }
  return { paid_at: null, deposit_at: null };
}

function revalidateOrder(orderId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/");
  if (orderId) revalidatePath(`/orders/${orderId}`);
}

/** Création d'une commande + board vide + checklist de suivi. */
export async function createOrderAction(
  _prevState: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  const parsed = parseOrderForm(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Vérifie les champs du formulaire.",
      fieldErrors: toFieldErrors(parsed.error.issues),
    };
  }

  const data = parsed.data;
  const client = await resolveClientId(data);
  if (client.error) {
    return { status: "error", message: client.error };
  }

  try {
    const order = await createOrder({
      ...paymentDates(data.payment_status),
      client_id: client.clientId,
      title: data.title,
      service_type: data.service_type,
      description: data.description,
      status: data.status,
      payment_status: data.payment_status,
      priority: data.priority,
      total_price: data.total_price,
      deposit: data.deposit,
      deadline: data.deadline,
      revisions_included: data.revisions_included,
      revisions_used: data.revisions_used,
      time_spent_minutes: data.time_spent_minutes,
      tags: parseTags(data.tags),
    });

    const attachments = formData.getAll("attachments").filter(
      (entry): entry is File => typeof entry !== "string" && entry.size > 0,
    );
    for (const file of attachments) {
      const { storagePath, size } = await saveUploadedStream(order.id, file.name, file.stream());
      await addFile({
        order_id: order.id,
        name: file.name,
        type: file.type || null,
        size,
        storage_path: storagePath,
      });
    }

    revalidateOrder(order.id);
    return { status: "success", orderId: order.id };
  } catch (error) {
    return {
      status: "error",
      message: `Création impossible : ${
        error instanceof Error ? error.message : "erreur inconnue"
      }`,
    };
  }
}

/** Mise à jour d'une commande existante. */
export async function updateOrderAction(
  _prevState: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  const parsed = parseOrderForm(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Vérifie les champs du formulaire.",
      fieldErrors: toFieldErrors(parsed.error.issues),
    };
  }

  const data = parsed.data;
  if (!data.id) {
    return { status: "error", message: "Commande introuvable." };
  }

  const client = await resolveClientId(data);
  if (client.error) {
    return { status: "error", message: client.error };
  }

  try {
    const current = await getOrder(data.id);
    if (!current) {
      return { status: "error", message: "Commande introuvable." };
    }

    const updated = await updateOrder(data.id, {
      ...paymentDates(data.payment_status, current),
      client_id: client.clientId,
      title: data.title,
      service_type: data.service_type,
      description: data.description,
      status: data.status,
      payment_status: data.payment_status,
      priority: data.priority,
      total_price: data.total_price,
      deposit: data.deposit,
      deadline: data.deadline,
      revisions_included: data.revisions_included,
      revisions_used: data.revisions_used,
      time_spent_minutes: data.time_spent_minutes,
      tags: parseTags(data.tags),
    });

    if (!updated) {
      return { status: "error", message: "Commande introuvable." };
    }
  } catch (error) {
    return {
      status: "error",
      message: `Mise à jour impossible : ${
        error instanceof Error ? error.message : "erreur inconnue"
      }`,
    };
  }

  revalidateOrder(data.id);
  return { status: "success", orderId: data.id };
}

/** Change uniquement le statut (drag & drop du Kanban). */
export async function updateOrderStatusAction(
  orderId: string,
  status: OrderStatus,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const updated = await setOrderStatus(orderId, status);
    if (!updated) return { ok: false, error: "Commande introuvable." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erreur inconnue.",
    };
  }

  revalidateOrder(orderId);
  return { ok: true };
}

/** Termine une commande et enregistre son paiement intégral dans les revenus. */
export async function finishOrderAction(
  orderId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const current = await getOrder(orderId);
    if (!current) return { ok: false, error: "Commande introuvable." };

    const updated = await updateOrder(orderId, {
      status: "livre",
      payment_status: "paye",
      ...paymentDates("paye", current),
    });
    if (!updated) return { ok: false, error: "Commande introuvable." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erreur inconnue.",
    };
  }

  revalidateOrder(orderId);
  return { ok: true };
}

/** Modifie uniquement la deadline (glisser-déposer du calendrier). */
export async function setOrderDeadlineAction(
  orderId: string,
  deadline: string | null,
): Promise<{ ok: boolean; deadline?: string | null; error?: string }> {
  let iso: string | null = null;

  if (deadline) {
    const date = new Date(deadline);
    if (Number.isNaN(date.getTime())) {
      return { ok: false, error: "Date invalide." };
    }
    iso = date.toISOString();
  }

  try {
    const updated = await updateOrder(orderId, { deadline: iso });
    if (!updated) return { ok: false, error: "Commande introuvable." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erreur inconnue.",
    };
  }

  revalidatePath("/calendar");
  revalidateOrder(orderId);
  return { ok: true, deadline: iso };
}

/** Archive une commande terminée sans supprimer ses données ni ses revenus. */
export async function archiveOrderAction(
  orderId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const current = await getOrder(orderId);
    if (!current) return { ok: false, error: "Commande introuvable." };
    if (current.status !== "livre" || current.payment_status !== "paye") {
      return { ok: false, error: "Seules les commandes terminées et payées peuvent être archivées." };
    }
    const updated = await updateOrder(orderId, { archived_at: new Date().toISOString() });
    if (!updated) return { ok: false, error: "Commande introuvable." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erreur inconnue.",
    };
  }

  revalidateOrder(orderId);
  revalidatePath("/dashboard");
  revalidatePath("/revenue");
  return { ok: true };
}
/** Supprime une commande, son board, ses fichiers et ses checklists. */
export async function deleteOrderAction(
  orderId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const removed = await deleteOrder(orderId);
    if (!removed) return { ok: false, error: "Commande introuvable." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erreur inconnue.",
    };
  }

  revalidateOrder(orderId);
  return { ok: true };
}
