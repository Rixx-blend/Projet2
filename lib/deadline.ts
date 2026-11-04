import type { OrderStatus } from "@/types/database";

export type DeadlineTone = "done" | "overdue" | "soon" | "ok" | "none";

export type DeadlineState = {
  tone: DeadlineTone;
  /** Texte complet : « En retard de 3 j », « Dans 2 j », « Terminée ». */
  label: string;
  /** Version courte pour les cartes et le calendrier. */
  short: string;
  /** Nombre de jours restants (négatif si en retard). */
  days: number | null;
  /** Classes de la pastille (texte + fond). */
  chip: string;
  /** Classes de la bordure/du fond d'une carte. */
  card: string;
  /** Couleur pleine, pour les traits et pastilles du calendrier. */
  dot: string;
};

const TONES: Record<DeadlineTone, { chip: string; card: string; dot: string }> = {
  overdue: {
    chip: "border-danger/35 bg-danger/12 text-danger",
    card: "border-danger/30 bg-danger/[0.07]",
    dot: "bg-danger",
  },
  soon: {
    chip: "border-warning/35 bg-warning/12 text-warning",
    card: "border-warning/25 bg-warning/[0.05]",
    dot: "bg-warning",
  },
  ok: {
    chip: "border-success/30 bg-success/10 text-success",
    card: "border-line bg-panel",
    dot: "bg-success",
  },
  done: {
    chip: "border-line bg-white/5 text-muted",
    card: "border-line bg-panel/70",
    dot: "bg-muted",
  },
  none: {
    chip: "border-line bg-white/5 text-muted",
    card: "border-line bg-panel",
    dot: "bg-muted",
  },
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Nombre de jours calendaires entre aujourd'hui et la deadline. */
export function daysUntilDay(deadline: string | null, now = new Date()): number | null {
  if (!deadline) return null;
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return null;
  return Math.round((startOfDay(date) - startOfDay(now)) / 86_400_000);
}

/**
 * Compte à rebours d'une commande :
 * vert au-delà de 5 jours, orange de 1 à 5 jours, rouge en retard, gris une fois livrée/payée.
 */
export function deadlineState(
  deadline: string | null,
  status: OrderStatus,
  now = new Date(),
): DeadlineState {
  const finished = status === "livre" || status === "paye";
  const days = daysUntilDay(deadline, now);

  if (finished) {
    return {
      tone: "done",
      label: days === null ? "Terminée" : "Terminée",
      short: "Terminée",
      days,
      ...TONES.done,
    };
  }

  if (days === null) {
    return {
      tone: "none",
      label: "Pas de deadline",
      short: "Sans deadline",
      days: null,
      ...TONES.none,
    };
  }

  if (days < 0) {
    const late = Math.abs(days);
    return {
      tone: "overdue",
      label: `En retard de ${late} j`,
      short: `Retard ${late} j`,
      days,
      ...TONES.overdue,
    };
  }

  if (days === 0) {
    return { tone: "soon", label: "Aujourd'hui", short: "Aujourd'hui", days, ...TONES.soon };
  }

  if (days <= 5) {
    return {
      tone: "soon",
      label: days === 1 ? "Demain" : `Dans ${days} j`,
      short: days === 1 ? "Demain" : `${days} j`,
      days,
      ...TONES.soon,
    };
  }

  return {
    tone: "ok",
    label: `Dans ${days} j`,
    short: `${days} j`,
    days,
    ...TONES.ok,
  };
}
