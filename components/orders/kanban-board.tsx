"use client";

import {
  Banknote,
  CalendarClock,
  ExternalLink,
  GripVertical,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  Repeat2,
  Rows3,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { deleteOrderAction, updateOrderStatusAction } from "@/actions/orders";
import { TabLink } from "@/components/layout/tabs-context";
import { OrderFormDialog } from "@/components/orders/order-form-dialog";
import {
  CountdownBadge,
  PaymentBadge,
  PriorityLabel,
  StatusBadge,
} from "@/components/orders/order-badges";
import { Button } from "@/components/ui/button";
import { Dot } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/field";
import { ORDER_STATUSES, SERVICE_TYPES, paymentMeta, statusMeta } from "@/lib/constants";
import { deadlineState } from "@/lib/deadline";
import { cn, daysUntil, formatCurrency, formatDate } from "@/lib/utils";
import type {
  Client,
  OrderStatus,
  OrderWithClient,
} from "@/types/database";

type DateFilter = "all" | "late" | "week" | "month" | "none";
type SortKey = "created" | "deadline" | "price";

export function KanbanBoard({
  orders,
  clients,
}: {
  orders: OrderWithClient[];
  clients: Client[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"board" | "table">("board");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [sort, setSort] = useState<SortKey>("created");
  const [overrides, setOverrides] = useState<Record<string, OrderStatus>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<OrderStatus | null>(null);
  const [justDroppedId, setJustDroppedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [, startTransition] = useTransition();

  const serviceOptions = useMemo(
    () =>
      Array.from(
        new Set([...SERVICE_TYPES, ...orders.map((order) => order.service_type)]),
      ),
    [orders],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = orders.filter((order) => {
      const status = overrides[order.id] ?? order.status;
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (serviceFilter !== "all" && order.service_type !== serviceFilter) return false;
      if (dateFilter !== "all") {
        const days = daysUntil(order.deadline);
        if (dateFilter === "none") return days === null;
        if (days === null) return false;
        if (dateFilter === "late" && !(days < 0 && status !== "livre")) return false;
        if (dateFilter === "week" && !(days >= 0 && days <= 7)) return false;
        if (dateFilter === "month" && !(days >= 0 && days <= 31)) return false;
      }
      if (!term) return true;
      const haystack = [
        order.title,
        order.client?.name ?? "",
        order.service_type,
        order.description ?? "",
        order.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
    return list.sort((a, b) => {
      if (sort === "price") return Number(b.total_price) - Number(a.total_price);
      if (sort === "deadline") {
        if (!a.deadline) return b.deadline ? 1 : 0;
        if (!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
      }
      return b.created_at.localeCompare(a.created_at);
    });
  }, [orders, overrides, query, statusFilter, serviceFilter, dateFilter, sort]);

  const hasFilters =
    query.trim() !== "" ||
    statusFilter !== "all" ||
    serviceFilter !== "all" ||
    dateFilter !== "all";

  function resetFilters() {
    setQuery("");
    setStatusFilter("all");
    setServiceFilter("all");
    setDateFilter("all");
  }

  const statusOf = (order: OrderWithClient): OrderStatus =>
    overrides[order.id] ?? order.status;

  function changeStatus(orderId: string, status: OrderStatus) {
    setError(null);
    setOverrides((previous) => ({ ...previous, [orderId]: status }));

    startTransition(async () => {
      const result = await updateOrderStatusAction(orderId, status);
      if (!result.ok) {
        setError(result.error ?? "Changement de statut impossible.");
        setOverrides((previous) => {
          const next = { ...previous };
          delete next[orderId];
          return next;
        });
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <div className="surface-card flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Client, prestation, tag…"
            className="pl-9 pr-9"
            aria-label="Rechercher une commande"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Effacer la recherche"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-ink"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
          <Select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as OrderStatus | "all")}
            aria-label="Filtrer par statut"
          >
            <option value="all">Tous statuts</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </Select>
          <Select
            value={serviceFilter}
            onChange={(event) => setServiceFilter(event.target.value)}
            aria-label="Filtrer par type de prestation"
          >
            <option value="all">Prestations</option>
            {serviceOptions.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </Select>
          <Select
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value as DateFilter)}
            aria-label="Filtrer par échéance"
          >
            <option value="all">Échéances</option>
            <option value="late">En retard</option>
            <option value="week">Dans les 7 jours</option>
            <option value="month">Dans le mois</option>
            <option value="none">Sans échéance</option>
          </Select>
          <Select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            aria-label="Trier"
          >
            <option value="created">Tri : récentes</option>
            <option value="deadline">Tri : échéance</option>
            <option value="price">Tri : prix</option>
          </Select>
        </div>

        <div
          role="tablist"
          aria-label="Mode d'affichage"
          className="flex shrink-0 rounded-lg border border-line bg-surface p-0.5"
        >
          {(
            [
              { id: "board", label: "Kanban", icon: LayoutGrid },
              { id: "table", label: "Tableau", icon: Rows3 },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-medium transition-colors",
                view === id ? "bg-panel-2 text-ink" : "text-muted hover:text-ink-soft",
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-muted">
        <span>
          {filtered.length} commande{filtered.length > 1 ? "s" : ""}
          {hasFilters ? " (filtrées)" : ""}
        </span>
        {hasFilters ? (
          <button type="button" onClick={resetFilters} className="font-medium text-accent-strong hover:underline">
            Réinitialiser les filtres
          </button>
        ) : view === "board" ? (
          <span className="hidden md:block">Glisse une carte pour changer son statut</span>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger"
        >
          {error}
        </p>
      ) : null}

      {view === "table" ? (
        <OrdersTable
          orders={filtered}
          statusOf={statusOf}
          onStatusChange={changeStatus}
          onNew={() => setDialogOpen(true)}
          hasFilters={hasFilters}
        />
      ) : (
      <div className="-mx-4 mt-3 overflow-x-auto px-4 pb-4 scrollbar-thin sm:mx-0 sm:px-0">
        <div className="flex min-h-[520px] items-stretch gap-3">
          {ORDER_STATUSES.map((column) => {
            const columnOrders = filtered.filter(
              (order) => statusOf(order) === column.value,
            );

            return (
              <section
                key={column.value}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setOverColumn(column.value);
                }}
                onDragLeave={(event) => {
                  if (event.currentTarget.contains(event.relatedTarget as Node)) {
                    return;
                  }
                  setOverColumn((current) =>
                    current === column.value ? null : current,
                  );
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const orderId =
                    event.dataTransfer.getData("text/plain") || draggingId;
                  setOverColumn(null);
                  setDraggingId(null);
                  if (orderId) {
                    setJustDroppedId(orderId);
                    window.setTimeout(() => setJustDroppedId((current) => current === orderId ? null : current), 520);
                    changeStatus(orderId, column.value);
                  }
                }}
                className={cn(
                  "flex w-[272px] shrink-0 snap-start flex-col rounded-2xl border border-t-2 bg-surface/60 transition-colors",
                  column.column,
                  overColumn === column.value
                    ? "kanban-column-drop-target border-accent/60 bg-panel"
                    : "border-line",
                )}
              >
                <header className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Dot className={column.dot} />
                    <h2 className="text-xs font-semibold text-ink-soft">
                      {column.label}
                    </h2>
                  </div>
                  <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-muted">
                    {columnOrders.length}
                  </span>
                </header>

                <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
                  {columnOrders.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-[11px] text-muted">
                      Aucune commande
                    </p>
                  ) : null}

                  {columnOrders.map((order, index) => {
                    const payment = paymentMeta(order.payment_status);
                    const currentStatus = statusOf(order);
                    const accent = statusMeta(currentStatus);
                    const countdown = deadlineState(order.deadline, currentStatus);
                    return (
                      <article
                        key={order.id}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/plain", order.id);
                          event.dataTransfer.effectAllowed = "move";
                          const ghost = event.currentTarget.cloneNode(true) as HTMLElement;
                          ghost.style.width = `${event.currentTarget.getBoundingClientRect().width}px`;
                          ghost.style.position = "fixed";
                          ghost.style.top = "-1000px";
                          ghost.style.left = "-1000px";
                          ghost.style.transform = "rotate(2deg) scale(1.04)";
                          ghost.style.opacity = "0.98";
                          ghost.style.boxShadow = "0 24px 60px rgba(0,0,0,.55), 0 0 0 1px rgba(181,206,165,.35)";
                          ghost.style.borderColor = "#B5CEA5";
                          ghost.style.pointerEvents = "none";
                          document.body.appendChild(ghost);
                          event.dataTransfer.setDragImage(ghost, 28, 22);
                          window.setTimeout(() => ghost.remove(), 0);
                          setDraggingId(order.id);
                        }}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setOverColumn(null);
                        }}
                        className={cn(
                          "kanban-order-card group relative cursor-grab rounded-lg border bg-panel p-3 shadow-card transition-[transform,box-shadow,border-color,opacity] duration-200 ease-out hover:border-line-strong active:cursor-grabbing",
                          countdown.card,
                          draggingId === order.id && "kanban-order-card-dragging",
                          justDroppedId === order.id && "kanban-order-card-dropped",
                        )}
                        style={{ animationDelay: `${Math.min(index * 35, 280)}ms` }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <TabLink
                            href={`/orders/${order.id}`}
                            title={order.title}
                            className="line-clamp-2 min-w-0 flex-1 text-[13px] font-medium leading-snug text-ink hover:text-accent-strong"
                          >
                            {order.title}
                          </TabLink>
                          <div className="flex shrink-0 items-center gap-1">
                            <GripVertical className="mt-0.5 size-3.5 text-line-strong group-hover:text-muted" />
                            <OrderActions order={order} />
                          </div>
                        </div>

                        <div className="mt-2 flex min-w-0 items-center gap-2 text-[11px] text-muted">
                          {order.client?.avatar_url ? (
                            <img src={order.client.avatar_url} alt="" className="size-6 shrink-0 rounded-full object-cover" />
                          ) : (
                            <Avatar name={order.client?.name ?? "?"} size={24} />
                          )}
                          <span className="min-w-0 truncate font-medium text-ink-soft">{order.client?.name ?? "Sans client"}</span>
                          <span className="shrink-0 text-line-strong">·</span>
                          <span className="min-w-0 truncate">{order.service_type}</span>
                        </div>

                        {order.tags.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {order.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-ink-soft"
                              >
                                {tag}
                              </span>
                            ))}
                            {order.tags.length > 3 ? (
                              <span className="px-1 text-[10px] text-muted">
                                +{order.tags.length - 3}
                              </span>
                            ) : null}
                          </div>
                        ) : null}

                        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line/70 pt-2 text-[11px]">
                          <span className="inline-flex items-center gap-1 font-medium text-ink-soft">
                            <Banknote className="size-3 text-muted" />
                            {formatCurrency(order.total_price)}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                              payment.badge,
                            )}
                            title={`Paiement : ${payment.label}`}
                          >
                            <Dot className={payment.dot} />
                            {payment.short}
                          </span>
                        </div>

                        <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
                          <CountdownBadge
                            deadline={order.deadline}
                            status={currentStatus}
                          />
                          <span
                            className="inline-flex items-center gap-1 text-muted"
                            title="Révisions utilisées / incluses"
                          >
                            <Repeat2 className="size-3" />
                            {order.revisions_used}/{order.revisions_included}
                          </span>
                        </div>

                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <PriorityLabel priority={order.priority} />
                          <span className="text-muted">
                            <CalendarClock className="size-3" />
                          </span>
                        </div>

                        {/* Sur mobile : le glisser-déposer tactile n'existe pas. */}
                        <label className="mt-2 block sm:hidden">
                          <span className="sr-only">Changer le statut</span>
                          <select
                            value={statusOf(order)}
                            onChange={(event) =>
                              changeStatus(
                                order.id,
                                event.target.value as OrderStatus,
                              )
                            }
                            className="h-8 w-full rounded-md border border-line bg-panel-2 px-2 text-[11px] text-ink-soft"
                          >
                            {ORDER_STATUSES.map((status) => (
                              <option key={status.value} value={status.value}>
                                Déplacer vers : {status.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
      )}

      <OrderFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clients={clients}
      />
    </div>
  );
}

function OrderActions({ order }: { order: OrderWithClient }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="relative shrink-0" draggable={false}
      onClick={(event) => event.stopPropagation()}
      onDragStart={(event) => { event.preventDefault(); event.stopPropagation(); }}>
      <button type="button" aria-label={`Actions pour ${order.title}`} aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        className="grid size-8 place-items-center rounded-lg border border-line text-muted transition-colors hover:border-line-strong hover:bg-panel-2 hover:text-ink">
        <MoreHorizontal className="size-4" />
      </button>
      {open ? (
        <>
          <button type="button" aria-label="Fermer le menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 min-w-44 rounded-lg border border-line bg-panel p-1 shadow-pop">
            <button type="button" disabled={pending}
              onClick={() => {
                if (!window.confirm(`Supprimer définitivement la commande « ${order.title} » ? Le board, les fichiers et les checklists seront également supprimés.`)) return;
                startTransition(async () => {
                  const result = await deleteOrderAction(order.id);
                  if (!result.ok) {
                    window.alert(result.error || "Suppression impossible.");
                    return;
                  }
                  setOpen(false);
                  router.refresh();
                });
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-danger transition-colors hover:bg-danger/10 disabled:opacity-50">
              <Trash2 className="size-3.5" /> {pending ? "Suppression…" : "Supprimer la commande"}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function OrdersTable({
  orders,
  statusOf,
  onStatusChange,
  onNew,
  hasFilters,
}: {
  orders: OrderWithClient[];
  statusOf: (order: OrderWithClient) => OrderStatus;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  onNew: () => void;
  hasFilters: boolean;
}) {
  if (orders.length === 0) {
    return (
      <EmptyState
        className="mt-3"
        icon={Search}
        title={hasFilters ? "Aucune commande ne correspond" : "Aucune commande"}
        description={
          hasFilters
            ? "Modifie ou réinitialise les filtres pour retrouver tes commandes."
            : "Crée ta première commande pour la suivre ici."
        }
        action={
          hasFilters ? undefined : (
            <Button onClick={onNew}>
              <Plus className="size-4" />
              Nouvelle commande
            </Button>
          )
        }
      />
    );
  }

  return (
    <div className="surface-card mt-3 overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[860px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-line bg-surface/60 text-[11px] uppercase tracking-wide text-muted">
              <th scope="col" className="px-4 py-2.5 font-medium">Client</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Prestation</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Prix</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Statut</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Échéance</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Paiement</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const status = statusOf(order);
              return (
                <tr
                  key={order.id}
                  className="border-b border-line/60 transition-colors last:border-0 hover:bg-panel-2/50"
                >
                  <td className="px-4 py-3">
                    <TabLink
                      href={`/orders/${order.id}`}
                      title={order.title}
                      className="flex items-center gap-2.5"
                    >
                      {order.client?.avatar_url ? <img src={order.client.avatar_url} alt="" className="size-7 shrink-0 rounded-full object-cover" /> : <Avatar name={order.client?.name ?? order.title} size={28} />}
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {order.client?.name ?? "Sans client"}
                        </span>
                        <span className="block max-w-[220px] truncate text-[11px] text-muted">
                          {order.title}
                        </span>
                      </span>
                    </TabLink>
                  </td>
                  <td className="px-3 py-3 text-ink-soft">{order.service_type}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatCurrency(order.total_price)}
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={status} />
                  </td>
                  <td className="px-3 py-3">
                    <span className="block text-[12px] text-ink-soft">
                      {order.deadline ? formatDate(order.deadline) : "—"}
                    </span>
                    {order.deadline ? (
                      <CountdownBadge deadline={order.deadline} status={status} compact />
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <PaymentBadge status={order.payment_status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <label className="sr-only" htmlFor={`status-${order.id}`}>
                        Changer le statut
                      </label>
                      <select
                        id={`status-${order.id}`}
                        value={status}
                        onChange={(event) =>
                          onStatusChange(order.id, event.target.value as OrderStatus)
                        }
                        className="h-8 rounded-lg border border-line bg-surface px-2 text-[12px] text-ink-soft transition-colors hover:border-line-strong focus:border-accent focus:outline-none"
                      >
                        {ORDER_STATUSES.map((entry) => (
                          <option key={entry.value} value={entry.value}>
                            {entry.label}
                          </option>
                        ))}
                      </select>
                      <TabLink
                        href={`/orders/${order.id}`}
                        title={order.title}
                        aria-label={`Ouvrir ${order.title}`}
                        className="grid size-8 place-items-center rounded-lg border border-line text-muted transition-colors hover:border-line-strong hover:text-ink"
                      >
                        <ExternalLink className="size-3.5" />
                      </TabLink>
                      <OrderActions order={order} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
