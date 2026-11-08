

const Icon = {
  selection: MousePointer2, hand: Hand, freedraw: Pencil, eraser: Eraser, arrow: ArrowUpRight, text: Type, rectangle: Square,
} as const;
type IconName = keyof typeof Icon;

export const TOOLS: { type: IconName; label: string }[] = [
  { type: "selection", label: "Sélection" },
  { type: "hand", label: "Main" },
  { type: "freedraw", label: "Crayon" },
  { type: "eraser", label: "Gomme" },
  { type: "arrow", label: "Flèche" },
  { type: "text", label: "Texte" },
  { type: "rectangle", label: "Rectangle" },
];

export function WorkboardToolbar({ active, onPick }: { active: string; onPick: (type: string) => void }) {
  return (
    <div className="wb-toolbar" role="toolbar" aria-label="Outils">
      {TOOLS.map(({ type, label }) => {
        const Glyph = Icon[type];
        return (
        <button key={type} type="button" title={label} aria-label={label} aria-pressed={active === type} onClick={() => onPick(type)}>
          <Glyph className="size-4" />
        </button>
        );
      })}
    </div>
  );
}
