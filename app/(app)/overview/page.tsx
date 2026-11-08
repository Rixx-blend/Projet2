import {
  ArrowRight,
  Bell,
  CalendarDays,
  CircleDollarSign,
  ChevronDown,
  Inbox,
  Layers,
  List,
  ShoppingCart,
  Wrench,
} from "lucide-react";
import type { Metadata } from "next";

import { TabLink } from "@/components/layout/tabs-context";
import { ConvertButton } from "@/components/overview/convert-button";
import { NewOrderButton } from "@/components/overview/new-order-button";
import { RevenueChart, type ChartPeriod } from "@/components/overview/revenue-chart";
import { TodoList, type TodoItem } from "@/components/overview/todo-list";
import { DeadlineChip, PaymentBadge, StatusBadge } from "@/components/orders/order-badges";
import { Avatar } from "@/components/ui/avatar";
import { Card, SectionTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { INBOX_SOURCES, sourceMeta } from "@/lib/inbox";
import { daysUntilDay } from "@/lib/deadline";
import { listClients, listInbox, listOrdersWithClients, readDb } from "@/lib/local/db";
import { getSettings } from "@/lib/local/db";
import { collectedAmount, collectedDate, lastMonths, totals } from "@/lib/revenue";
import { cn, formatCurrency, formatDate, remainingAmount } from "@/lib/utils";
import type { OrderWithClient } from "@/types/database";

export const metadata: Metadata = { title: "Vue d'ensemble — Rixx Studio" };
export const dynamic = "force-dynamic";

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildPeriods(orders: OrderWithClient[]): ChartPeriod[] {
  const now = new Date();
  const currentKey = monthKey(now);

  return [3, 6, 12].map((count) => {
    // On affiche les `count` derniers mois, plus les 2 mois à venir pour le « prévu ».
    const months = lastMonths(count + 2, new Date(now.getFullYear(), now.getMonth() + 2, 1));
    const points = months.map(({ key, date }) => ({
      key,
      label: date.toLocaleDateString("fr-FR", { month: "short" }).replace(".", ""),
      collected: 0,
      planned: 0,
      isFuture: key > currentKey,
    }));
    const byKey = new Map(points.map((point) => [point.key, point]));

    for (const order of orders) {
      const amount = collectedAmount(order);
      const on = collectedDate(order);
      if (amount > 0 && on) {
        const point = byKey.get(monthKey(new Date(on)));
        if (point) point.collected += amount;
      }
      // Prévu : solde restant, rattaché au mois d'échéance (jamais mélangé à l'encaissé).
      const remaining = remainingAmount(order);
      if (remaining > 0 && order.deadline && order.status !== "brief") {
        const deadlineKey = monthKey(new Date(order.deadline));
        const point = byKey.get(deadlineKey < currentKey ? currentKey : deadlineKey);
        if (point) point.planned += remaining;
      }
    }
    return { id: String(count), label: `${count} mois`, points };
  });
}

function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous <= 0) return <span>Aucun encaissement le mois précédent</span>;
  const pct = Math.round(((current - previous) / previous) * 100);
  return (
    <span className={cn(pct >= 0 ? "text-success" : "text-danger")}>
      {pct >= 0 ? "+" : ""}
      {pct} % <span className="text-muted">vs mois précédent</span>
    </span>
  );
}

const KPI_SPARKLINES = {
  green: "M0 32 C 15 30, 25 20, 40 24 S 65 34, 80 22 S 105 8, 120 14",
  blue: "M0 30 C 15 26, 30 10, 45 16 S 70 34, 85 20 S 105 6, 120 12",
  purple: "M0 34 C 20 30, 35 24, 50 26 S 80 12, 95 18 S 110 6, 120 10",
  amber: "M0 28 C 15 34, 35 30, 50 22 S 80 4, 95 14 S 110 18, 120 10",
} as const;

const KPI_COLORS = {
  green: "#3fb950",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  amber: "#f59e0b",
} as const;

