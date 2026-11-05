"use client";

import {
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  FolderOpen,
  HardDrive,
  Inbox,
  LayoutDashboard,
  Settings as SettingsIcon,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { setMonthlyGoalAction } from "@/actions/settings";
import { TabLink } from "@/components/layout/tabs-context";
import { useUpdater } from "@/lib/use-updater";
import { cn, formatCurrency } from "@/lib/utils";

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
  { href: "/calendar", label: "Planning", icon: CalendarDays },
  { href: "/demands", label: "Messages", icon: Inbox },
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
  newInbox = 0,
}: {
  thisMonth: number;
  total: number;
  goal: number;
  newInbox?: number;
}) {
  const pathname = usePathname();
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
          className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-brand-gradient text-[15px] font-bold text-white shadow-glow"
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
          const badge = entry.href === "/demands" ? newInbox : 0;

          return (
            <TabLink
              key={entry.href}
              href={entry.href}
              title={
                entry.label +
                (badge > 0 ? ` (${badge} non lue${badge > 1 ? "s" : ""})` : "")
              }
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex h-10 items-center gap-3 rounded-[10px] px-3 text-[13px] font-medium transition-colors",
                active
                  ? "bg-accent/12 text-ink"
                  : "text-ink-soft hover:bg-white/[0.04] hover:text-ink",
                !expanded && "justify-center px-0",
              )}
            >
              {active ? (
                <span
                  aria-hidden
                  className="absolute -left-3 top-2 h-6 w-[3px] rounded-r-full bg-brand-gradient"
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
              {badge > 0 ? (
                <span
                  className={cn(
                    "ml-auto grid min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[10px] font-semibold leading-5 text-accent-ink",
                    !expanded &&
                      "absolute right-1.5 top-1 ml-0 min-w-4 px-1 text-[9px] leading-4",
                  )}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              ) : null}
            </TabLink>
          );
        })}
      </nav>

      {/* Revenus du mois et objectif */}
      {!expanded ? (
        <button
          type="button"
          onClick={() => toggle(false)}
          title={`Encaissé ce mois : ${formatCurrency(thisMonth)}${
            goal > 0 ? ` / ${formatCurrency(goal)}` : ""
          }`}
          className="mx-auto mb-2 grid size-11 place-items-center rounded-xl border border-line bg-panel transition-colors hover:border-line-strong"
        >
          <span className="relative grid size-8 place-items-center">
            <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden>
              <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-line" />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${(ratio / 100) * 94.2} 94.2`}
                className={ratio >= 100 ? "text-success" : "text-accent"}
              />
            </svg>
            <span className="text-[9px] font-semibold text-ink-soft">
              {goal > 0 ? `${Math.round(ratio)}%` : "—"}
            </span>
          </span>
        </button>
      ) : (
        <RevenueSummary key={goal} thisMonth={thisMonth} total={total} goal={goal} ratio={ratio} />
      )}

      {updateReady && expanded ? (
        <TabLink
          href="/settings#mises-a-jour"
          title="Mises à jour"
          className="mx-3 mb-3 flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-[12px] font-medium text-ink transition-colors hover:bg-accent/15"
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
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-full bg-accent/20 text-[12px] font-semibold text-accent-strong ring-1 ring-inset ring-accent/30"
        >
          R
        </span>
        {!collapsed ? (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">Rixx Studio</span>
            <span className="flex items-center gap-1.5 text-[11px] text-muted">
              <HardDrive className="size-3" />
              Données locales
            </span>
          </span>
        ) : null}
      </TabLink>
    </aside>
  );
}

function RevenueSummary({
  thisMonth,
  total,
  goal,
  ratio,
}: {
  thisMonth: number;
  total: number;
  goal: number;
  ratio: number;
}) {
  const [value, setValue] = useState(goal > 0 ? String(goal) : "");
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  function save() {
    const parsed = Number(value.replace(",", "."));
    startTransition(async () => {
      const result = await setMonthlyGoalAction(Number.isFinite(parsed) ? parsed : 0);
      setNotice(result.ok ? "Objectif enregistré" : (result.error ?? "Erreur"));
    });
  }

  return (
    <div className="mx-3 mb-3 rounded-xl border border-line bg-panel p-3">
      <p className="text-[11px] font-medium text-muted">Encaissé ce mois</p>
      <p className="mt-0.5 text-[18px] font-semibold tabular-nums tracking-tight">
        {formatCurrency(thisMonth)}
      </p>

      <div
        className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-label="Progression vers l'objectif mensuel"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio)}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            ratio >= 100 ? "bg-success" : "bg-brand-gradient",
          )}
          style={{ width: `${Math.max(2, ratio)}%` }}
        />
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted">
        <span>Objectif</span>
        <span>{goal > 0 ? formatCurrency(goal) : "non défini"}</span>
      </div>

      <form
        className="mt-2.5 flex items-center gap-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          inputMode="decimal"
          placeholder="Objectif en €"
          aria-label="Objectif mensuel"
          className="h-8 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 text-[12px] text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
        <button
          type="submit"
          disabled={pending}
          className="h-8 shrink-0 rounded-lg border border-line px-3 text-[12px] font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink disabled:opacity-60"
        >
          OK
        </button>
      </form>

      {notice ? (
        <p role="status" className="mt-1.5 text-[11px] text-success">
          {notice}
        </p>
      ) : null}

      <p className="mt-2.5 border-t border-line pt-2 text-[11px] text-muted">
        Total encaissé ·{" "}
        <span className="font-medium text-ink-soft tabular-nums">{formatCurrency(total)}</span>
      </p>
    </div>
  );
}
