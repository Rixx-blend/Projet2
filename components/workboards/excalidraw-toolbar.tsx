"use client";

import { ArrowUpRight, Eraser, Hand, MousePointer2, Pencil, Square, Type } from "lucide-react";

export const TOOLS = [
  { type: "selection", label: "Sélection", icon: MousePointer2 },
  { type: "hand", label: "Main", icon: Hand },
  { type: "freedraw", label: "Crayon", icon: Pencil },
  { type: "eraser", label: "Gomme", icon: Eraser },
  { type: "arrow", label: "Flèche", icon: ArrowUpRight },
  { type: "text", label: "Texte", icon: Type },
  { type: "rectangle", label: "Rectangle", icon: Square },
] as const;

export function WorkboardToolbar({ active, onPick }: { active: string; onPick: (type: string) => void }) {
  return (
    <div className="wb-toolbar" role="toolbar" aria-label="Outils">
      {TOOLS.map(({ type, label, icon: Icon }) => (
        <button key={type} type="button" title={label} aria-label={label} aria-pressed={active === type} onClick={() => onPick(type)}>
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}