function KpiLink({
  href,
  title,
  label,
  value,
  hint,
  icon: Icon,
  tone,
  color,
}: {
  href: string;
  title: string;
  label: string;
  value: string;
  hint: React.ReactNode;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone?: string;
  color: keyof typeof KPI_COLORS;
}) {
  return (
    <TabLink href={href} title={title} className="group block">
      <Card interactive className="relative h-full overflow-hidden px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-xl text-white shadow-sm"
            style={{ backgroundColor: KPI_COLORS[color] }}
          >
            <Icon className="size-5" strokeWidth={1.9} />
          </span>
          <p className="min-w-0 truncate text-[13px] font-medium text-ink-soft">{label}</p>
        </div>
        <p className={cn("mt-4 text-[26px] font-semibold leading-none tracking-tight tabular-nums sm:text-[30px]", tone)}>
          {value}
        </p>
        <p className="mt-2 flex min-h-[18px] items-center text-[12px] text-muted">{hint}</p>
        <svg
          aria-hidden="true"
          viewBox="0 0 120 40"
          preserveAspectRatio="none"
          className="pointer-events-none absolute bottom-0 right-0 h-12 w-2/3 opacity-80 transition-opacity group-hover:opacity-100"
        >
          <path
            d={KPI_SPARKLINES[color]}
            fill="none"
            stroke={KPI_COLORS[color]}
            strokeWidth="2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </Card>
    </TabLink>
  );
}

