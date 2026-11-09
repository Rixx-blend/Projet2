"use client";

import { Check, X } from "lucide-react";
import { motion, type Transition } from "motion/react";

import { cn } from "@/lib/utils";

export type PlayfulTodoItem = {
  id: string;
  label: string;
  checked: boolean;
};

type PlayfulTodoListProps = {
  items: PlayfulTodoItem[];
  onToggle: (id: string, checked: boolean) => void;
  onRemove?: (id: string) => void;
  className?: string;
};

/** Tracé « coup de crayon » barré sur le libellé quand la case est cochée. */
const SCRIBBLE_PATH =
  "M 10 16.91 s 79.8 -11.36 98.1 -11.34 c 22.2 0.02 -47.82 14.25 -33.39 22.02 c 12.61 6.77 124.18 -27.98 133.31 -17.28 c 7.52 8.38 -26.8 20.02 4.61 22.05 c 24.55 1.93 113.37 -20.36 113.37 -20.36";

const getPathAnimate = (isChecked: boolean) => ({
  pathLength: isChecked ? 1 : 0,
  opacity: isChecked ? 1 : 0,
});

const getPathTransition = (isChecked: boolean): Transition => ({
  pathLength: { duration: 0.8, ease: "easeInOut" },
  opacity: {
    duration: 0.01,
    delay: isChecked ? 0 : 0.8,
  },
});

export function PlayfulTodoList({ items, onToggle, onRemove, className }: PlayfulTodoListProps) {
  return (
    <ul className={cn("space-y-0.5", className)}>
      {items.map((item) => (
        <li
          key={item.id}
          className="group flex items-center gap-3 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-white/[0.03]"
        >
          <button
            type="button"
            role="checkbox"
            aria-checked={item.checked}
            aria-label={item.label}
            onClick={() => onToggle(item.id, !item.checked)}
            className={cn(
              "grid size-[18px] shrink-0 place-items-center rounded-md border transition-colors duration-300",
              item.checked
                ? "border-accent bg-accent text-accent-ink"
                : "border-line-strong hover:border-accent",
            )}
          >
            <motion.span
              initial={false}
              animate={{ scale: item.checked ? 1 : 0, opacity: item.checked ? 1 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="grid place-items-center"
            >
              <Check className="size-3" strokeWidth={3} />
            </motion.span>
          </button>

          <span className="relative min-w-0 flex-1">
            <span
              className={cn(
                "relative inline-block max-w-full break-words text-[13px] transition-colors duration-300",
                item.checked ? "text-muted" : "text-ink",
              )}
            >
              {item.label}
              <motion.svg
                aria-hidden="true"
                viewBox="0 0 340 32"
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-x-0 top-1/2 z-20 h-[1.4em] w-full -translate-y-1/2 overflow-visible"
              >
                <motion.path
                  d={SCRIBBLE_PATH}
                  vectorEffect="non-scaling-stroke"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeMiterlimit={10}
                  fill="none"
                  initial={false}
                  animate={getPathAnimate(item.checked)}
                  transition={getPathTransition(item.checked)}
                  className="stroke-ink"
                />
              </motion.svg>
            </span>
          </span>

          {onRemove ? (
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              aria-label={`Supprimer ${item.label}`}
              className="grid size-6 shrink-0 place-items-center rounded-md text-muted opacity-0 transition hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
