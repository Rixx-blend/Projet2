import type { Client, Order } from "@/types/database";

/** Montant effectivement encaissé pour une commande. */
export function collectedAmount(order: Order): number {
  if (order.payment_status === "paye") return order.total_price;
  if (order.payment_status === "acompte") return order.deposit;
  return 0;
}

/** Date à laquelle ce montant a été encaissé (approximée si le champ manque). */
export function collectedDate(order: Order): string | null {
  if (order.payment_status === "paye") return order.paid_at ?? order.updated_at;
  if (order.payment_status === "acompte") return order.deposit_at ?? order.updated_at;
  return null;
}

export type MonthBucket = {
  key: string;
  label: string;
  shortLabel: string;
  amount: number;
  orders: number;
};

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Les `count` derniers mois, du plus ancien au plus récent. */
export function lastMonths(count: number, from = new Date()): { key: string; date: Date }[] {
  const months: { key: string; date: Date }[] = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(from.getFullYear(), from.getMonth() - index, 1);
    months.push({ key: monthKey(date), date });
  }
  return months;
}

function labelMonth(date: Date, style: "long" | "short"): string {
  const formatted = date.toLocaleDateString("fr-FR", {
    month: style === "long" ? "long" : "short",
    year: "2-digit",
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/** Revenus et nombre de commandes, mois par mois. */
export function monthlySeries(orders: Order[], months: number): MonthBucket[] {
  const buckets = lastMonths(months).map(({ key, date }) => ({
    key,
    label: labelMonth(date, "long"),
    shortLabel: labelMonth(date, "short"),
    amount: 0,
    orders: 0,
  }));

  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const order of orders) {
    const created = new Date(order.created_at);
    const bucket = byKey.get(monthKey(created));
    if (bucket) bucket.orders += 1;

    const collectedOn = collectedDate(order);
    if (!collectedOn) continue;
    const amount = collectedAmount(order);
    if (amount <= 0) continue;
    const revenueBucket = byKey.get(monthKey(new Date(collectedOn)));
    if (revenueBucket) revenueBucket.amount += amount;
  }

  return buckets;
}

export type Totals = {
  thisMonth: number;
  previousMonth: number;
  total: number;
  paidOrders: number;
  averageBasket: number;
  goal: number;
  goalRatio: number;
};

export function totals(orders: Order[], goal = 0, now = new Date()): Totals {
  const currentKey = monthKey(now);
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousKey = monthKey(previous);

  let thisMonth = 0;
  let previousMonth = 0;
  let total = 0;
  let paidOrders = 0;

  for (const order of orders) {
    const amount = collectedAmount(order);
    if (amount > 0) {
      total += amount;
      if (order.payment_status === "paye") paidOrders += 1;

      const collectedOn = collectedDate(order);
      if (collectedOn) {
        const key = monthKey(new Date(collectedOn));
        if (key === currentKey) thisMonth += amount;
        if (key === previousKey) previousMonth += amount;
      }
    }
  }

  return {
    thisMonth,
    previousMonth,
    total,
    paidOrders,
    averageBasket: paidOrders > 0 ? total / paidOrders : 0,
    goal,
    goalRatio: goal > 0 ? Math.min(100, (thisMonth / goal) * 100) : 0,
  };
}

export type Slice = { label: string; amount: number; count: number };

/** Répartition des revenus par type de prestation. */
export function byServiceType(orders: Order[]): Slice[] {
  const map = new Map<string, Slice>();
  for (const order of orders) {
    const amount = collectedAmount(order);
    if (amount <= 0) continue;
    const label = order.service_type || "Autre";
    const entry = map.get(label) ?? { label, amount: 0, count: 0 };
    entry.amount += amount;
    entry.count += 1;
    map.set(label, entry);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

/** Meilleurs clients, par montant encaissé. */
export function topClients(
  orders: Order[],
  clients: Client[],
  limit = 5,
): Slice[] {
  const byId = new Map(clients.map((client) => [client.id, client]));
  const map = new Map<string, Slice>();

  for (const order of orders) {
    const amount = collectedAmount(order);
    if (amount <= 0) continue;
    const name = order.client_id
      ? (byId.get(order.client_id)?.name ?? "Client supprimé")
      : "Sans client";
    const entry = map.get(name) ?? { label: name, amount: 0, count: 0 };
    entry.amount += amount;
    entry.count += 1;
    map.set(name, entry);
  }

  return [...map.values()].sort((a, b) => b.amount - a.amount).slice(0, limit);
}
