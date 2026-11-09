/** Notes créatives : modèle, tags, stockage local (navigateur) et utilitaires. */

export type NoteColor = "neutral" | "sage" | "amber" | "rose" | "sky" | "violet";

export const NOTE_COLORS: Record<NoteColor, { label: string; hex: string }> = {
  neutral: { label: "Neutre", hex: "#454846" },
  sage: { label: "Sauge", hex: "#B5CEA5" },
  amber: { label: "Ambre", hex: "#F2B45B" },
  rose: { label: "Rose", hex: "#FF647C" },
  sky: { label: "Ciel", hex: "#5EC1E0" },
  violet: { label: "Violet", hex: "#7C6CF0" },
};

export type NoteItem = {
  id: string;
  text: string;
  done: boolean;
};

/** Tag libre : un libellé et une couleur choisie (ou une couleur prédéfinie). */
export type NoteTag = {
  label: string;
  color: NoteColor;
};

export type Note = {
  id: string;
  title: string;
  body: string;
  color: NoteColor;
  pinned: boolean;
  tags: NoteTag[];
  items: NoteItem[];
  createdAt: string;
  updatedAt: string;
};

/** Tags proposés d'un clic. L'ordre donne la priorité visuelle sur la carte. */
export const PRESET_TAGS: NoteTag[] = [
  { label: "Urgent", color: "rose" },
  { label: "En cours", color: "amber" },
  { label: "À valider", color: "sky" },
  { label: "Client", color: "violet" },
  { label: "Idée", color: "sage" },
];

const STORAGE_KEY = "rixx-studio:notes:v1";

function uid() {
  return `${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function newId() {
  return uid();
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
    tags: [],
    items: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/** Couleur de la carte : celle du tag le plus prioritaire, sinon la couleur de la note. */
export function cardAccent(note: Pick<Note, "tags" | "color">): string {
  for (const preset of PRESET_TAGS) {
    if (note.tags.some((tag) => tag.label === preset.label)) {
      return NOTE_COLORS[preset.color].hex;
    }
  }
  return NOTE_COLORS[note.color].hex;
}

export function tagHex(tag: NoteTag) {
  return NOTE_COLORS[tag.color].hex;
}

export type NoteTemplate = {
  id: string;
  label: string;
  hint: string;
  title: string;
  body: string;
  color: NoteColor;
  tags: NoteTag[];
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
    tags: [{ label: "Client", color: "violet" }],
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
    tags: [{ label: "À valider", color: "sky" }],
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
    tags: [{ label: "Idée", color: "sage" }],
    items: ["Tester une palette sombre", "Faire un rendu de test"],
  },
];

export function createFromTemplate(template: NoteTemplate): Note {
  return createNote({
    title: template.title,
    body: template.body,
    color: template.color,
    tags: template.tags,
    items: template.items.map(newItem),
  });
}

/** Accepte les notes sauvegardées avant l'ajout des tags. */
function normalizeNote(raw: Partial<Note>): Note | null {
  if (!raw || typeof raw.id !== "string") return null;
  return createNote({
    ...raw,
    id: raw.id,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    items: Array.isArray(raw.items) ? raw.items : [],
    color: raw.color && raw.color in NOTE_COLORS ? raw.color : "neutral",
  });
}

export function readNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((note) => normalizeNote(note as Partial<Note>))
      .filter((note): note is Note => note !== null);
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
  if (note.tags.length) lines.push(`Tags : ${note.tags.map((tag) => tag.label).join(", ")}`, "");
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
