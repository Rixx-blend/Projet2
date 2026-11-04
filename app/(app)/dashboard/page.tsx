import { CheckCircle2, Clock, Hourglass, Layers, Wallet } from "lucide-react";
import type { Metadata } from "next";

import { KanbanBoard } from "@/components/orders/kanban-board";
import { StatCard } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { listClients, listOrdersWithClients } from "@/lib/local/db";
import { formatCurrency, isOverdue, remainingAmount } from "@/lib/utils";

export const metadata: Metadata = { title: "Commandes — Rixx Studio" };

export default async function DashboardPage() {
  const [list, clients] = await Promise.all([
    listOrdersWithClients(),
    listClients(),
  ]);

  const done = list.filter((o) => o.status === "livre" || o.status === "paye");
  const active = list.filter((o) => o.status !== "livre" && o.status !== "paye");
  const inProgress = list.filter((o) =>
    ["acompte_paye", "en_cours", "revision"].includes(o.status),
  );
  const toProcess = list.filter((o) => ["demande", "devis_envoye"].includes(o.status));
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
        className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5"
      >
        <StatCard label="Toutes" value={String(list.length)} icon={<Layers />} />
        <StatCard label="En cours" value={String(inProgress.length)} icon={<Clock />} />
        <StatCard
          label="À traiter"
          value={String(toProcess.length)}
          hint="Demandes et devis"
          icon={<Hourglass />}
        />
        <StatCard label="Terminées" value={String(done.length)} icon={<CheckCircle2 />} />
        <StatCard
          label="Paiements en attente"
          value={formatCurrency(toCollect)}
          hint={`${awaitingPayment.length} commande${awaitingPayment.length > 1 ? "s" : ""}`}
          tone={awaitingPayment.length > 0 ? "warning" : "default"}
          icon={<Wallet />}
          className="col-span-2 lg:col-span-1"
        />
      </section>

      <div className="mt-6 pb-8">
        <KanbanBoard orders={list} clients={clients} />
      </div>
    </main>
  );
}
