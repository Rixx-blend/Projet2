"use client";

import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  addChecklistAction,
  addChecklistItemAction,
  deleteChecklistAction,
  deleteChecklistItemAction,
  toggleChecklistItemAction,
} from "@/actions/checklists";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { ChecklistWithItems } from "@/types/database";

export function ChecklistsPanel({
  orderId,
  checklists,
}: {
  orderId: string;
  checklists: ChecklistWithItems[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newChecklist, setNewChecklist] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error ?? "Action impossible.");
      router.refresh();
    });
  }

  const total = checklists.reduce((sum, list) => sum + list.items.length, 0);
  const done = checklists.reduce(
    (sum, list) => sum + list.items.filter((item) => item.done).length,
    0,
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 text-xs text-muted">
        <span>
          {done}/{total} tâche{total > 1 ? "s" : ""} terminée{done > 1 ? "s" : ""}
        </span>
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
      </div>

      {error ? (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[11px] text-danger">
          {error}
        </p>
      ) : null}

      {checklists.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-xs text-muted">
          Aucune checklist pour l’instant.
        </p>
      ) : null}

      {checklists.map((checklist) => (
        <section
          key={checklist.id}
          className="rounded-xl border border-line bg-panel-2/50 p-2.5"
        >
          <header className="mb-2 flex items-center justify-between gap-2">
            <h3 className="truncate text-xs font-semibold text-ink-soft">
              {checklist.title}
            </h3>
            <button
              type="button"
              onClick={() =>
                window.confirm(`Supprimer la checklist « ${checklist.title} » ?`) &&
                run(() => deleteChecklistAction(checklist.id, orderId))
              }
              aria-label="Supprimer la checklist"
              className="rounded p-1 text-muted hover:bg-danger/10 hover:text-danger"
            >
              <Trash2 className="size-3.5" />
            </button>
          </header>

          <ul className="space-y-0.5">
            {checklist.items.map((item) => (
              <li key={item.id} className="group flex items-start gap-2 rounded-md px-1 py-1 hover:bg-white/5">
                <button
                  type="button"
                  onClick={() =>
                    run(() => toggleChecklistItemAction(item.id, !item.done, orderId))
                  }
                  aria-label={item.done ? "Marquer comme à faire" : "Marquer comme fait"}
                  className={cn(
                    "mt-0.5 grid size-4 shrink-0 place-items-center rounded border transition-colors",
                    item.done
                      ? "border-success/60 bg-success/20 text-success"
                      : "border-line-strong text-transparent hover:border-accent/60",
                  )}
                >
                  <Check className="size-3" />
                </button>
                <span
                  className={cn(
                    "flex-1 text-[12px] leading-snug",
                    item.done ? "text-muted line-through" : "text-ink-soft",
                  )}
                >
                  {item.text}
                </span>
                <button
                  type="button"
                  onClick={() => run(() => deleteChecklistItemAction(item.id, orderId))}
                  aria-label="Supprimer la tâche"
                  className="rounded p-0.5 text-transparent transition-colors group-hover:text-muted hover:!text-danger"
                >
                  <Trash2 className="size-3" />
                </button>
              </li>
            ))}
          </ul>

          <form
            className="mt-2 flex items-center gap-1.5"
            onSubmit={(event) => {
              event.preventDefault();
              const text = drafts[checklist.id] ?? "";
              if (!text.trim()) return;
              setDrafts((previous) => ({ ...previous, [checklist.id]: "" }));
              run(() => addChecklistItemAction(checklist.id, text, orderId));
            }}
          >
            <Input
              value={drafts[checklist.id] ?? ""}
              onChange={(event) =>
                setDrafts((previous) => ({
                  ...previous,
                  [checklist.id]: event.target.value,
                }))
              }
              placeholder="Ajouter une tâche…"
              className="h-8 text-[12px]"
              maxLength={300}
            />
            <Button type="submit" size="sm" variant="secondary" className="h-8 px-2">
              <Plus className="size-3.5" />
            </Button>
          </form>
        </section>
      ))}

      <form
        className="flex items-center gap-1.5 border-t border-line pt-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!newChecklist.trim()) return;
          const title = newChecklist;
          setNewChecklist("");
          run(() => addChecklistAction(orderId, title));
        }}
      >
        <Input
          value={newChecklist}
          onChange={(event) => setNewChecklist(event.target.value)}
          placeholder="Nouvelle checklist…"
          className="h-8 text-[12px]"
          maxLength={120}
        />
        <Button type="submit" size="sm" variant="secondary" className="h-8 px-2">
          <Plus className="size-3.5" />
        </Button>
      </form>
    </div>
  );
}
