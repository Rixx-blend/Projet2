"use client";

import { ChevronRight, Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { NAV, isNavActive } from "@/components/layout/app-sidebar";
import { GlobalSearch, type SearchEntry } from "@/components/layout/global-search";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Button } from "@/components/ui/button";
import type { AppNotification } from "@/lib/notifications";
import type { Client } from "@/types/database";

/** Barre supérieure : fil d'Ariane, recherche globale, notifications, action principale. */
export function AppHeader({
  notifications,
  emailReady,
  searchEntries,
  clients: _clients,
}: {
  notifications: AppNotification[];
  emailReady: boolean;
  searchEntries: SearchEntry[];
  clients: Client[];
}) {
  const pathname = usePathname();
  const router = useRouter();

  const section = NAV.find((entry) => isNavActive(entry.href, pathname));
  const isDetail = pathname.startsWith("/orders/");

  return (
    <>
    <header className="z-30 shrink-0 border-b border-line bg-bg/90 backdrop-blur">
      <div className="flex h-14 w-full items-center gap-3 px-4 sm:px-6">
        {/* Logo visible uniquement quand la sidebar est masquée (mobile) */}
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-brand-gradient text-[15px] font-bold text-white md:hidden"
        >
          R
        </span>

        <nav aria-label="Fil d'Ariane" className="hidden min-w-0 items-center gap-1.5 text-[13px] lg:flex">
          <span className="text-muted">Rixx Studio</span>
          <ChevronRight className="size-3.5 text-muted/60" aria-hidden />
          <span className={isDetail ? "text-muted" : "font-medium text-ink"}>
            {section?.label ?? "Page"}
          </span>
          {isDetail ? (
            <>
              <ChevronRight className="size-3.5 text-muted/60" aria-hidden />
              <span className="font-medium text-ink">Commande</span>
            </>
          ) : null}
        </nav>

        <div className="flex min-w-0 flex-1 justify-center lg:px-6">
          <GlobalSearch entries={searchEntries} />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <NotificationBell notifications={notifications} emailReady={emailReady} />
          <Button
            onClick={() => router.push("/orders/new")}
            size="sm"
            className="h-9 px-3.5 text-[13px]"
            aria-label="Nouvelle commande"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Nouvelle commande</span>
          </Button>
        </div>
      </div>
    </header>

    </>
  );
}
