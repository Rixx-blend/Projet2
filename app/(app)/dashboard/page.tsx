import type { Metadata } from "next";

import { KanbanBoard } from "@/components/orders/kanban-board";
import { PageHeader } from "@/components/ui/page-header";
import { listClients, listOrdersWithClients } from "@/lib/local/db";
import { formatCurrency, isOverdue, remainingAmount } from "@/lib/utils";

export const metadata: Metadata = { title: "Commandes — Rixx Studio" };

export default async function DashboardPage() {
  const [list, clients] = await Promise.all([
    listOrdersWithClients(),
    listClients(),
  ]);

  const done = list.filter((o) => o.status === "livre");
  const active = list.filter((o) => o.status !== "livre");
  const inProgress = list.filter((o) =>
    ["creation", "revision", "finalisation"].includes(o.status),
  );
  const toProcess = list.filter((o) => o.status === "brief");
  const late = active.filter((o) => isOverdue(o.deadline));
  const awaitingPayment = list.filter((o) => remainingAmount(o) > 0);
  const toCollect = list.reduce((total, o) => total + remainingAmount(o), 0);

  return (
    <main className="mx-auto h-full w-full max-w-[1800px] animate-fade-up overflow-y-auto px-4 py-6 sm:px-8">
      <PageHeader
        eyebrow={new Date().toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
        title="Commandes"
        subtitle={`${list.length} commande${list.length > 1 ? "s" : ""} · ${late.length} en retard`}
      />

      <section
        aria-label="Indicateurs"
        className="mt-6 grid grid-cols-2 border-y border-line lg:grid-cols-5 [&>*]:border-line max-lg:[&>*:nth-child(odd)]:border-r lg:[&>*+*]:border-l"
      >
        <Metric label="Toutes" value={String(list.length)} />
        <Metric label="En cours" value={String(inProgress.length)} />
        <Metric label="À traiter" value={String(toProcess.length)} hint="Demandes et devis" />
        <Metric label="Terminées" value={String(done.length)} />
        <Metric
          label="Paiements en attente"
          value={formatCurrency(toCollect)}
          hint={`${awaitingPayment.length} commande${awaitingPayment.length > 1 ? "s" : ""}`}
          tone={awaitingPayment.length > 0 ? "text-warning" : undefined}
        />
      </section>

      <div className="mt-6 pb-8">
        <KanbanBoard orders={list} clients={clients} />
      </div>
    </main>
  );
}

/** Indicateur en bande ouverte : pas de boîte, des filets et de la typographie. */
function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="min-w-0 px-4 py-4 sm:px-5">
      <p className="text-[12px] text-muted">{label}</p>
      <p className={`mt-2 text-[24px] font-semibold leading-none tabular-nums tracking-tight ${tone ?? ""}`}>{value}</p>
      {hint ? <p className="mt-2 truncate text-[12px] text-muted">{hint}</p> : null}
    </div>
  );
}
