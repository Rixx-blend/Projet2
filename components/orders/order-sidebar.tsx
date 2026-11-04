"use client";

import {
  CalendarClock,
  Clock,
  Files,
  ListChecks,
  Mail,
  MessageCircle,
  Pencil,
  Repeat2,
  Trash2,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteOrderAction } from "@/actions/orders";
import { ChecklistsPanel } from "@/components/orders/checklists-panel";
import { FilesPanel } from "@/components/orders/files-panel";
import {
  DeadlineChip,
  PaymentBadge,
  PriorityLabel,
  StatusBadge,
} from "@/components/orders/order-badges";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  initials,
  remainingAmount,
} from "@/lib/utils";
import type {
  ChecklistWithItems,
  OrderFile,
  OrderWithClient,
} from "@/types/database";

type Tab = "infos" | "fichiers" | "checklists";

export function OrderSidebar({
  order,
  files,
  checklists,
  onChanged,
  onEdit,
  onClose,
}: {
  order: OrderWithClient;
  files: OrderFile[];
  checklists: ChecklistWithItems[];
  onChanged: () => void;
  onEdit: () => void;
  onClose?: () => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("infos");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const revisionsLeft = Math.max(
    order.revisions_included - order.revisions_used,
    0,
  );
  const revisionRatio =
    order.revisions_included > 0
      ? Math.min(100, (order.revisions_used / order.revisions_included) * 100)
      : 0;

  function handleDelete() {
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteOrderAction(order.id);
      if (!result.ok) {
        setDeleteError(result.error ?? "Suppression impossible.");
        return;
      }
      router.push("/dashboard");
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-line px-3 py-2">
        {(
          [
            { id: "infos", label: "Infos", icon: User },
            { id: "fichiers", label: `Fichiers`, icon: Files },
            { id: "checklists", label: "Checklists", icon: ListChecks },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={
              tab === item.id
                ? "flex flex-1 items-center justify-center gap-1.5 rounded-md bg-white/5 px-2 py-1.5 text-[11px] font-medium text-ink"
                : "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium text-muted transition-colors hover:text-ink"
            }
          >
            <item.icon className="size-3.5" />
            {item.label}
            {item.id === "fichiers" && files.length > 0 ? (
              <span className="rounded-full bg-white/10 px-1 text-[9px] text-ink-soft">
                {files.length}
              </span>
            ) : null}
          </button>
        ))}
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="ml-1 rounded-md px-2 py-1.5 text-[11px] text-muted hover:text-ink lg:hidden"
          >
            Fermer
          </button>
        ) : null}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-3.5 py-3.5 scrollbar-thin">
        {tab === "infos" ? (
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge status={order.status} />
              <PaymentBadge status={order.payment_status} />
              <PriorityLabel priority={order.priority} />
            </div>

            <section className="rounded-xl border border-line bg-panel-2/50 p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
                Client
              </p>
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-panel text-[11px] font-semibold text-ink-soft">
                  {initials(order.client?.name ?? "?")}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {order.client?.name ?? "Sans client"}
                  </p>
                  <p className="truncate text-[11px] text-muted">
                    {order.client?.email ?? "Pas d’e-mail"}
                  </p>
                </div>
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {order.client?.email ? (
                  <a
                    href={`mailto:${order.client.email}?subject=${encodeURIComponent(
                      `À propos de : ${order.title}`,
                    )}`}
                    className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] text-ink-soft hover:border-line-strong hover:text-ink"
                  >
                    <Mail className="size-3" />
                    E-mail
                  </a>
                ) : null}
                {order.client?.discord ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] text-ink-soft">
                    <MessageCircle className="size-3" />
                    {order.client.discord}
                  </span>
                ) : null}
                {order.client?.other_contact ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] text-ink-soft">
                    {order.client.other_contact}
                  </span>
                ) : null}
              </div>
            </section>

            <section className="grid grid-cols-2 gap-2">
              <InfoCell label="Prix total" value={formatCurrency(order.total_price)} />
              <InfoCell label="Acompte" value={formatCurrency(order.deposit)} />
              <InfoCell
                label="Reste à payer"
                value={formatCurrency(remainingAmount(order))}
                accent={remainingAmount(order) > 0}
              />
              <InfoCell
                label="Révisions"
                value={`${order.revisions_used}/${order.revisions_included}`}
              />
            </section>

            <section className="rounded-xl border border-line bg-panel-2/50 p-3">
              <div className="flex items-center justify-between text-[11px] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Repeat2 className="size-3" />
                  Révisions restantes
                </span>
                <span className="font-medium text-ink-soft">
                  {revisionsLeft} / {order.revisions_included}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                <div
                  className={
                    revisionRatio >= 100
                      ? "h-full rounded-full bg-danger/80"
                      : "h-full rounded-full bg-accent/80"
                  }
                  style={{ width: `${Math.min(100, revisionRatio)}%` }}
                />
              </div>
            </section>

            <section className="space-y-2 rounded-xl border border-line bg-panel-2/50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                Planning
              </p>
              <div className="flex items-center justify-between gap-2 text-[12px]">
                <span className="inline-flex items-center gap-1.5 text-muted">
                  <CalendarClock className="size-3.5" />
                  Deadline
                </span>
                <span className="text-right text-ink-soft">
                  {formatDateTime(order.deadline)}
                  <br />
                  <DeadlineChip deadline={order.deadline} status={order.status} />
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[12px]">
                <span className="inline-flex items-center gap-1.5 text-muted">
                  <Clock className="size-3.5" />
                  Temps passé
                </span>
                <span className="text-ink-soft">
                  {order.time_spent_minutes > 0
                    ? `${(order.time_spent_minutes / 60).toFixed(1)} h`
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[12px]">
                <span className="text-muted">Créée le</span>
                <span className="text-ink-soft">{formatDate(order.created_at)}</span>
              </div>
            </section>

            <section className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                {order.service_type}
              </p>
              <h2 className="text-sm font-medium leading-snug text-ink">
                {order.title}
              </h2>
              {order.description ? (
                <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-ink-soft">
                  {order.description}
                </p>
              ) : (
                <p className="text-[12px] text-muted">Pas de description.</p>
              )}
              {order.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1 pt-1">
                  {order.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-ink-soft"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </section>

            <div className="flex flex-col gap-2 border-t border-line pt-3">
              <Button variant="secondary" onClick={onEdit}>
                <Pencil className="size-3.5" />
                Modifier la commande
              </Button>
              <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="size-3.5" />
                Supprimer la commande
              </Button>
            </div>
          </>
        ) : null}

        {tab === "fichiers" ? (
          <FilesPanel
            orderId={order.id}
            files={files}
            onChanged={onChanged}
          />
        ) : null}

        {tab === "checklists" ? (
          <ChecklistsPanel orderId={order.id} checklists={checklists} />
        ) : null}
      </div>

      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Supprimer la commande ?"
        description="Le board, les fichiers et les checklists seront aussi supprimés."
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">
            « {order.title} » sera définitivement supprimée. Cette action est
            irréversible.
          </p>
          {deleteError ? (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
              {deleteError}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Annuler
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={pending}>
              {pending ? <Spinner /> : <Trash2 className="size-3.5" />}
              Supprimer
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function InfoCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-line bg-panel-2/50 px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
      <p
        className={
          accent
            ? "mt-0.5 text-[13px] font-semibold text-warning"
            : "mt-0.5 text-[13px] font-semibold text-ink"
        }
      >
        {value}
      </p>
    </div>
  );
}
