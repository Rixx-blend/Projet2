import type {
  OrderPriority,
  OrderStatus,
  PaymentStatus,
} from "@/types/database";

type StatusMeta = {
  value: OrderStatus;
  label: string;
  /** Classes de la colonne Kanban */
  column: string;
  /** Classes de la pastille / badge */
  badge: string;
  dot: string;
  /** Couleur d'accent appliquée au bord gauche d'une carte */
  accent: string;
};

/** Colonnes du Kanban : étapes de production, dans l'ordre de travail. */
export const ORDER_STATUSES: StatusMeta[] = [
  {
    value: "brief",
    label: "Brief",
    column: "border-t-muted/70",
    badge: "bg-muted/12 text-muted ring-muted/30",
    dot: "bg-muted",
    accent: "border-l-muted/60",
  },
  {
    value: "creation",
    label: "Création active",
    column: "border-t-accent/70",
    badge: "bg-accent/12 text-accent-strong ring-accent/30",
    dot: "bg-accent",
    accent: "border-l-accent/70",
  },
  {
    value: "revision",
    label: "Révisions client",
    column: "border-t-warning/70",
    badge: "bg-warning/12 text-warning ring-warning/30",
    dot: "bg-warning",
    accent: "border-l-warning/70",
  },
  {
    value: "finalisation",
    label: "Finalisation",
    column: "border-t-blue/70",
    badge: "bg-blue/12 text-blue ring-blue/30",
    dot: "bg-blue",
    accent: "border-l-blue/70",
  },
  {
    value: "livre",
    label: "Livré",
    column: "border-t-success/70",
    badge: "bg-success/12 text-success ring-success/30",
    dot: "bg-success",
    accent: "border-l-success/70",
  },
];

export const ORDER_STATUS_VALUES = ORDER_STATUSES.map((s) => s.value);

/**
 * Anciennes valeurs de statut (suivi administratif) ramenées vers les étapes
 * de production. Appliqué à la lecture des données existantes.
 */
const LEGACY_STATUS_MAP: Record<string, OrderStatus> = {
  demande: "brief",
  devis_envoye: "brief",
  acompte_paye: "creation",
  en_cours: "creation",
  revision: "revision",
  livre: "livre",
  paye: "livre",
};

export function normalizeStatus(value: string | null | undefined): OrderStatus {
  if (value && ORDER_STATUS_VALUES.includes(value as OrderStatus)) {
    return value as OrderStatus;
  }
  return (value && LEGACY_STATUS_MAP[value]) || "brief";
}

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
  {
    value: "non_paye",
    label: "En attente",
    short: "En attente",
    badge: "bg-muted/12 text-muted ring-muted/30",
    dot: "bg-muted",
  },
  {
    value: "acompte",
    label: "Acompte versé",
    short: "Acompte",
    badge: "bg-warning/12 text-warning ring-warning/30",
    dot: "bg-warning",
  },
  {
    value: "paye",
    label: "Payé",
    short: "Payé",
    badge: "bg-success/12 text-success ring-success/30",
    dot: "bg-success",
  },
];

export function paymentMeta(status: PaymentStatus) {
  return PAYMENT_STATUSES.find((p) => p.value === status) ?? PAYMENT_STATUSES[0];
}

export const ORDER_PRIORITIES: {
  value: OrderPriority;
  label: string;
  badge: string;
}[] = [
  { value: "basse", label: "Basse", badge: "text-muted" },
  { value: "normale", label: "Normale", badge: "text-ink-soft" },
  { value: "haute", label: "Haute", badge: "text-warning" },
  { value: "urgente", label: "Urgente", badge: "text-danger" },
];

export function priorityMeta(priority: OrderPriority) {
  return ORDER_PRIORITIES.find((p) => p.value === priority) ?? ORDER_PRIORITIES[1];
}

/** Types de prestation proposés par défaut (modifiables plus tard via les modèles). */
export const SERVICE_TYPES = [
  "Logo",
  "Identité visuelle",
  "Miniature YouTube",
  "Illustration",
  "Skin / Texturing 3D",
  "Pack 3D",
  "Affiche",
  "Bannière",
  "Motion design",
  "Autre",
] as const;
