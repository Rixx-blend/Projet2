import type {
  OrderPriority,
  OrderStatus,
  PaymentStatus,
} from "@/types/database";

type StatusMeta = {
  value: OrderStatus;
  label: string;
  column: string;
  badge: string;
  dot: string;
  accent: string;
};

/** Colonnes centrées sur la production visuelle et les retours client. */
export const ORDER_STATUSES: StatusMeta[] = [
  { value: "demande", label: "À cadrer", column: "border-t-muted/70", badge: "bg-muted/12 text-muted ring-muted/30", dot: "bg-muted", accent: "border-l-muted/60" },
  { value: "devis_envoye", label: "Prêt à produire", column: "border-t-blue/70", badge: "bg-blue/12 text-blue ring-blue/30", dot: "bg-blue", accent: "border-l-blue/70" },
  { value: "en_cours", label: "En création", column: "border-t-accent/70", badge: "bg-accent/12 text-accent-strong ring-accent/30", dot: "bg-accent", accent: "border-l-accent/70" },
  { value: "revision", label: "En retours", column: "border-t-warning/70", badge: "bg-warning/12 text-warning ring-warning/30", dot: "bg-warning", accent: "border-l-warning/70" },
  { value: "livre", label: "Livré", column: "border-t-success/70", badge: "bg-success/12 text-success ring-success/30", dot: "bg-success", accent: "border-l-success/70" },
];

export const ORDER_STATUS_VALUES = ORDER_STATUSES.map((s) => s.value);

export function statusMeta(status: OrderStatus): StatusMeta {
  return ORDER_STATUSES.find((s) => s.value === status) ?? ORDER_STATUSES[0];
}

export const PAYMENT_STATUSES: {
  value: PaymentStatus;
  label: string;
  short: string;
  badge: string;
  dot: string;
}[] = [
  { value: "non_paye", label: "À régler", short: "À régler", badge: "bg-danger/12 text-danger ring-danger/30", dot: "bg-danger" },
  { value: "acompte", label: "Acompte", short: "Acompte", badge: "bg-warning/12 text-warning ring-warning/30", dot: "bg-warning" },
  { value: "paye", label: "Payé", short: "Payé", badge: "bg-success/12 text-success ring-success/30", dot: "bg-success" },
];

export function paymentMeta(status: PaymentStatus) {
  return PAYMENT_STATUSES.find((p) => p.value === status) ?? PAYMENT_STATUSES[0];
}

export const ORDER_PRIORITIES: { value: OrderPriority; label: string; badge: string }[] = [
  { value: "basse", label: "Basse", badge: "text-muted" },
  { value: "normale", label: "Normale", badge: "text-ink-soft" },
  { value: "haute", label: "Haute", badge: "text-warning" },
  { value: "urgente", label: "Urgente", badge: "text-danger" },
];

export function priorityMeta(priority: OrderPriority) {
  return ORDER_PRIORITIES.find((p) => p.value === priority) ?? ORDER_PRIORITIES[1];
}

export const SERVICE_TYPES = [
  "Logo", "Identité visuelle", "Miniature YouTube", "Illustration",
  "Skin / Texturing 3D", "Pack 3D", "Affiche", "Bannière", "Motion design", "Autre",
] as const;
