import { daysUntilDay } from "@/lib/deadline";
import { formatCurrency, remainingAmount } from "@/lib/utils";
import type { InboxItem, OrderWithClient, Settings } from "@/types/database";

export type NotificationKind = "deadline" | "overdue" | "payment" | "quote" | "inbox";
export type NotificationTone = "danger" | "warning" | "info";

export type AppNotification = {
  /** Identifiant stable : une notification reste « lue » tant que la situation ne change pas. */
  id: string;
  kind: NotificationKind;
  tone: NotificationTone;
  title: string;
  message: string;
  /** Commande liée (absente pour une demande entrante). */
  orderId: string;
  orderTitle: string;
  clientName: string | null;
  /** Lien direct vers la conversation d'origine. */
  href?: string;
  /** Date de référence, utilisée pour le tri. */
  at: string;
  read: boolean;
};

const TONE_ORDER: Record<NotificationTone, number> = {
  danger: 0,
  warning: 1,
  info: 2,
};

const KIND_ICON: Record<NotificationKind, string> = {
  overdue: "⏰",
  deadline: "📅",
  payment: "💶",
  quote: "✉️",
  inbox: "📥",
};

export function notificationEmoji(kind: NotificationKind) {
  return KIND_ICON[kind];
}

function daysSince(iso: string, now: Date) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.floor((now.getTime() - date.getTime()) / 86_400_000);
}

/**
 * Construit la liste des notifications à partir des commandes et des règles
 * choisies dans les paramètres :
 *   - X jours avant la deadline (3 j / 1 j / jour même par défaut),
 *   - commande en retard,
 *   - paiement en attente sur une commande livrée,
 *   - devis sans réponse depuis N jours.
 */
export function buildNotifications(
  orders: OrderWithClient[],
  settings: Settings,
  now = new Date(),
  inbox: InboxItem[] = [],
): AppNotification[] {
  const list: AppNotification[] = [];
  const read = settings.read_notifications ?? {};
  const reminderDays = new Set(settings.reminder_days ?? []);

  for (const order of orders) {
    const clientName = order.client?.name ?? null;
    const finished = order.status === "livre";
    const days = daysUntilDay(order.deadline, now);

    if (order.deadline && days !== null && !finished) {
      if (days < 0 && settings.reminder_overdue) {
        list.push({
          id: `overdue:${order.id}`,
          kind: "overdue",
          tone: "danger",
          title: `En retard de ${Math.abs(days)} j`,
          message: `${order.title} — deadline dépassée.`,
          orderId: order.id,
          orderTitle: order.title,
          clientName,
          at: order.deadline,
          read: false,
        });
      } else if (days >= 0 && reminderDays.has(days)) {
        const label =
          days === 0 ? "Deadline aujourd'hui" : `Deadline dans ${days} j`;
        list.push({
          id: `deadline:${order.id}:${days}`,
          kind: "deadline",
          tone: days === 0 ? "danger" : "warning",
          title: label,
          message: `${order.title}${clientName ? ` — ${clientName}` : ""}.`,
          orderId: order.id,
          orderTitle: order.title,
          clientName,
          at: order.deadline,
          read: false,
        });
      }
    }

    if (finished && order.payment_status !== "paye") {
      const due = remainingAmount(order);
      if (due > 0) {
        list.push({
          id: `payment:${order.id}`,
          kind: "payment",
          tone: "danger",
          title:
            order.payment_status === "acompte"
              ? "Solde non réglé"
              : "Paiement en attente",
          message: `${order.title} — ${formatCurrency(due)} à encaisser.`,
          orderId: order.id,
          orderTitle: order.title,
          clientName,
          at: order.paid_at ?? order.updated_at,
          read: false,
        });
      }
    }

  }

  for (const item of inbox) {
    if (item.status !== "nouvelle") continue;
    const excerpt =
      item.message.length > 110 ? `${item.message.slice(0, 107)}…` : item.message;
    list.push({
      id: `inbox:${item.id}`,
      kind: "inbox",
      tone: "info",
      title: "Nouvelle demande",
      message: `${item.author_name} — ${excerpt}`,
      orderId: item.order_id ?? "",
      orderTitle: "Demandes reçues",
      clientName: item.author_name,
      href: "/demands",
      at: item.received_at,
      read: false,
    });
  }

  return list
    .map((item) => ({ ...item, read: Boolean(read[item.id]) }))
    .sort((a, b) => {
      if (a.read !== b.read) return a.read ? 1 : -1;
      const tone = TONE_ORDER[a.tone] - TONE_ORDER[b.tone];
      if (tone !== 0) return tone;
      return new Date(a.at).getTime() - new Date(b.at).getTime();
    });
}

export function unreadCount(notifications: AppNotification[]) {
  return notifications.filter((item) => !item.read).length;
}

/** Résumé texte, utilisé pour l'e-mail récapitulatif. */
export function notificationLine(item: AppNotification) {
  return `${item.title} — ${item.message}`;
}
