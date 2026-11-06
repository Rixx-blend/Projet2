import { CircleDollarSign, Clock, Receipt, TrendingUp, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { TabLink } from "@/components/layout/tabs-context";
import { MonthlyGoalSettings } from "@/components/revenue/monthly-goal-settings";
import {
  Breakdown,
  MonthlyBars,
  OrderCountBars,
} from "@/components/revenue/revenue-charts";
import { Badge, Dot } from "@/components/ui/badge";
import { Card, SectionTitle, StatCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  getSettings,
  listClients,
  listOrdersWithClients,
} from "@/lib/local/db";
import {
  byServiceType,
  collectedAmount,
  collectedDate,
  monthlySeries,
  topClients,
  totals,
} from "@/lib/revenue";
import { cn, formatCurrency, formatDate, remainingAmount } from "@/lib/utils";

export const metadata: Metadata = { title: "Finances — Rixx Studio" };
export const dynamic = "force-dynamic";

const PERIODS = [
  { value: "3", label: "3 mois" },
  { value: "6", label: "6 mois" },
  { value: "12", label: "12 mois" },
  { value: "all", label: "Tout" },
] as const;

type PeriodValue = (typeof PERIODS)[number]["value"];

function periodMonths(period: string, oldest: string | null): number {
  if (period !== "all") {
    const parsed = Number(period);
    return Number.isFinite(parsed) ? Math.min(24, Math.max(1, parsed)) : 6;
  }
  if (!oldest) return 6;
  const start = new Date(oldest);
  const now = new Date();
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth()) +
    1;
  return Math.min(36, Math.max(6, months));
}

