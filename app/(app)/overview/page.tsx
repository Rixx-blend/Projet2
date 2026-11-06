import {
  ArrowRight,
  CheckSquare,
  CircleDollarSign,
  Inbox,
  Layers,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";

import { TabLink } from "@/components/layout/tabs-context";
import { ConvertButton } from "@/components/overview/convert-button";
import { NewOrderButton } from "@/components/overview/new-order-button";
import { RevenueChart, type ChartPeriod } from "@/components/overview/revenue-chart";
import { TodoList, type TodoItem } from "@/components/overview/todo-list";
import { DeadlineChip, PaymentBadge, StatusBadge } from "@/components/orders/order-badges";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
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

function Metric({
  href,
  title,
  label,
  value,
  hint,
  tone,
  primary,
}: {
  href: string;
  title: string;
  label: string;
  value: string;
  hint: React.ReactNode;
  tone?: string;
  primary?: boolean;
}) {
  return (
    <TabLink
      href={href}
      title={title}
      className="group block min-w-0 px-4 py-4 transition-colors hover:bg-white/[0.02] sm:px-5"
    >
      <p className="text-[12px] text-muted">{label}</p>
      <p
        className={cn(
          "mt-2 font-semibold tabular-nums tracking-tight",
          primary ? "text-[30px] leading-none sm:text-[34px]" : "text-[26px] leading-none sm:text-[28px]",
          tone,
        )}
      >
        {value}
      </p>
      <p className="mt-2 truncate text-[12px] text-muted">{hint}</p>
    </TabLink>
  );
}

/** Titre de section sans carte : texte, filet discret, action optionnelle. */
function Section({
  title,
  meta,
  action,
  children,
}: {
  title: string;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 border-t border-line pt-4">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold tracking-tight text-ink">{title}</h2>
          {meta ? <p className="mt-0.5 text-[12px] text-muted">{meta}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      {children}
    </section>
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
    <main className="mx-auto h-full w-full max-w-[1480px] animate-fade-up overflow-y-auto px-4 py-8 sm:px-8">
      <PageHeader
        eyebrow={new Date().toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
        title="Vue d'ensemble"
        subtitle="Où en est ton activité aujourd'hui."
      />

      {/* Indicateurs : une seule bande, séparée par des filets, sans boîtes. */}
      <section
        aria-label="Indicateurs"
        className="mt-7 grid grid-cols-2 border-y border-line xl:grid-cols-4 [&>*]:border-line max-xl:[&>*:nth-child(odd)]:border-r xl:[&>*+*]:border-l"
      >
        <Metric
          href="/revenue"
          title="Finances"
          label="Encaissé ce mois"
          value={formatCurrency(summary.thisMonth)}
          hint={<Delta current={summary.thisMonth} previous={summary.previousMonth} />}
          primary
        />
        <Metric
          href="/dashboard"
          title="Commandes"
          label="Commandes en cours"
          value={String(inProgress.length)}
          hint={`${active.length} active${active.length > 1 ? "s" : ""} au total`}
        />
        <Metric
          href="/dashboard"
          title="Commandes"
          label="Tâches à traiter"
          value={String(todos.length)}
          hint="Listes de contrôle des commandes actives"
        />
        <Metric
          href="/demands"
          title="Messages"
          label="Messages en attente"
          value={String(waitingMessages.length)}
          hint={waitingMessages.length > 0 ? "Demandes non lues" : "Aucune demande non lue"}
          tone={waitingMessages.length > 0 ? "text-accent-strong" : undefined}
        />
      </section>

      <div className="mt-10 grid grid-cols-1 gap-10 pb-10 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Colonne principale : ce qui se passe avec l'argent et les commandes */}
        <div className="min-w-0 space-y-10">
          <Section
            title="Revenus"
            meta={`Reste à encaisser : ${formatCurrency(toCollect)}`}
          >
            {hasRevenue ? (
              <RevenueChart periods={periods} />
            ) : (
              <p className="py-6 text-[13px] text-muted">
                Aucun revenu enregistré. Les acomptes et paiements apparaîtront ici.
              </p>
            )}
          </Section>

          <Section
            title="Dernières commandes"
            action={
              <TabLink href="/dashboard" title="Commandes" className="inline-flex items-center gap-1 text-[12px] text-muted transition-colors hover:text-ink">
                Toutes les commandes <ArrowRight className="size-3.5" />
              </TabLink>
            }
          >
            {recentOrders.length === 0 ? (
              <div className="flex flex-col items-start gap-3 py-6">
                <p className="text-[13px] text-muted">Aucune commande pour le moment.</p>
                <NewOrderButton clients={clients} />
              </div>
            ) : (
              <div className="-mx-1 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-[13px]">
                  <thead>
                    <tr className="text-[11px] text-muted">
                      <th scope="col" className="px-1 pb-2 font-medium">Client</th>
                      <th scope="col" className="px-3 pb-2 font-medium">Prestation</th>
                      <th scope="col" className="px-3 pb-2 text-right font-medium">Prix</th>
                      <th scope="col" className="px-3 pb-2 font-medium">Statut</th>
                      <th scope="col" className="px-3 pb-2 font-medium">Paiement</th>
                      <th scope="col" className="px-3 pb-2 font-medium">Échéance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="border-t border-line/70 transition-colors hover:bg-white/[0.02]">
                        <td className="px-1 py-3">
                          <TabLink href={`/orders/${order.id}`} title={order.title} className="flex items-center gap-2.5">
                            <Avatar name={order.client?.name ?? order.title} size={28} />
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-ink">{order.client?.name ?? "Sans client"}</span>
                              <span className="block truncate text-[12px] text-muted">{order.title}</span>
                            </span>
                          </TabLink>
                        </td>
                        <td className="px-3 py-3 text-ink-soft">{order.service_type}</td>
                        <td className="px-3 py-3 text-right font-medium tabular-nums">{formatCurrency(order.total_price)}</td>
                        <td className="px-3 py-3"><StatusBadge status={order.status} /></td>
                        <td className="px-3 py-3"><PaymentBadge status={order.payment_status} /></td>
                        <td className="px-3 py-3 text-[12px] tabular-nums text-ink-soft">
                          {order.deadline ? formatDate(order.deadline) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>

        {/* Colonne de travail : ce qui demande une action aujourd'hui */}
        <aside className="min-w-0 space-y-10">
          <Section
            title="Aujourd'hui"
            meta={`${upcoming.length} échéance${upcoming.length > 1 ? "s" : ""} · ${todos.length} tâche${todos.length > 1 ? "s" : ""}`}
          >
            <div className="space-y-6">
              <div>
                <p className="mb-1 text-[11px] text-muted">Échéances sous 7 jours</p>
                {upcoming.length === 0 ? (
                  <p className="py-2 text-[13px] text-muted">Rien d'urgent cette semaine.</p>
                ) : (
                  <ul className="divide-y divide-line/70">
                    {upcoming.map(({ order }) => (
                      <li key={order.id}>
                        <TabLink
                          href={`/orders/${order.id}`}
                          title={order.title}
                          className="group flex items-center gap-3 py-2.5 transition-colors hover:text-ink"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium text-ink">{order.title}</span>
                            <span className="block truncate text-[12px] text-muted">
                              {order.client?.name ?? "Sans client"}
                            </span>
                          </span>
                          <DeadlineChip deadline={order.deadline} status={order.status} />
                          <ArrowRight className="size-3.5 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                        </TabLink>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="mb-1 text-[11px] text-muted">Tâches à faire</p>
                {todos.length === 0 ? (
                  <p className="py-2 text-[13px] text-muted">
                    Aucune tâche en attente. Ajoute une liste de contrôle depuis une commande.
                  </p>
                ) : (
                  <TodoList items={todos.slice(0, 5)} />
                )}
              </div>
            </div>
          </Section>

          <Section
            title="Demandes récentes"
            action={
              <TabLink href="/demands" title="Messages" className="text-[12px] text-muted transition-colors hover:text-ink">
                Tout voir
              </TabLink>
            }
          >
            {recentInbox.length === 0 ? (
              <div className="py-2">
                <p className="text-[13px] text-muted">Aucune demande en attente.</p>
                <p className="mt-1 text-[12px] text-muted">
                  Les messages reçus ({INBOX_SOURCES.map((s) => s.short).join(", ")}) s'affichent ici.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-line/70">
                {recentInbox.map((item) => {
                  const meta = sourceMeta(item.source);
                  return (
                    <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-start gap-3">
                        <Avatar name={item.author_name} src={item.author_avatar} size={28} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-[13px] font-medium text-ink">{item.author_name}</span>
                            <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] text-muted">
                              <span className={cn("size-1.5 rounded-full", meta.dot)} />
                              {meta.short}
                            </span>
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-[12px] text-ink-soft">{item.message}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-3">
                            <span className="text-[11px] text-muted">{formatDate(item.received_at)}</span>
                            {item.order_id ? (
                              <TabLink href={`/orders/${item.order_id}`} title="Commande" className="text-[12px] text-ink-soft transition-colors hover:text-ink">
                                Voir la commande
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
          </Section>
        </aside>
      </div>
    </main>
  );
}
