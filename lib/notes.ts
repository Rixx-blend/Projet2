/** Notes créatives : modèle, stockage local (navigateur) et utilitaires. */

export type NoteColor = "neutral" | "sage" | "amber" | "rose" | "sky" | "violet";

export type NoteItem = {
  id: string;
  text: string;
  done: boolean;
};

export type Note = {
  id: string;
  title: string;
  body: string;
  color: NoteColor;
  pinned: boolean;
  items: NoteItem[];
  createdAt: string;
  updatedAt: string;
};

export const NOTE_COLORS: Record<NoteColor, { label: string; hex: string }> = {
  neutral: { label: "Neutre", hex: "#454846" },
  sage: { label: "Sauge", hex: "#B5CEA5" },
  amber: { label: "Ambre", hex: "#F2B45B" },
  rose: { label: "Rose", hex: "#FF647C" },
  sky: { label: "Ciel", hex: "#5EC1E0" },
  violet: { label: "Violet", hex: "#7C6CF0" },
};

const STORAGE_KEY = "rixx-studio:notes:v1";

function uid() {
  return `${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function newItem(text: string): NoteItem {
  return { id: uid(), text: text.trim(), done: false };
}

export function createNote(overrides: Partial<Note> = {}): Note {
  const now = new Date().toISOString();
  return {
    id: uid(),
    title: "",
    body: "",
    color: "neutral",
    pinned: false,
    items: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export type NoteTemplate = {
  id: string;
  label: string;
  hint: string;
  title: string;
  body: string;
  color: NoteColor;
  items: string[];
};

/** Modèles pensés pour le quotidien d'un graphiste ou d'un artiste. */
export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: "brief",
    label: "Brief client",
    hint: "Objectif, formats, délais et checklist de départ",
    title: "Brief : nom du client",
    body: "Objectif :\nFormat et dimensions :\nDélai :\nBudget :\nRéférences :",
    color: "sky",
    items: [
      "Valider le brief avec le client",
      "Collecter le logo et la charte graphique",
      "Confirmer formats et dimensions",
      "Recevoir l'acompte",
    ],
  },
  {
    id: "livraison",
    label: "Livraison",
    hint: "Export, nommage et validation finale",
    title: "Livraison : nom du projet",
    body: "Formats à exporter : PNG, JPG, PDF\nNommage des fichiers :",
    color: "sage",
    items: [
      "Vérifier marges et zones de sécurité",
      "Exporter toutes les variantes",
      "Nommer les fichiers selon la convention",
      "Envoyer le lien de téléchargement",
      "Obtenir la validation écrite",
    ],
  },
  {
    id: "idees",
    label: "Idées de visuels",
    hint: "Une page libre pour tes pistes créatives",
    title: "Idées",
    body: "",
    color: "violet",
    items: ["Tester une palette sombre", "Faire un rendu de test"],
  },
];

export function createFromTemplate(template: NoteTemplate): Note {
  return createNote({
    title: template.title,
    body: template.body,
    color: template.color,
    items: template.items.map(newItem),
  });
}

export function readNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Note[]) : [];
  } catch {
    return [];
  }
}

export function writeNotes(notes: Note[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // Stockage désactivé ou plein : la note reste affichée pour la session.
  }
}

/** Épinglées d'abord, puis les plus récentes. */
export function sortNotes(notes: Note[]) {
  return [...notes].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt),
  );
}

export function noteProgress(items: NoteItem[]) {
  const total = items.length;
  const done = items.filter((item) => item.done).length;
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
}

const BULLET = /^\s*(?:[-*]|\[\s?\])\s+(.+)$/;

/** Sort les lignes « - élément » ou « [] élément » du texte pour en faire des cases. */
export function extractBullets(body: string) {
  const items: string[] = [];
  const kept: string[] = [];
  for (const line of body.split("\n")) {
    const match = line.match(BULLET);
    if (match) items.push(match[1].trim());
    else kept.push(line);
  }
  return {
    body: kept.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
    items,
  };
}

export function wordCount(text: string) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function exportNoteText(note: Note) {
  const lines = [note.title || "Sans titre", ""];
  if (note.body.trim()) lines.push(note.body.trim(), "");
  if (note.items.length) {
    lines.push("Cases à cocher :");
    for (const item of note.items) {
      lines.push(`[${item.done ? "x" : " "}] ${item.text}`);
    }
  }
  return lines.join("\n");
}

export function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "note"
  );
}