type Movement = {
  id: string;
  date: string | null;
  client: string;
  orderId: string;
  orderTitle: string;
  service: string;
  kind: string;
  amount: number;
  /** « encaissé » = argent reçu ; « attendu » = reste à encaisser (jamais additionné au reste). */
  state: "encaisse" | "attendu";
};

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: rawPeriod } = await searchParams;
  const period: PeriodValue = (PERIODS.find((entry) => entry.value === rawPeriod)?.value ??
    "6") as PeriodValue;

  const [orders, clients, settings] = await Promise.all([
    listOrdersWithClients(),
    listClients(),
    getSettings(),
  ]);

  const oldest = orders.reduce<string | null>(
    (min, order) => (!min || order.created_at < min ? order.created_at : min),
    null,
  );
  const months = periodMonths(period, oldest);
  const series = monthlySeries(orders, months);
  const periodRevenue = series.reduce((sum, bucket) => sum + bucket.amount, 0);
  const global = totals(orders, settings.monthly_goal);

  const services = byServiceType(orders);
  const bestClients = topClients(orders, clients);

  // Argent encaissé et reste à encaisser : deux familles de lignes, jamais mélangées.
  const windowStart = new Date();
  windowStart.setMonth(windowStart.getMonth() - (months - 1), 1);
  windowStart.setHours(0, 0, 0, 0);

  const movements: Movement[] = [];
  for (const order of orders) {
    const base = {
      client: order.client?.name ?? "Sans client",
      orderId: order.id,
      orderTitle: order.title,
      service: order.service_type,
    };
    const collected = collectedAmount(order);
    const on = collectedDate(order);
    if (collected > 0 && on && new Date(on) >= windowStart) {
      movements.push({
        ...base,
        id: `${order.id}-in`,
        date: on,
        kind: order.payment_status === "paye" ? "Paiement" : "Acompte",
        amount: collected,
        state: "encaisse",
      });
    }
    const remaining = remainingAmount(order);
    if (remaining > 0) {
      movements.push({
        ...base,
        id: `${order.id}-due`,
        date: order.deadline,
        kind: order.payment_status === "acompte" ? "Solde" : "Montant total",
        amount: remaining,
        state: "attendu",
      });
    }
  }
  movements.sort((a, b) => {
    if (a.state !== b.state) return a.state === "attendu" ? -1 : 1;
    return (b.date ?? "").localeCompare(a.date ?? "");
  });

  const toCollect = orders.reduce((sum, order) => sum + remainingAmount(order), 0);
  const pendingOrders = orders.filter((order) => remainingAmount(order) > 0).length;

  return (
    <main className="mx-auto h-full w-full max-w-[1500px] animate-fade-up overflow-y-auto px-4 py-6 sm:px-8">
      <PageHeader
        eyebrow="Statistiques"
        title="Finances"
        subtitle="Argent réellement encaissé (acomptes et commandes payées), séparé de ce qui reste à encaisser."
        actions={
          <nav className="flex rounded-lg border border-line bg-surface p-0.5" aria-label="Période">
            {PERIODS.map((entry) => (
              <Link
                key={entry.value}
                href={`/revenue?period=${entry.value}`}
                scroll={false}
                aria-current={entry.value === period ? "true" : undefined}
                className={cn(
                  "inline-flex h-8 items-center rounded-md px-3 text-[12px] font-medium transition-colors",
                  entry.value === period
                    ? "bg-panel-2 text-ink"
                    : "text-muted hover:text-ink-soft",
                )}
              >
                {entry.label}
              </Link>
            ))}
          </nav>
        }
      />

      <section aria-label="Indicateurs" className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label="Encaissé ce mois"
          value={formatCurrency(global.thisMonth)}
          icon={<CircleDollarSign />}
          tone="success"
        />
        <StatCard
          label={`Encaissé sur ${months} mois`}
          value={formatCurrency(periodRevenue)}
          hint={`${series.reduce((sum, bucket) => sum + bucket.orders, 0)} commandes créées`}
          icon={<TrendingUp />}
        />
        <StatCard
          label="Total encaissé"
          value={formatCurrency(global.total)}
          hint={`${global.paidOrders} payées`}
          icon={<Wallet />}
        />
        <StatCard
          label="Reste à encaisser"
          value={formatCurrency(toCollect)}
          hint={`${pendingOrders} commande${pendingOrders > 1 ? "s" : ""} · pas encore reçu`}
          tone={toCollect > 0 ? "warning" : "default"}
          icon={<Clock />}
        />
        <StatCard
          label="Panier moyen"
          value={formatCurrency(global.averageBasket)}
          hint="par commande payée"
          icon={<Receipt />}
          className="col-span-2 lg:col-span-1"
        />
      </section>

      <Card className="mt-4 p-5">
        <SectionTitle
          title="Évolution des revenus encaissés"
          description={
            series.length > 0 ? `${series[0].label} → ${series[series.length - 1].label}` : undefined
          }
        />
        <div className="mt-5">
          <MonthlyBars data={series} />
        </div>

        <div className="mt-6 border-t border-line pt-4">
          <h3 className="text-[13px] font-medium text-ink-soft">Commandes créées par mois</h3>
          <div className="mt-3">
            <OrderCountBars data={series} />
          </div>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle title="Par type de prestation" description="Revenus encaissés" />
          <div className="mt-4">
            <Breakdown
              data={services}
              emptyLabel="Aucun revenu encaissé pour l'instant."
            />
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Par client" description="Revenus encaissés" />
          <div className="mt-4">
            <Breakdown
              data={bestClients}
              emptyLabel="Aucun client facturé pour l'instant."
              tone="sky"
            />
          </div>
        </Card>
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="p-5 pb-3">
          <SectionTitle
            title="Historique financier"
            description={`Paiements reçus sur la période (${months} mois) et montants restant à encaisser.`}
          />
        </div>
        {movements.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState
              icon={Receipt}
              title="Aucun mouvement"
              description="Les acomptes, paiements et soldes de tes commandes apparaîtront ici."
            />
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[760px] text-left text-[13px]">
              <thead>
                <tr className="border-y border-line bg-surface/60 text-[11px] uppercase tracking-wide text-muted">
                  <th scope="col" className="px-5 py-2.5 font-medium">Date</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Client</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Commande</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Opération</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Montant</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr
                    key={movement.id}
                    className="border-b border-line/60 transition-colors last:border-0 hover:bg-panel-2/50"
                  >
                    <td className="whitespace-nowrap px-5 py-3 text-ink-soft">
                      {movement.date
                        ? movement.state === "attendu"
                          ? `avant le ${formatDate(movement.date)}`
                          : formatDate(movement.date)
                        : "—"}
                    </td>
                    <td className="px-3 py-3">{movement.client}</td>
                    <td className="max-w-[260px] px-3 py-3">
                      <TabLink
                        href={`/orders/${movement.orderId}`}
                        title={movement.orderTitle}
                        className="block truncate text-ink-soft hover:text-accent-strong"
                      >
                        {movement.orderTitle}
                      </TabLink>
                      <span className="block text-[11px] text-muted">{movement.service}</span>
                    </td>
                    <td className="px-3 py-3 text-ink-soft">{movement.kind}</td>
                    <td
                      className={cn(
                        "whitespace-nowrap px-3 py-3 text-right font-medium tabular-nums",
                        movement.state === "encaisse" ? "text-success" : "text-ink-soft",
                      )}
                    >
                      {movement.state === "encaisse" ? "+" : ""}
                      {formatCurrency(movement.amount)}
                    </td>
                    <td className="px-5 py-3">
                      {movement.state === "encaisse" ? (
                        <Badge className="bg-success/12 text-success ring-success/30">
                          <Dot className="bg-success" />
                          Encaissé
                        </Badge>
                      ) : (
                        <Badge className="bg-warning/12 text-warning ring-warning/30">
                          <Dot className="bg-warning" />
                          En attente
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <MonthlyGoalSettings goal={settings.monthly_goal} />
      <p className="mt-4 pb-6 text-[12px] text-muted">
        Les dépenses et le bénéfice ne sont pas encore suivis dans l&apos;application.
      </p>
    </main>
  );
}
