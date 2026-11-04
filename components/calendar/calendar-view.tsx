"use client";

import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock,
  List,
  Rows3,
  Sun,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { setOrderDeadlineAction } from "@/actions/orders";
import { TabLink } from "@/components/layout/tabs-context";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { statusMeta } from "@/lib/constants";
import { deadlineState } from "@/lib/deadline";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/database";

export type CalendarOrder = {
  id: string;
  title: string;
  client: string | null;
  deadline: string;
  status: OrderStatus;
};

type View = "day" | "week" | "month" | "list";

const VIEWS: { value: View; label: string; icon: typeof CalendarDays }[] = [
  { value: "day", label: "Jour", icon: Sun },
  { value: "week", label: "Semaine", icon: Rows3 },
  { value: "month", label: "Mois", icon: CalendarDays },
  { value: "list", label: "Liste", icon: List },
];

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date: Date) {
  const day = startOfDay(date);
  const offset = (day.getDay() + 6) % 7; // lundi = 0
  day.setDate(day.getDate() - offset);
  return day;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function sameDay(a: Date, b: Date) {
  return dayKey(a) === dayKey(b);
}

function monthTitle(date: Date) {
  const label = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function dayTitle(date: Date) {
  const label = date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function weekTitle(date: Date) {
  const start = startOfWeek(date);
  const end = addDays(start, 6);
  const format = (value: Date) =>
    value.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  return `${format(start)} → ${format(end)} ${end.getFullYear()}`;
}

export function CalendarView({
  orders,
  today,
}: {
  orders: CalendarOrder[];
  /** Date du jour (ISO), transmise par le serveur. */
  today: string;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>("month");
  const [orderFilter, setOrderFilter] = useState("all");
  const [cursor, setCursor] = useState(() => startOfDay(new Date(today)));
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const todayDate = useMemo(() => startOfDay(new Date(today)), [today]);

  const items = useMemo(
    () =>
      orders
        .filter((order) => orderFilter === "all" || order.id === orderFilter)
        .map((order) => ({
        ...order,
        deadline: overrides[order.id] ?? order.deadline,
        date: new Date(overrides[order.id] ?? order.deadline),
      })),
    [orders, overrides, orderFilter],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const item of items) {
      if (Number.isNaN(item.date.getTime())) continue;
      const key = dayKey(item.date);
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.date.getTime() - b.date.getTime());
    }
    return map;
  }, [items]);

  function moveOrder(orderId: string, day: Date) {
    const original = items.find((item) => item.id === orderId);
    if (!original) return;

    const source = original.date;
    const target = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      Number.isNaN(source.getTime()) ? 12 : source.getHours(),
      Number.isNaN(source.getTime()) ? 0 : source.getMinutes(),
    );
    const iso = target.toISOString();

    setError(null);
    setOverrides((previous) => ({ ...previous, [orderId]: iso }));

    startTransition(async () => {
      const result = await setOrderDeadlineAction(orderId, iso);
      if (!result.ok) {
        setError(result.error ?? "Déplacement impossible.");
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

  function shift(direction: 1 | -1) {
    setCursor((current) => {
      if (view === "day") return addDays(current, direction);
      if (view === "week") return addDays(current, direction * 7);
      const next = new Date(current);
      next.setMonth(next.getMonth() + direction);
      return next;
    });
  }

  const monthDays = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const gridStart = startOfWeek(first);
    return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  }, [cursor]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [cursor]);

  const upcoming = useMemo(
    () =>
      [...items]
        .filter((item) => !Number.isNaN(item.date.getTime()))
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [items],
  );

  return (
    <div className="mx-auto h-full w-full max-w-[1500px] animate-fade-up overflow-y-auto px-4 py-6 sm:px-8">
      <PageHeader
        eyebrow="Planning"
        title="Planning"
        subtitle="Toutes les échéances de tes commandes · glisse une carte sur un autre jour pour la déplacer."
      />

      <div className="surface-card mt-6 flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => shift(-1)}
              aria-label="Période précédente"
              className="grid size-9 place-items-center rounded-lg border border-line text-muted transition-colors hover:border-line-strong hover:text-ink"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setCursor(todayDate)}
              className="h-9 rounded-lg border border-line px-3 text-[12px] font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
            >
              Aujourd&apos;hui
            </button>
            <button
              type="button"
              onClick={() => shift(1)}
              aria-label="Période suivante"
              className="grid size-9 place-items-center rounded-lg border border-line text-muted transition-colors hover:border-line-strong hover:text-ink"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <h2 className="ml-2 text-[16px] font-semibold tracking-tight text-ink">
            {view === "day"
              ? dayTitle(cursor)
              : view === "week"
                ? weekTitle(cursor)
                : view === "list"
                  ? "Toutes les échéances"
                  : monthTitle(cursor)}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={orderFilter}
            onChange={(event) => setOrderFilter(event.target.value)}
            aria-label="Filtrer par commande"
            className="h-9 w-52"
          >
            <option value="all">Toutes les commandes</option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.title}
              </option>
            ))}
          </Select>
          <div
            role="tablist"
            aria-label="Vue du planning"
            className="flex rounded-lg border border-line bg-surface p-0.5"
          >
            {VIEWS.map((entry) => {
              const Icon = entry.icon;
              return (
                <button
                  key={entry.value}
                  type="button"
                  role="tab"
                  aria-selected={view === entry.value}
                  onClick={() => setView(entry.value)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-medium transition-colors",
                    view === entry.value
                      ? "bg-panel-2 text-ink"
                      : "text-muted hover:text-ink-soft",
                  )}
                >
                  <Icon className="size-3.5" />
                  {entry.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-muted">
        {items.length} échéance{items.length > 1 ? "s" : ""}
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger"
        >
          {error}
        </p>
      ) : null}

      {view === "day" ? (
        <div
          data-day={dayKey(cursor)}
          onDragOver={(event) => {
            event.preventDefault();
            setHoverKey(dayKey(cursor));
          }}
          onDragLeave={() => setHoverKey(null)}
          onDrop={() => {
            setHoverKey(null);
            if (dragId) moveOrder(dragId, cursor);
            setDragId(null);
          }}
          className={cn(
            "surface-card mt-3 p-3 transition-colors",
            hoverKey === dayKey(cursor) && "border-accent/60 bg-accent/5",
          )}
        >
          {(byDay.get(dayKey(cursor)) ?? []).length === 0 ? (
            <EmptyState
              icon={CalendarRange}
              title="Rien de prévu ce jour"
              description="Aucune échéance ne tombe à cette date. Glisse une carte depuis une autre vue pour la déplacer ici."
            />
          ) : (
            <ul className="divide-y divide-line">
              {(byDay.get(dayKey(cursor)) ?? []).map((item) => {
                const state = deadlineState(item.deadline, item.status);
                const status = statusMeta(item.status);
                return (
                  <li key={item.id} className="flex items-center gap-3 py-2.5">
                    <span className="w-14 shrink-0 text-[12px] font-medium tabular-nums text-ink-soft">
                      {item.date.toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <TabLink
                      href={`/orders/${item.id}`}
                      title={item.title}
                      className="min-w-0 flex-1"
                    >
                      <span className="block truncate text-[13px] font-medium text-ink hover:text-accent-strong">
                        {item.title}
                      </span>
                      <span className="block truncate text-[11px] text-muted">
                        {item.client ?? "Sans client"}
                      </span>
                    </TabLink>
                    <span
                      className={cn(
                        "hidden rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset sm:inline-flex",
                        status.badge,
                      )}
                    >
                      {status.label}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                        state.chip,
                      )}
                    >
                      {state.short}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}

      {view === "month" ? (
        <div className="surface-card mt-3 overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-7 border-b border-line">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-muted"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthDays.map((day) => {
                const key = dayKey(day);
                const list = byDay.get(key) ?? [];
                const isCurrentMonth = day.getMonth() === cursor.getMonth();
                const isToday = sameDay(day, todayDate);
                return (
                  <DayCell
                    key={key}
                    day={day}
                    list={list}
                    muted={!isCurrentMonth}
                    highlight={isToday}
                    isDropTarget={hoverKey === key}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setHoverKey(key);
                    }}
                    onDragLeave={() =>
                      setHoverKey((current) => (current === key ? null : current))
                    }
                    onDrop={() => {
                      setHoverKey(null);
                      if (dragId) moveOrder(dragId, day);
                      setDragId(null);
                    }}
                    onDragStart={setDragId}
                    minHeight="min-h-[116px]"
                  />
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {view === "week" ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
          {weekDays.map((day) => {
            const key = dayKey(day);
            const list = byDay.get(key) ?? [];
            const isToday = sameDay(day, todayDate);
            return (
              <div
                key={key}
                data-day={key}
                onDragOver={(event) => {
                  event.preventDefault();
                  setHoverKey(key);
                }}
                onDragLeave={() => setHoverKey((current) => (current === key ? null : current))}
                onDrop={() => {
                  setHoverKey(null);
                  if (dragId) moveOrder(dragId, day);
                  setDragId(null);
                }}
                className={cn(
                  "flex min-h-[220px] flex-col rounded-xl border bg-panel p-2.5 transition-colors",
                  isToday ? "border-accent/50" : "border-line",
                  hoverKey === key && "border-accent/70 bg-accent/5",
                )}
              >
                <p
                  className={cn(
                    "mb-2 text-[11px] font-medium",
                    isToday ? "text-accent" : "text-muted",
                  )}
                >
                  {day.toLocaleDateString("fr-FR", {
                    weekday: "short",
                    day: "numeric",
                  })}
                </p>
                <div className="flex flex-1 flex-col gap-1.5">
                  {list.length === 0 ? (
                    <p className="rounded border border-dashed border-line/70 px-2 py-3 text-center text-[10px] text-muted/70">
                      Rien
                    </p>
                  ) : null}
                  {list.map((item) => (
                    <CalendarItem
                      key={item.id}
                      item={item}
                      onDragStart={() => setDragId(item.id)}
                      onDragEnd={() => setDragId(null)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {view === "list" ? (
        <div className="surface-card mt-3 overflow-hidden">
          {upcoming.length === 0 ? (
            <EmptyState
              className="m-3"
              icon={CalendarRange}
              title="Aucune échéance"
              description="Ajoute une deadline à une commande pour la voir apparaître dans le planning."
            />
          ) : (
            <ul className="divide-y divide-line">
              {upcoming.map((item) => {
                const state = deadlineState(item.deadline, item.status);
                const status = statusMeta(item.status);
                return (
                  <li key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                    <span
                      className={cn(
                        "w-24 shrink-0 text-[11px] font-medium tabular-nums",
                        state.tone === "overdue" && "text-danger",
                        state.tone === "soon" && "text-warning",
                        state.tone === "ok" && "text-success/90",
                        (state.tone === "done" || state.tone === "none") && "text-muted",
                      )}
                    >
                      {item.date.toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                      })}
                      <span className="ml-1 text-[10px] opacity-70">
                        {item.date.toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </span>

                    <TabLink
                      href={`/orders/${item.id}`}
                      title={item.title}
                      className="min-w-0 flex-1 truncate text-sm text-ink hover:text-accent-strong"
                    >
                      {item.title}
                    </TabLink>

                    <span className="hidden truncate text-[11px] text-muted sm:block sm:w-32">
                      {item.client ?? "Sans client"}
                    </span>

                    <span
                      className={cn(
                        "hidden rounded px-1.5 py-0.5 text-[10px] ring-1 sm:inline-flex",
                        status.badge,
                      )}
                    >
                      {status.label}
                    </span>

                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                        state.chip,
                      )}
                    >
                      {state.short}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}

      <p className="mt-4 flex items-center gap-1.5 pb-6 text-[11px] text-muted">
        <Clock className="size-3" />
        Clique sur une échéance pour ouvrir la commande. Les tâches datées ne sont pas encore gérées : le planning reflète les échéances des commandes.
      </p>
    </div>
  );
}

function DayCell({
  day,
  list,
  muted,
  highlight,
  isDropTarget,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  minHeight,
}: {
  day: Date;
  list: CalendarOrder[];
  muted: boolean;
  highlight: boolean;
  isDropTarget: boolean;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onDragStart: (id: string) => void;
  minHeight: string;
}) {
  return (
    <div
      data-day={dayKey(day)}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "flex flex-col gap-1 border-b border-r border-line/70 p-1.5 last:border-r-0",
        minHeight,
        muted && "bg-bg/40",
        isDropTarget && "bg-accent/10 ring-1 ring-inset ring-accent/40",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "grid size-5 place-items-center rounded-full text-[10px]",
            highlight
              ? "bg-accent text-accent-ink font-semibold"
              : muted
                ? "text-muted/60"
                : "text-ink-soft",
          )}
        >
          {day.getDate()}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        {list.slice(0, 3).map((item) => (
          <CalendarItem
            key={item.id}
            item={item}
            compact
            onDragStart={() => onDragStart(item.id)}
            onDragEnd={() => undefined}
          />
        ))}
        {list.length > 3 ? (
          <span className="px-1 text-[10px] text-muted">+{list.length - 3} autre(s)</span>
        ) : null}
      </div>
    </div>
  );
}

function CalendarItem({
  item,
  compact = false,
  onDragStart,
  onDragEnd,
}: {
  item: CalendarOrder;
  compact?: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const state = deadlineState(item.deadline, item.status);

  return (
    <TabLink
      href={`/orders/${item.id}`}
      title={`${item.title} · ${state.label}`}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", item.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "flex cursor-grab items-center gap-1.5 truncate rounded-md border-l-2 px-1.5 py-1 text-[10px] transition-colors active:cursor-grabbing",
        state.card,
        compact ? "text-[10px]" : "text-[11px]",
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", state.dot)} />
      <span className="truncate text-ink-soft">{item.title}</span>
    </TabLink>
  );
}
