"use client";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

// Panneau de style à droite, sur le modèle de l'ancien panneau des planches.
const COLORS = ["#E9E9E9", "#9A9A9A", "#E07BE0", "#B04FD6", "#3B6EF0", "#3BA0F0", "#F5B030", "#F26B1D", "#0E8A5F", "#2EBD6B", "#F28A8A", "#E5383B"];

const FILLS = [
  { id: "none", label: "Aucun" },
  { id: "semi", label: "Léger" },
  { id: "solid", label: "Plein" },
  { id: "pattern", label: "Hachuré" },
] as const;

const DASHES = [
  { id: "draw", label: "Dessin", strokeStyle: "solid", roughness: 2 },
  { id: "solid", label: "Trait", strokeStyle: "solid", roughness: 0 },
  { id: "dashed", label: "Tirets", strokeStyle: "dashed", roughness: 0 },
  { id: "dotted", label: "Pointillés", strokeStyle: "dotted", roughness: 0 },
] as const;

const SIZES = [
  { id: "S", stroke: 1, font: 16 },
  { id: "M", stroke: 2, font: 20 },
  { id: "L", stroke: 3.5, font: 28 },
  { id: "XL", stroke: 5, font: 36 },
] as const;

const FONTS = [
  { id: "draw", label: "Dessin", family: 1 },
  { id: "sans", label: "Sans", family: 2 },
  { id: "mono", label: "Mono", family: 3 },
  { id: "round", label: "Arrondi", family: 6 },
] as const;

const ALIGNS = [
  { id: "left", label: "Gauche" },
  { id: "center", label: "Centre" },
  { id: "right", label: "Droite" },
] as const;

type El = { id: string; type: string; version: number; versionNonce: number; [key: string]: any };
type AppState = Record<string, any>;

function selectedIds(appState: AppState): string[] {
  return Object.keys(appState.selectedElementIds ?? {}).filter((id) => appState.selectedElementIds[id]);
}

function Dash({ id }: { id: string }) {
  const dash = id === "dashed" ? "3 2" : id === "dotted" ? "0.5 2.5" : undefined;
  return (
    <svg width="20" height="12" viewBox="0 0 20 12" aria-hidden>
      <path d={id === "draw" ? "M1 6 C4 2, 6 10, 10 6 S16 2, 19 6" : "M1 6 L19 6"} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeDasharray={dash} />
    </svg>
  );
}

function Fill({ id }: { id: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <rect x="2" y="2" width="12" height="12" rx="2" fill={id === "solid" ? "currentColor" : id === "semi" ? "currentColor" : "none"} fillOpacity={id === "semi" ? 0.3 : 1} stroke="currentColor" strokeWidth={1.5} />
      {id === "pattern" ? <path d="M4 12 L12 4 M6 14 L14 6" stroke="currentColor" strokeWidth={1.2} /> : null}
    </svg>
  );
}

