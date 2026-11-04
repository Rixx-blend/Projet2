"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  addInboxItem,
  createClient,
  createOrder,
  getInboxItem,
  linkInboxToOrder,
  listClients,
  setInboxStatus,
} from "@/lib/local/db";
import type { InboxSource, InboxStatus } from "@/types/database";

export type InboxActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
  orderId?: string;
};

function revalidateInbox(orderId?: string) {
  revalidatePath("/", "layout");
  revalidatePath("/demands");
  revalidatePath("/dashboard");
  if (orderId) revalidatePath(`/orders/${orderId}`);
}

const manualSchema = z.object({
  author_name: z
    .string()
    .trim()
    .min(1, "Indique le pseudo du client.")
    .max(120, "Pseudo trop long."),
  source: z
    .enum(["discord", "twitter", "formulaire", "manuel"])
    .catch("manuel"),
  message: z
    .string()
    .trim()
    .min(3, "Décris la demande en quelques mots.")
    .max(8000, "Message trop long."),
});

export async function addManualInboxAction(
  _previous: InboxActionResult,
  formData: FormData,
): Promise<InboxActionResult> {
  const parsed = manualSchema.safeParse({
    author_name: formData.get("author_name") ?? "",
    source: formData.get("source") ?? "manuel",
    message: formData.get("message") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  try {
    await addInboxItem({
      source: parsed.data.source as InboxSource,
      external_id: `manuel-${crypto.randomUUID()}`,
      author_name: parsed.data.author_name,
      message: parsed.data.message,
      status: "nouvelle",
    });
  } catch (error) {
    return {
      ok: false,
      error: `Enregistrement impossible : ${
        error instanceof Error ? error.message : "erreur inconnue"
      }`,
    };
  }

  revalidateInbox();
  return { ok: true, message: "Demande ajoutée." };
}

const STATUSES: InboxStatus[] = ["nouvelle", "lue", "traitee", "ignoree"];

export async function setInboxStatusAction(
  id: string,
  status: InboxStatus,
): Promise<InboxActionResult> {
  if (!STATUSES.includes(status)) {
    return { ok: false, error: "Statut inconnu." };
  }

  const item = await setInboxStatus(id, status);
  if (!item) return { ok: false, error: "Demande introuvable." };

  revalidateInbox();
  return { ok: true };
}

function titleFromMessage(message: string, author: string) {
  const firstLine = message
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  const raw = firstLine ?? `Demande de ${author}`;
  return raw.length > 70 ? `${raw.slice(0, 67)}…` : raw;
}

/** Transforme une demande en commande, avec le message copié sur le board. */
export async function convertInboxToOrderAction(
  id: string,
): Promise<InboxActionResult> {
  const item = await getInboxItem(id);
  if (!item) return { ok: false, error: "Demande introuvable." };
  if (item.order_id) {
    return { ok: true, orderId: item.order_id, message: "Commande déjà créée." };
  }

  try {
    const clients = await listClients();
    const existing = clients.find(
      (client) => client.name.toLowerCase() === item.author_name.toLowerCase(),
    );

    const clientId =
      existing?.id ??
      (
        await createClient({
          name: item.author_name,
          discord: item.source === "discord" ? item.author_name : null,
          other_contact: item.conversation_url,
          notes:
            item.source === "twitter"
              ? "Client venu de X (Twitter)."
              : item.source === "discord"
                ? "Client venu de Discord."
                : null,
        })
      ).id;

    const order = await createOrder({
      client_id: clientId,
      title: titleFromMessage(item.message, item.author_name),
      service_type: "Autre",
      description: item.message,
      status: "demande",
      total_price: 0,
      deposit: 0,
      payment_status: "non_paye",
      deadline: null,
      revisions_included: 3,
      revisions_used: 0,
      priority: "normale",
      tags: [item.source === "twitter" ? "x" : item.source],
      time_spent_minutes: 0,
      paid_at: null,
      deposit_at: null,
      board_note: item.message,
    });

    await linkInboxToOrder(item.id, order.id);
    revalidateInbox(order.id);
    return { ok: true, orderId: order.id, message: "Commande créée." };
  } catch (error) {
    return {
      ok: false,
      error: `Conversion impossible : ${
        error instanceof Error ? error.message : "erreur inconnue"
      }`,
    };
  }
}
