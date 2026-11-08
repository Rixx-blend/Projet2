"use client";

import {
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  FolderOpen,
  LayoutDashboard,
  PanelsTopLeft,
  Settings as SettingsIcon,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { TabLink } from "@/components/layout/tabs-context";
import { useAppAuth } from "@/components/auth/app-auth";
import { useUpdater } from "@/lib/use-updater";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "orderboard.sidebar.collapsed";

export type NavEntry = {
  href: string;
  label: string;
  /** Libellé court pour la barre mobile. */
  short?: string;
  icon: LucideIcon;
};

/** Navigation principale, partagée avec la barre mobile. */
export const NAV: NavEntry[] = [
  { href: "/overview", label: "Vue d'ensemble", short: "Aperçu", icon: LayoutDashboard },
  { href: "/dashboard", label: "Commandes", icon: ClipboardList },
  { href: "/workboards", label: "Planches de travail", short: "Planches", icon: PanelsTopLeft },
  { href: "/calendar", label: "Planning", icon: CalendarDays },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/revenue", label: "Finances", icon: Wallet },
  { href: "/resources", label: "Ressources", icon: FolderOpen },
  { href: "/settings", label: "Paramètres", icon: SettingsIcon },
];

export function isNavActive(href: string, pathname: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname.startsWith("/orders/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({
  thisMonth,
  total,
  goal,
}: {
  thisMonth: number;
  total: number;
  goal: number;
}) {
  const pathname = usePathname();
  const { profile } = useAppAuth();
  const { state: updateState } = useUpdater();
  const updateReady = updateState?.status === "available" || updateState?.status === "ready";
  const [collapsed, setCollapsed] = useState(false);
  const [hoverOpen, setHoverOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const expanded = !collapsed || hoverOpen;

  // Préférence relue après le montage pour ne pas casser l'hydratation.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
      } catch {
        // Stockage indisponible : le panneau reste déployé.
      }
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  function toggle(next: boolean) {
    setCollapsed(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Préférence non mémorisée : sans gravité.
    }
  }

  const ratio = goal > 0 ? Math.min(100, (thisMonth / goal) * 100) : 0;

  return (
    <aside
      aria-label="Navigation principale"
      onMouseEnter={() => { if (collapsed) setHoverOpen(true); }}
      onMouseLeave={() => setHoverOpen(false)}
      className={cn(
        "hidden h-full shrink-0 flex-col border-r border-line bg-surface md:flex",
        ready ? "transition-[width] duration-200 ease-out" : "",
      )}
      style={{ width: expanded ? 240 : 68 }}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center gap-2.5 px-4",
          !expanded && "justify-center px-0",
        )}
      >
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-[14px] font-semibold text-accent-ink"
        >
          R
        </span>
        {expanded ? (
          <span className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight">
            Rixx <span className="text-muted">Studio</span>
          </span>
        ) : null}
        {expanded ? (
          <button
            type="button"
            onClick={() => toggle(true)}
            aria-label="Replier le panneau"
            className="grid size-7 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-white/5 hover:text-ink"
          >
            <ChevronsLeft className="size-4" />
          </button>
        ) : null}
      </div>

      {!expanded ? (
        <button
          type="button"
          onClick={() => toggle(false)}
          aria-label="Déployer le panneau"
          className="mx-auto mb-1 grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-white/5 hover:text-ink"
        >
          <ChevronsRight className="size-4" />
        </button>
      ) : null}

      {/* Navigation */}
      <nav className="mt-1 flex-1 space-y-0.5 overflow-y-auto px-3 pb-3 scrollbar-thin">
        {NAV.map((entry) => {
          const active = isNavActive(entry.href, pathname);
          const Icon = entry.icon;

          return (
            <TabLink
              key={entry.href}
              href={entry.href}
              title={entry.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex h-10 items-center gap-3 rounded-[10px] px-3 text-[13px] font-medium transition-colors",
                active
                  ? "bg-panel-2 text-ink"
                  : "text-ink-soft hover:bg-white/[0.04] hover:text-ink",
                !expanded && "justify-center px-0",
              )}
            >
              {active ? (
                <span
                  aria-hidden
                  className="absolute -left-3 top-2 h-6 w-[2px] rounded-r-full bg-accent"
                />
              ) : null}
              <Icon
                className={cn(
                  "size-[18px] shrink-0 transition-colors",
                  active ? "text-accent-strong" : "text-muted group-hover:text-ink-soft",
                )}
                strokeWidth={1.75}
              />
              {expanded ? <span className="truncate">{entry.label}</span> : null}
            </TabLink>
          );
        })}
      </nav>

      {updateReady && expanded ? (
        <TabLink
          href="/settings#mises-a-jour"
          title="Mises à jour"
          className="mx-3 mb-3 flex items-center gap-2 rounded-lg border border-line-strong bg-panel-2 px-3 py-2 text-[12px] font-medium text-ink transition-colors hover:bg-line"
        >
          <span className="size-2 shrink-0 rounded-full bg-accent" aria-hidden />
          Mise à jour {updateState?.version} disponible
        </TabLink>
      ) : null}

      {/* Compte */}
      <TabLink
        href="/settings"
        title="Paramètres"
        className={cn(
          "flex shrink-0 items-center gap-3 border-t border-line px-4 py-3 transition-colors hover:bg-white/[0.03]",
          !expanded && "justify-center px-0",
        )}
      >
        {profile.picture ? (
          <img
            src={profile.picture}
            alt=""
            referrerPolicy="no-referrer"
            className="size-8 shrink-0 rounded-full object-cover ring-1 ring-inset ring-white/10"
          />
        ) : (
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent/20 text-[12px] font-semibold text-accent-strong ring-1 ring-inset ring-accent/30">
            {(profile.name || "G").trim().charAt(0).toUpperCase()}
          </span>
        )}
        {expanded ? (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">{profile.name}</span>
            <span className="block truncate text-[11px] text-muted">{profile.email || "Compte Google"}</span>
          </span>
        ) : null}
      </TabLink>
    </aside>
  );
}

