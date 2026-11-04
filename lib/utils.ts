import type { Order } from "@/types/database";

/** Concatène des classes conditionnelles. */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const euro = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number | null | undefined) {
  return euro.format(Number(value ?? 0));
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return dateTimeFormatter.format(date);
}

/** Vrai si la deadline est déjà passée. */
export function isOverdue(deadline: string | null | undefined) {
  if (!deadline) return false;
  return new Date(deadline).getTime() < Date.now();
}

/** Nombre de jours (entiers) entre aujourd'hui et la date donnée. */
export function daysUntil(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();
  const startOfDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
  return Math.round((startOfDay - startOfToday) / 86_400_000);
}

export function deadlineLabel(deadline: string | null | undefined) {
  const days = daysUntil(deadline);
  if (days === null) return null;
  if (days < 0) return `En retard de ${Math.abs(days)} j`;
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Demain";
  if (days <= 7) return `Dans ${days} j`;
  return formatDate(deadline);
}

/** Convertit une valeur ISO en valeur utilisable par `<input type="datetime-local">`. */
export function toDatetimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatFileSize(bytes: number) {
  if (!bytes) return "0 o";
  const units = ["o", "Ko", "Mo", "Go"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const size = bytes / 1024 ** exponent;
  return `${size.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Extrait les tags d'une chaîne « logo, urgent, 3d ». */
export function parseTags(value: string | null | undefined) {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 12),
    ),
  );
}

/** Solde restant à percevoir sur une commande. */
export function remainingAmount(order: Pick<Order, "total_price" | "deposit" | "payment_status">) {
  const total = Number(order.total_price ?? 0);
  const deposit = Number(order.deposit ?? 0);
  if (order.payment_status === "paye") return 0;
  if (order.payment_status === "acompte") return Math.max(total - deposit, 0);
  return total;
}

/** Taux horaire réel (prix total / temps passé). */
export function hourlyRate(order: Pick<Order, "total_price" | "time_spent_minutes">) {
  const minutes = Number(order.time_spent_minutes ?? 0);
  if (minutes <= 0) return null;
  return Number(order.total_price ?? 0) / (minutes / 60);
}
