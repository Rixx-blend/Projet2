import type { InboxSource, InboxStatus } from "@/types/database";

export const INBOX_SOURCES: {
  value: InboxSource;
  label: string;
  short: string;
  /** Pastille colorée (fond + texte). */
  badge: string;
  dot: string;
  /** Couleur pleine, pour les graphiques. */
  hex: string;
}[] = [
  {
    value: "discord",
    label: "Discord",
    short: "Discord",
    badge: "border-[#5865F2]/40 bg-[#5865F2]/15 text-[#c3c8ff]",
    dot: "bg-[#5865F2]",
    hex: "#5865F2",
  },
  {
    value: "twitter",
    label: "X (Twitter)",
    short: "X",
    badge: "border-white/25 bg-white text-black",
    dot: "bg-white",
    hex: "#e7e9ea",
  },
  {
    value: "formulaire",
    label: "Formulaire",
    short: "Formulaire",
    badge: "border-success/35 bg-success/12 text-success",
    dot: "bg-success",
    hex: "#34d399",
  },
  {
    value: "manuel",
    label: "Ajout manuel",
    short: "Manuel",
    badge: "border-warning/35 bg-warning/12 text-warning",
    dot: "bg-warning",
    hex: "#fbbf24",
  },
];

export function sourceMeta(source: InboxSource) {
  return INBOX_SOURCES.find((entry) => entry.value === source) ?? INBOX_SOURCES[3];
}

export const INBOX_STATUSES: {
  value: InboxStatus;
  label: string;
  badge: string;
}[] = [
  {
    value: "nouvelle",
    label: "Nouvelle",
    badge: "border-accent/40 bg-accent/12 text-accent-strong",
  },
  {
    value: "lue",
    label: "Lue",
    badge: "border-line bg-white/5 text-ink-soft",
  },
  {
    value: "traitee",
    label: "Traitée",
    badge: "border-success/35 bg-success/12 text-success",
  },
  {
    value: "ignoree",
    label: "Ignorée",
    badge: "border-line bg-white/[0.02] text-muted",
  },
];

export function statusMeta(status: InboxStatus) {
  return INBOX_STATUSES.find((entry) => entry.value === status) ?? INBOX_STATUSES[0];
}

/** « il y a 5 min », « hier », puis date courte. */
export function relativeTime(iso: string, now = new Date()) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const diff = now.getTime() - date.getTime();
  const minutes = Math.round(diff / 60_000);

  if (minutes < 1) return "à l’instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} j`;

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  }).format(date);
}

export function excerpt(message: string, max = 220) {
  const clean = message.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}
