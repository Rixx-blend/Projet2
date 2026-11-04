"use client";

import {
  ArrowLeft,
  Check,
  CloudOff,
  Loader2,
  PanelRight,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { TabLink } from "@/components/layout/tabs-context";
import { OrderFormDialog } from "@/components/orders/order-form-dialog";
import { OrderSidebar } from "@/components/orders/order-sidebar";
import { StatusBadge } from "@/components/orders/order-badges";
import type { SaveState } from "@/components/board/tldraw-board";
import { Spinner } from "@/components/ui/spinner";
import type {
  ChecklistWithItems,
  Client,
  OrderBoard,
  OrderFile,
  OrderWithClient,
} from "@/types/database";

const TldrawBoard = dynamic(
  () => import("@/components/board/tldraw-board").then((mod) => mod.TldrawBoard),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 grid place-items-center bg-bg">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Spinner />
          Chargement du board…
        </div>
      </div>
    ),
  },
);

export function OrderWorkspace({
  order,
  board,
  boardNote,
  files,
  checklists,
  clients,
}: {
  order: OrderWithClient;
  board: OrderBoard | null;
  boardNote: string | null;
  files: OrderFile[];
  checklists: ChecklistWithItems[];
  clients: Client[];
}) {
  const router = useRouter();
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleError = useCallback((message: string) => {
    setNotice(message);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 7000);
    return () => clearTimeout(timer);
  }, [notice]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg">
      <header className="z-30 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-panel px-3">
        <TabLink
          href="/dashboard"
          title="Commandes"
          aria-label="Retour au Kanban"
          className="grid size-8 shrink-0 place-items-center rounded-lg border border-line text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
        >
          <ArrowLeft className="size-4" />
        </TabLink>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold text-ink">{order.title}</h1>
          <p className="truncate text-[11px] text-muted">
            {order.client?.name ?? "Sans client"} · {order.service_type}
          </p>
        </div>

        <div className="hidden sm:block">
          <StatusBadge status={order.status} />
        </div>

        <div className="ml-1 flex items-center gap-1.5 text-[11px] sm:ml-3">
          {saveState === "saving" ? (
            <>
              <Loader2 className="size-3.5 animate-spin text-muted" />
              <span className="hidden text-muted sm:inline">Enregistrement…</span>
            </>
          ) : null}
          {saveState === "saved" ? (
            <>
              <Check className="size-3.5 text-success" />
              <span className="hidden text-success/90 sm:inline">Enregistré</span>
            </>
          ) : null}
          {saveState === "error" ? (
            <>
              <CloudOff className="size-3.5 text-danger" />
              <span className="hidden text-danger sm:inline">Erreur de sauvegarde</span>
            </>
          ) : null}
          {saveState === "idle" ? (
            <span className="hidden text-muted sm:inline">Sauvegarde auto</span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="grid size-8 place-items-center rounded-lg border border-line text-ink-soft hover:border-line-strong hover:text-ink lg:hidden"
          aria-label="Ouvrir le panneau de la commande"
        >
          <PanelRight className="size-4" />
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          <TldrawBoard
            orderId={order.id}
            initialSnapshot={board?.content ?? null}
            boardNote={boardNote}
            onSaveStateChange={setSaveState}
            onFilesUploaded={refresh}
            onError={handleError}
          />
        </div>

        <aside className="hidden w-[344px] shrink-0 border-l border-line bg-panel lg:block">
          <OrderSidebar
            order={order}
            files={files}
            checklists={checklists}
            onChanged={refresh}
            onEdit={() => setEditOpen(true)}
          />
        </aside>

        {panelOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              aria-label="Fermer le panneau"
              onClick={() => setPanelOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <div className="absolute inset-y-0 right-0 flex w-[92%] max-w-[380px] flex-col border-l border-line bg-panel shadow-2xl">
              <OrderSidebar
                order={order}
                files={files}
                checklists={checklists}
                onChanged={refresh}
                onEdit={() => {
                  setPanelOpen(false);
                  setEditOpen(true);
                }}
                onClose={() => setPanelOpen(false)}
              />
            </div>
          </div>
        ) : null}
      </div>

      {notice ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4">
          <p
            role="status"
            className="pointer-events-auto max-w-md rounded-lg border border-line bg-panel/95 px-3 py-2 text-center text-[11px] text-ink-soft shadow-lg backdrop-blur"
          >
            {notice}
          </p>
        </div>
      ) : null}

      <OrderFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        clients={clients}
        order={order}
      />

    </div>
  );
}
