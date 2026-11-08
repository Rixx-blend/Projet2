type Obj = Record<string, unknown>;

export function txt(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (!value || typeof value !== "object") return "";
  const o = value as Obj;
  if (typeof o.simpleText === "string") return o.simpleText;
  // YouTube text runs use { text: "..." }, not always { simpleText: "..." }.
  if (typeof o.text === "string") return o.text;
  if (Array.isArray(o.runs)) return o.runs.map(txt).join("");
  return "";
}

// Suffixes de grandeur (k, M, Md, "millions"…). Le lookahead (?![a-zà-ÿ]) est
// essentiel : sans lui, le "m" de "3 mois" ou de "12 minutes" était lu comme
// "million" et gonflait les compteurs (ex. 1,1 M de vues de moyenne).
const SUFFIX = "milliards?|millions?|milliers?|mrd|md|k|m|b";

export function count(value: unknown): number | null {
  const raw = txt(value).replace(/[  ]/g, " ").trim();
  const m = raw.match(new RegExp(`(\\d[\\d.,\\s]*)\\s*(?:(${SUFFIX})(?![a-zà-ÿ0-9]))?`, "i"));
  if (!m) return null;
  let n = m[1].replace(/\s/g, "");
  const suffix = (m[2] || "").toLowerCase();
  if (n.includes(",") && n.includes(".")) n = n.lastIndexOf(",") > n.lastIndexOf(".") ? n.replace(/\./g, "").replace(",", ".") : n.replace(/,/g, "");
  else if (n.includes(",")) {
    const p = n.split(",");
    n = p.length === 2 && p[1].length <= 2 && suffix ? p[0] + "." + p[1] : n.replace(/,/g, "");
  } else if (n.includes(".")) {
    const p = n.split(".");
    if (!(p.length === 2 && p[1].length <= 2 && suffix)) n = n.replace(/\./g, "");
  }
  const valueNumber = Number(n);
  if (!Number.isFinite(valueNumber)) return null;
  // Milliard testé avant million : "milliard", "mrd" et "md" commencent aussi par "m".
  const factor = /^(?:milliard|mrd|md|b)/.test(suffix) ? 1e9
    : /^(?:million|m)/.test(suffix) ? 1e6
    : /^(?:millier|k)/.test(suffix) ? 1e3
    : 1;
  return Math.round(valueNumber * factor);
}

const VIEWS_WORD = "(?:de\\s+)?(?:views?|vues?)(?![a-zà-ÿ])";
const VIEWS_LOOSE = new RegExp(`(\\d[\\d.,\\s]*(?:\\s?(?:${SUFFIX})(?![a-zà-ÿ0-9]))?)\\s*${VIEWS_WORD}`, "i");
const VIEWS_STRICT = new RegExp(`^\\s*(\\d[\\d.,\\s]*(?:\\s?(?:${SUFFIX})(?![a-zà-ÿ0-9]))?)\\s*${VIEWS_WORD}\\s*$`, "i");

/** Texte exactement du type "857 vues" / "1,1 M de vues" / "No views". */
export function isStrictViewsText(value: unknown): boolean {
  const raw = txt(value).replace(/[  ]/g, " ").trim();
  return VIEWS_STRICT.test(raw) || /^(?:aucune?|no)\s+(?:vue|view)s?$/i.test(raw);
}

/**
 * Lit un nombre de VUES. Le nombre doit être suivi du mot "vues"/"views" :
 * "il y a 3 mois", "12 minutes" ou "1 234 spectateurs" ne sont jamais des vues.
 * Un compteur brut ("857") est accepté seulement s'il vient d'un champ viewCount.
 */
export function parseViews(value: unknown, allowBareNumber = false): number | null {
  const raw = txt(value).replace(/[  ]/g, " ").trim();
  if (!raw) return null;
  if (/^(?:aucune?|no)\s+(?:vue|view)s?$/i.test(raw)) return 0;
  if (allowBareNumber && /^\d[\d\s.,]*$/.test(raw)) return count(raw);
  const m = raw.match(VIEWS_STRICT) || raw.match(VIEWS_LOOSE);
  return m ? count(m[1]) : null;
}