export default async function OverviewPage() {
  const [orders, clients, inbox, settings, db] = await Promise.all([
    listOrdersWithClients(),
    listClients(),
    listInbox(),
    getSettings(),
    readDb(),
  ]);

  const summary = totals(orders, settings.monthly_goal);
  const active = orders.filter((o) => o.status !== "livre");
  const inProgress = orders.filter((o) =>
    ["creation", "revision", "finalisation"].includes(o.status),
  );
  const toCollect = orders.reduce((sum, o) => sum + remainingAmount(o), 0);
  const waitingMessages = inbox.filter((item) => item.status === "nouvelle");

  const activeIds = new Set(active.map((o) => o.id));
  const orderById = new Map(orders.map((o) => [o.id, o]));
  const checklistOrder = new Map(db.checklists.map((c) => [c.id, c.order_id]));
  const todos: TodoItem[] = db.checklistItems
    .filter((item) => !item.done)
    .flatMap((item) => {
      const orderId = checklistOrder.get(item.checklist_id);
      const order = orderId ? orderById.get(orderId) : undefined;
      if (!orderId || !order || !activeIds.has(orderId)) return [];
      return [{ id: item.id, text: item.text, orderId, orderTitle: order.title }];
    });

  const upcoming = active
    .filter((o) => o.deadline)
    .map((o) => ({ order: o, days: daysUntilDay(o.deadline) ?? 999 }))
    .filter(({ days }) => days <= 7)
    .sort((a, b) => a.days - b.days)
    .slice(0, 4);

  const recentOrders = [...orders]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5);
  const recentInbox = [...inbox]
    .filter((item) => item.status !== "ignoree" && item.status !== "traitee")
    .sort((a, b) => b.received_at.localeCompare(a.received_at))
    .slice(0, 4);

  const periods = buildPeriods(orders);
  const hasRevenue = orders.some((o) => collectedAmount(o) > 0 || remainingAmount(o) > 0);

  return (
    <main className="mx-auto h-full w-full max-w-[1500px] animate-fade-up overflow-y-auto px-4 py-7 sm:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[28px] font-semibold tracking-tight text-ink sm:text-[32px]">
            Bonjour Rixx <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-1 text-sm text-muted">Voici un aperçu rapide de votre activité.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-line bg-panel px-3.5 py-2 text-[13px] text-ink-soft">
          <CalendarDays className="size-4 text-muted" strokeWidth={1.75} />
          <span>Ce mois-ci</span>
          <ChevronDown className="size-3.5 text-muted" strokeWidth={1.75} />
        </div>
      </header>

      <section aria-label="Indicateurs" className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiLink
          href="/revenue"
          title="Finances"
          label="Encaissés ce mois"
          value={formatCurrency(summary.thisMonth)}
          hint={<Delta current={summary.thisMonth} previous={summary.previousMonth} />}
          icon={ShoppingCart}
          color="green"
        />
        <KpiLink
          href="/dashboard"
          title="Commandes"
          label="Commandes en cours"
          value={String(inProgress.length)}
          hint={
            <span>
              <ArrowRight className="mr-1 inline size-3 -rotate-45" />
              {active.length} active{active.length > 1 ? "s" : ""} au total
            </span>
          }
          icon={List}
          color="blue"
        />
        <KpiLink
          href="/dashboard"
          title="Commandes"
          label="Tâches à traiter"
          value={String(todos.length)}
          hint="Listes de contrôle des commandes actives"
          icon={Wrench}
          color="purple"
        />
        <KpiLink
          href="/demands"
          title="Messages"
          label="Messages en attente"
          value={String(waitingMessages.length)}
          hint={waitingMessages.length > 0 ? "Demandes non lues" : "Aucun message"}
          icon={Bell}
          color="amber"
        />
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <SectionTitle
            title="Revenus"
            description={`Reste à encaisser : ${formatCurrency(toCollect)}`}
          />
          <div className="mt-4">
            {hasRevenue ? (
              <RevenueChart periods={periods} />
            ) : (
              <EmptyState
                icon={CircleDollarSign}
                title="Aucun revenu enregistré"
                description="Les paiements et acomptes reçus sur tes commandes apparaîtront ici."
              />
            )}
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Aujourd'hui" description="Échéances proches et tâches à faire" />
          <div className="mt-4 space-y-5">
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                Échéances (7 jours)
              </p>
              {upcoming.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line px-3 py-3 text-xs text-muted">
                  Aucune échéance dans les 7 prochains jours.
                </p>
              ) : (
                <ul className="space-y-1">
                  {upcoming.map(({ order }) => (
                    <li key={order.id}>
                      <TabLink
                        href={`/orders/${order.id}`}
                        title={order.title}
                        className="flex items-center gap-3 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-white/[0.03]"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium">{order.title}</span>
                          <span className="block truncate text-[11px] text-muted">
                            {order.client?.name ?? "Sans client"} · priorité {order.priority}
                          </span>
                        </span>
                        <DeadlineChip deadline={order.deadline} status={order.status} />
                      </TabLink>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                À faire
              </p>
              {todos.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line px-3 py-3 text-xs text-muted">
                  Aucune tâche en attente. Ajoute une liste de contrôle depuis une commande.
                </p>
              ) : (
                <TodoList items={todos.slice(0, 5)} />
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 pb-8 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <div className="p-5 pb-3">
            <SectionTitle
              title="Dernières commandes"
              action={
                <TabLink
                  href="/dashboard"
                  title="Commandes"
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-accent-strong hover:underline"
                >
                  Voir toutes les commandes <ArrowRight className="size-3.5" />
                </TabLink>
              }
            />
          </div>
          {recentOrders.length === 0 ? (
            <div className="px-5 pb-5">
              <EmptyState
                icon={Layers}
                title="Aucune commande"
                description="Crée ta première commande pour suivre ton activité ici."
                action={<NewOrderButton clients={clients} />}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[13px]">
                <thead>
                  <tr className="border-y border-line text-[11px] uppercase tracking-wide text-muted">
                    <th className="px-5 py-2 font-medium">Client</th>
                    <th className="px-3 py-2 font-medium">Prestation</th>
                    <th className="px-3 py-2 text-right font-medium">Prix</th>
                    <th className="px-3 py-2 font-medium">Statut</th>
                    <th className="px-3 py-2 font-medium">Paiement</th>
                    <th className="px-5 py-2 font-medium">Échéance</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-line/60 transition-colors last:border-0 hover:bg-white/[0.025]">
                      <td className="px-5 py-3">
                        <TabLink href={`/orders/${order.id}`} title={order.title} className="flex items-center gap-2.5">
                          <Avatar name={order.client?.name ?? order.title} size={28} />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{order.client?.name ?? "Sans client"}</span>
                            <span className="block truncate text-[11px] text-muted">{order.title}</span>
                          </span>
                        </TabLink>
                      </td>
                      <td className="px-3 py-3 text-ink-soft">{order.service_type}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(order.total_price)}</td>
                      <td className="px-3 py-3"><StatusBadge status={order.status} /></td>
                      <td className="px-3 py-3"><PaymentBadge status={order.payment_status} /></td>
                      <td className="px-5 py-3 text-[12px] text-ink-soft">
                        {order.deadline ? formatDate(order.deadline) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <SectionTitle
            title="Demandes récentes"
            action={
              <TabLink href="/demands" title="Messages" className="text-[12px] font-medium text-accent-strong hover:underline">
                Tout voir
              </TabLink>
            }
          />
          <div className="mt-3">
            {recentInbox.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="Aucune demande"
                description={`Les demandes reçues (${INBOX_SOURCES.map((s) => s.short).join(", ")}) s'affichent ici.`}
              />
            ) : (
              <ul className="divide-y divide-line/70">
                {recentInbox.map((item) => {
                  const meta = sourceMeta(item.source);
                  return (
                    <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-start gap-3">
                        <Avatar name={item.author_name} src={item.author_avatar} size={32} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-[13px] font-medium">{item.author_name}</span>
                            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted">
                              <span className={cn("size-1.5 rounded-full", meta.dot)} />
                              {meta.short}
                            </span>
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-[12px] text-ink-soft">{item.message}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-[11px] text-muted">{formatDate(item.received_at)}</span>
                            {item.order_id ? (
                              <TabLink href={`/orders/${item.order_id}`} title="Commande" className="text-[11px] font-medium text-accent-strong hover:underline">
                                Commande liée
                              </TabLink>
                            ) : (
                              <ConvertButton id={item.id} />
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
