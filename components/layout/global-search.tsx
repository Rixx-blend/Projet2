"use client";

import { CornerDownLeft, FileText, Search, User } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useTabs } from "@/components/layout/tabs-context";
import { cn } from "@/lib/utils";
import { BorderBeamSearch } from "@/components/ui/border-beam-search";

export type SearchEntry = {
  id: string;
  kind: "commande" | "client";
  title: string;
  subtitle: string;
  href: string;
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Recherche globale (commandes + clients), ouverte avec Ctrl/Cmd + K. */
export function GlobalSearch({ entries }: { entries: SearchEntry[] }) {
  const { openTab } = useTabs();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const needle = normalize(query.trim());
    if (!needle) return [];
    return entries
      .filter((entry) => normalize(`${entry.title} ${entry.subtitle}`).includes(needle))
      .slice(0, 8);
  }, [entries, query]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, []);

  function choose(entry: SearchEntry) {
    openTab(entry.href, entry.title);
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  }

  const showPanel = open && query.trim().length > 0;

  return (
    <div ref={rootRef} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <BorderBeamSearch>
        <input
        ref={inputRef}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setCursor(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            inputRef.current?.blur();
          } else if (event.key === "ArrowDown") {
            event.preventDefault();
            setCursor((value) => Math.min(results.length - 1, value + 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setCursor((value) => Math.max(0, value - 1));
          } else if (event.key === "Enter" && results[cursor]) {
            event.preventDefault();
            choose(results[cursor]);
          }
        }}
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="global-search-results"
        aria-label="Recherche globale"
        placeholder="Rechercher une commande ou un client…"
        className="relative z-[1] h-10 w-full rounded-[11px] border-0 bg-panel pl-9 pr-14 text-[13px] text-ink placeholder:text-muted/80 focus:outline-none focus:ring-0"
        />
      </BorderBeamSearch>
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line px-1.5 py-0.5 text-[10px] text-muted sm:block">
        Ctrl K
      </kbd>

      {showPanel ? (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 animate-pop overflow-hidden rounded-xl border border-line bg-panel shadow-pop"
        >
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted">
              Aucun résultat pour « {query.trim()} ».
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto p-1.5 scrollbar-thin">
              {results.map((entry, index) => {
                const Icon = entry.kind === "client" ? User : FileText;
                return (
                  <li key={entry.id} role="option" aria-selected={index === cursor}>
                    <button
                      type="button"
                      onMouseEnter={() => setCursor(index)}
                      onClick={() => choose(entry)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                        index === cursor ? "bg-panel-2" : "",
                      )}
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent/12 text-accent-strong">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">{entry.title}</span>
                        <span className="block truncate text-[11px] text-muted">{entry.subtitle}</span>
                      </span>
                      {index === cursor ? (
                        <CornerDownLeft className="size-3.5 shrink-0 text-muted" />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
