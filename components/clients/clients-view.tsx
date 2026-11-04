"use client";

import { ExternalLink, Mail, MessageCircle, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge, PaymentBadge } from "@/components/orders/order-badges";
import { TabLink } from "@/components/layout/tabs-context";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/field";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { OrderStatus, PaymentStatus } from "@/types/database";

export type ClientRow = {
  id: string;
  name: string;
  email: string | null;
  discord: string | null;
  other: string | null;
  notes: string | null;
  createdAt: string;
  firstOrderAt: string | null;
  lastActivity: string;
  billed: number;
  collected: number;
  orders: {
    id: string;
    title: string;
    status: OrderStatus;
    payment: PaymentStatus;
    price: number;
    createdAt: string;
  }[];
};

export function ClientsView({ rows }: { rows: ClientRow[] }) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [sort, setSort] = useState<"recent" | "name" | "billed">("recent");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = needle
      ? rows.filter((row) =>
          [row.name, row.email, row.discord, row.other, row.notes]
            .filter(Boolean)
            .some((value) => (value as string).toLowerCase().includes(needle)),
        )
      : [...rows];
    return list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "fr");
      if (sort === "billed") return b.billed - a.billed;
      return b.lastActivity.localeCompare(a.lastActivity);
    });
  }, [rows, query, sort]);

  const selected = rows.find((row) => row.id === openId) ?? null;

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Aucun client pour l'instant"
        description="Les clients sont créés depuis une commande ou une demande reçue. Ils apparaîtront ici avec leur historique."
      />
    );
  }

  return (
    <>
      <div className="surface-card flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un client, un contact, une note…"
            aria-label="Rechercher un client"
            className="pl-9"
          />
        </div>
        <Select
          value={sort}
          onChange={(event) => setSort(event.target.value as typeof sort)}
          aria-label="Trier les clients"
          className="sm:w-52"
        >
          <option value="recent">Tri : activité récente</option>
          <option value="name">Tri : nom (A–Z)</option>
          <option value="billed">Tri : montant facturé</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={Search}
          title="Aucun résultat"
          description={`Aucun client ne correspond à « ${query} ».`}
        />
      ) : (
        <>
        <ul className="mt-4 space-y-2 md:hidden">
          {filtered.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => setOpenId(row.id)}
                className="surface-card flex w-full items-center gap-3 p-3 text-left transition-colors hover:border-line-strong"
              >
                <Avatar name={row.name} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">{row.name}</span>
                  <span className="block text-[12px] text-muted">
                    {row.orders.length} commande{row.orders.length > 1 ? "s" : ""} · {formatCurrency(row.billed)} facturé
                  </span>
                </span>
                <span className="text-[12px] tabular-nums text-success">
                  {formatCurrency(row.collected)}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <Card className="mt-4 hidden overflow-hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line bg-surface/60 text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-3 py-3 font-medium">Contacts</th>
                  <th className="px-3 py-3 text-right font-medium">Commandes</th>
                  <th className="px-3 py-3 text-right font-medium">Facturé</th>
                  <th className="px-3 py-3 text-right font-medium">Encaissé</th>
                  <th className="px-5 py-3 font-medium">Dernière activité</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setOpenId(row.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setOpenId(row.id);
                      }
                    }}
                    tabIndex={0}
                    className="cursor-pointer border-b border-line/60 transition-colors last:border-0 hover:bg-panel-2/60 focus-visible:bg-panel-2/60"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={row.name} size={34} />
                        <span className="font-medium text-ink">{row.name}</span>
                      </div>
                    </td>
                    <td className="max-w-[240px] px-3 py-3 text-ink-soft">
                      <Contacts row={row} />
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{row.orders.length}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(row.billed)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-success">
                      {formatCurrency(row.collected)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-muted">
                      {formatDate(row.lastActivity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        </>
      )}

      {selected ? (
        <Dialog
          open
          onClose={() => setOpenId(null)}
          title={selected.name}
          description={`Client depuis le ${formatDate(selected.createdAt)}`}
        >
          <ClientDetail row={selected} onNavigate={() => setOpenId(null)} />
        </Dialog>
      ) : null}
    </>
  );
}

function Contacts({ row }: { row: ClientRow }) {
  const items = [
    row.email ? { icon: Mail, text: row.email } : null,
    row.discord ? { icon: MessageCircle, text: row.discord } : null,
    row.other ? { icon: ExternalLink, text: row.other } : null,
  ].filter(Boolean) as { icon: typeof Mail; text: string }[];

  if (items.length === 0) return <span className="text-muted">—</span>;
  return (
    <ul className="space-y-0.5">
      {items.map((item) => (
        <li key={item.text} className="flex items-center gap-1.5 truncate text-[12px]">
          <item.icon className="size-3 shrink-0 text-muted" />
          <span className="truncate">{item.text}</span>
        </li>
      ))}
    </ul>
  );
}

function ClientDetail({ row, onNavigate }: { row: ClientRow; onNavigate: () => void }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        <Metric label="Facturé" value={formatCurrency(row.billed)} />
        <Metric label="Encaissé" value={formatCurrency(row.collected)} tone="success" />
        <Metric label="Première commande" value={row.firstOrderAt ? formatDate(row.firstOrderAt) : "—"} />
      </div>

      <section>
        <h3 className="text-[13px] font-medium text-ink-soft">Contacts</h3>
        <div className="mt-2">
          <Contacts row={row} />
        </div>
      </section>

      <section>
        <h3 className="text-[13px] font-medium text-ink-soft">Notes</h3>
        <p className="mt-2 whitespace-pre-wrap text-[13px] text-ink-soft">
          {row.notes || <span className="text-muted">Aucune note.</span>}
        </p>
      </section>

      <section>
        <h3 className="text-[13px] font-medium text-ink-soft">
          Commandes ({row.orders.length})
        </h3>
        {row.orders.length === 0 ? (
          <p className="mt-2 text-[13px] text-muted">Aucune commande pour ce client.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {row.orders.map((order) => (
              <li key={order.id}>
                <TabLink
                  href={`/orders/${order.id}`}
                  onNavigate={onNavigate}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 transition-colors hover:border-line-strong"
                >
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{order.title}</span>
                  <StatusBadge status={order.status} />
                  <PaymentBadge status={order.payment} />
                  <span className="text-[13px] tabular-nums text-ink-soft">
                    {formatCurrency(order.price)}
                  </span>
                </TabLink>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success";
}) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2.5">
      <p className="text-[11px] text-muted">{label}</p>
      <p className={tone === "success" ? "mt-0.5 text-sm font-semibold text-success" : "mt-0.5 text-sm font-semibold"}>
        {value}
      </p>
    </div>
  );
}
