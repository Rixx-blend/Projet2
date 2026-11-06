"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { GlobalSearch, type SearchEntry } from "@/components/layout/global-search";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { OrderFormDialog } from "@/components/orders/order-form-dialog";
import { Button } from "@/components/ui/button";
import type { AppNotification } from "@/lib/notifications";
import type { Client } from "@/types/database";

/** Barre supérieure : recherche globale, notifications et action principale. */
export function AppHeader({
  notifications,
  emailReady,
  searchEntries,
  clients,
}: {
  notifications: AppNotification[];
  emailReady: boolean;
  searchEntries: SearchEntry[];
  clients: Client[];
}) {
  const [createOpen, setCreateOpen] = useState(false);


  return (
    <>
    <header className="z-30 shrink-0 border-b border-line bg-bg/90 backdrop-blur">
      <div className="flex h-14 w-full items-center gap-3 px-4 sm:px-6">
        {/* Logo visible uniquement quand la sidebar est masquée (mobile) */}
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-[14px] font-semibold text-accent-ink md:hidden"
        >
          R
        </span>

        <div className="flex min-w-0 flex-1 justify-center lg:px-6">
          <GlobalSearch entries={searchEntries} />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <NotificationBell notifications={notifications} emailReady={emailReady} />
          <Button
            onClick={() => setCreateOpen(true)}
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
    <OrderFormDialog open={createOpen} onOpenChange={setCreateOpen} clients={clients} />
    </>
  );
}