export function StylePanel({ api, appState, elements }: { api: ExcalidrawImperativeAPI | null; appState: AppState; elements: readonly El[] }) {
  if (!api || !appState) return null;
  const ids = selectedIds(appState);
  const selected = elements.filter((e) => ids.includes(e.id));
  const first = selected[0];
  // Valeurs affichées : la sélection si elle existe, sinon les réglages de l'outil courant.
  const stroke = first ? first.strokeColor : appState.currentItemStrokeColor;
  const background = first ? first.backgroundColor : appState.currentItemBackgroundColor;
  const fillStyle = first ? first.fillStyle : appState.currentItemFillStyle;
  const strokeWidth = first ? first.strokeWidth : appState.currentItemStrokeWidth;
  const strokeStyle = first ? first.strokeStyle : appState.currentItemStrokeStyle;
  const roughness = first ? first.roughness : appState.currentItemRoughness;
  const opacity = first ? first.opacity : appState.currentItemOpacity;
  const fontFamily = first?.fontFamily ?? appState.currentItemFontFamily;
  const fontSize = first?.fontSize ?? appState.currentItemFontSize;
  const textAlign = first?.textAlign ?? appState.currentItemTextAlign;
  const isText = first?.type === "text" || (!first && appState.activeTool?.type === "text");

  // Applique un réglage aux éléments sélectionnés et aux prochains tracés.
  function apply(appPatch: AppState, elementPatch: (el: El) => AppState) {
    const next = elements.map((el) => {
      if (!ids.includes(el.id)) return el;
      return { ...el, ...elementPatch(el), version: el.version + 1, versionNonce: Math.floor(Math.random() * 2 ** 31) };
    });
    api!.updateScene({ elements: next as never, appState: appPatch as never });
  }

  const pick = (key: string, value: unknown) => apply({ [`currentItem${key}`]: value }, () => ({ [key.charAt(0).toLowerCase() + key.slice(1)]: value }));
  const btn = (on: boolean) => ({ "aria-pressed": on }) as const;

  return (
    <div className="wb-style-panel" role="region" aria-label="Style">
      <div className="wb-grid">
        {COLORS.map((c) => (
          <button key={c} type="button" className="wb-sw" title={c} aria-label={`Couleur ${c}`} {...btn(stroke === c)} style={{ background: c }} onClick={() => pick("StrokeColor", c)} />
        ))}
      </div>
      <input type="range" min={0} max={100} value={opacity ?? 100} aria-label="Opacité" className="wb-range"
        onChange={(e) => apply({ currentItemOpacity: Number(e.target.value) }, () => ({ opacity: Number(e.target.value) }))} />

      <div className="wb-row">
        {FILLS.map((f) => {
          const on = f.id === "none" ? background === "transparent" : f.id === "semi" ? typeof background === "string" && background.endsWith("55") : f.id === "pattern" ? fillStyle === "cross-hatch" : fillStyle === "solid" && background !== "transparent" && !(typeof background === "string" && background.endsWith("55"));
          return (
            <button key={f.id} type="button" className="wb-opt" title={f.label} aria-label={f.label} {...btn(on)}
              onClick={() => {
                const bg = f.id === "none" ? "transparent" : f.id === "semi" ? `${stroke}55` : stroke;
                const fill = f.id === "pattern" ? "cross-hatch" : "solid";
                apply({ currentItemBackgroundColor: bg, currentItemFillStyle: fill }, () => ({ backgroundColor: bg, fillStyle: fill }));
              }}>
              <Fill id={f.id} />
            </button>
          );
        })}
      </div>

      <div className="wb-row">
        {DASHES.map((d) => (
          <button key={d.id} type="button" className="wb-opt" title={d.label} aria-label={d.label}
            {...btn(strokeStyle === d.strokeStyle && roughness === d.roughness && (d.id !== "dashed" || strokeStyle === "dashed") && (d.id !== "dotted" || strokeStyle === "dotted"))}
            onClick={() => apply({ currentItemStrokeStyle: d.strokeStyle, currentItemRoughness: d.roughness }, () => ({ strokeStyle: d.strokeStyle, roughness: d.roughness }))}>
            <Dash id={d.id} />
          </button>
        ))}
      </div>

      <div className="wb-row">
        {SIZES.map((s) => (
          <button key={s.id} type="button" className="wb-opt" aria-label={`Taille ${s.id}`} {...btn(isText ? fontSize === s.font : strokeWidth === s.stroke)}
            onClick={() => apply({ currentItemStrokeWidth: s.stroke, currentItemFontSize: s.font }, (el) => (el.type === "text" ? { fontSize: s.font } : { strokeWidth: s.stroke }))}>
            {s.id}
          </button>
        ))}
      </div>

      <div className="wb-label">Police</div>
      <div className="wb-row">
        {FONTS.map((f) => (
          <button key={f.id} type="button" className="wb-opt" title={f.label} aria-label={f.label} {...btn(fontFamily === f.family)}
            onClick={() => apply({ currentItemFontFamily: f.family }, (el) => (el.type === "text" ? { fontFamily: f.family } : {}))}>
            Aa
          </button>
        ))}
      </div>

      <div className="wb-row wb-row-3">
        {ALIGNS.map((a) => (
          <button key={a.id} type="button" className="wb-opt" title={a.label} aria-label={a.label} {...btn(textAlign === a.id)}
            onClick={() => apply({ currentItemTextAlign: a.id }, (el) => (el.type === "text" ? { textAlign: a.id } : {}))}>
            {a.id === "left" ? "⇤" : a.id === "center" ? "⇔" : "⇥"}
          </button>
        ))}
      </div>
    </div>
  );
}
