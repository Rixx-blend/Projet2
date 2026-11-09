"use client";

import {
  CalendarDays,
  ClipboardList,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Settings,
  StickyNote,
  User,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef } from "react";

import { useTabs, type AppTab } from "@/components/layout/tabs-context";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  "Vue d'ensemble": LayoutDashboard,
  Commandes: ClipboardList,
  Commande: FileText,
  Clients: Users,
  Client: User,
  Planning: CalendarDays,
  Finances: Wallet,
  Ressources: FolderOpen,
  Notes: StickyNote,
  Paramètres: Settings,
};

function iconFor(tab: AppTab): LucideIcon {
  return ICONS[tab.section] ?? FileText;
}

export function TabBar() {
  const { tabs: allTabs, activeHref, openTab, closeTab } = useTabs();
  const tabs = allTabs.filter((tab) => /^\/workboards\/[^/]+$/.test(tab.href));
  const scrollRef = useRef<HTMLDivElement>(null);
  if (tabs.length === 0) return null;

  // L'onglet actif reste visible quand on en ouvre plusieurs.
  useEffect(() => {
    scrollRef.current
      ?.querySelector<HTMLElement>(`[data-tab="${CSS.escape(activeHref)}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeHref, tabs.length]);

  return (
    <div className="flex h-10 shrink-0 items-center gap-1 border-b border-line bg-surface px-3 sm:px-4">
      <div
        ref={scrollRef}
        className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scrollbar-none"
        role="tablist"
        aria-label="Planches ouvertes"
      >
        {tabs.map((tab) => {
          const Icon = iconFor(tab);
          const active = tab.href === activeHref;

          return (
            <div
              key={tab.href}
              data-tab={tab.href}
              role="tab"
              aria-selected={active}
              className={cn(
                "group flex h-7 max-w-[230px] shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] transition-colors",
                active
                  ? "border-line bg-panel text-ink"
                  : "border-transparent text-muted hover:bg-white/5 hover:text-ink-soft",
              )}
            >
              <button
                type="button"
                onClick={() => openTab(tab.href, tab.title)}
                onAuxClick={(event) => {
                  if (event.button === 1 && tab.closable) closeTab(tab.href);
                }}
                className="flex min-w-0 flex-1 items-center gap-1.5"
                title={tab.title}
              >
                <Icon
                  className={cn(
                    "size-3.5 shrink-0",
                    active ? "text-accent" : "text-muted",
                  )}
                />
                <span className="truncate">{tab.title}</span>
              </button>

              {tab.closable ? (
                <button
                  type="button"
                  onClick={() => closeTab(tab.href)}
                  aria-label={`Fermer ${tab.title}`}
                  className="rounded p-0.5 text-muted opacity-60 transition-colors hover:bg-white/10 hover:text-ink group-hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
