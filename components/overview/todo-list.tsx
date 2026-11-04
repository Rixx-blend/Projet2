"use client";

import { Check } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";

import { toggleChecklistItemAction } from "@/actions/checklists";
import { TabLink } from "@/components/layout/tabs-context";
import { cn } from "@/lib/utils";

export type TodoItem = {
  id: string;
  text: string;
  orderId: string;
  orderTitle: string;
};

/** Tâches des listes de contrôle des commandes actives, cochables directement. */
export function TodoList({ items }: { items: TodoItem[] }) {
  const [done, setDone] = useOptimistic<string[], string>([], (state, id) => [...state, id]);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function complete(item: TodoItem) {
    setError(null);
    startTransition(async () => {
      setDone(item.id);
      const result = await toggleChecklistItemAction(item.id, true, item.orderId);
      if (!result.ok) setError(result.error ?? "Impossible de valider la tâche.");
    });
  }

  return (
    <div>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const checked = done.includes(item.id);
          return (
            <li
              key={item.id}
              className="group flex items-center gap-3 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-white/[0.03]"
            >
              <button
                type="button"
                onClick={() => complete(item)}
                disabled={checked}
                aria-label={`Marquer « ${item.text} » comme terminée`}
                className={cn(
                  "grid size-[18px] shrink-0 place-items-center rounded-md border transition-all",
                  checked
                    ? "border-success bg-success text-bg"
                    : "border-line-strong hover:border-accent",
                )}
              >
                {checked ? <Check className="size-3" strokeWidth={3} /> : null}
              </button>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block truncate text-[13px]",
                    checked && "text-muted line-through",
                  )}
                >
                  {item.text}
                </span>
                <TabLink
                  href={`/orders/${item.orderId}`}
                  title={item.orderTitle}
                  className="block truncate text-[11px] text-muted hover:text-ink-soft"
                >
                  {item.orderTitle}
                </TabLink>
              </span>
            </li>
          );
        })}
      </ul>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
