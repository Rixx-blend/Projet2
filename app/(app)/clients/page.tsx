import type { Metadata } from "next";

import { ClientsView, type ClientRow } from "@/components/clients/clients-view";
import { PageHeader } from "@/components/ui/page-header";
import { listClients, listOrdersWithClients } from "@/lib/local/db";
import { collectedAmount } from "@/lib/revenue";

export const metadata: Metadata = { title: "Clients — Rixx Studio" };
export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const [clients, orders] = await Promise.all([listClients(), listOrdersWithClients()]);

  const rows: ClientRow[] = clients.map((client) => {
    const mine = orders.filter((order) => order.client_id === client.id);
    const lastActivity = mine.reduce<string | null>(
      (max, order) => (!max || order.updated_at > max ? order.updated_at : max),
      null,
    );
    const first = mine.reduce<string | null>(
      (min, order) => (!min || order.created_at < min ? order.created_at : min),
      null,
    );
    return {
      id: client.id,
      name: client.name,
      email: client.email,
      discord: client.discord,
      other: client.other_contact,
      notes: client.notes,
      createdAt: client.created_at,
      firstOrderAt: first,
      lastActivity: lastActivity ?? client.created_at,
      billed: mine.reduce((sum, order) => sum + order.total_price, 0),
      collected: mine.reduce((sum, order) => sum + collectedAmount(order), 0),
      orders: mine.map((order) => ({
        id: order.id,
        title: order.title,
        status: order.status,
        payment: order.payment_status,
        price: order.total_price,
        createdAt: order.created_at,
      })),
    };
  });

  return (
    <main className="mx-auto h-full w-full max-w-[1500px] animate-fade-up overflow-y-auto px-4 py-6 sm:px-8">
      <PageHeader
        eyebrow="Répertoire"
        title="Clients"
        subtitle={`${rows.length} client${rows.length > 1 ? "s" : ""}`}
      />
      <div className="mt-6">
        <ClientsView rows={rows} />
      </div>
    </main>
  );
}
