import type { Metadata } from "next";

import { ResourcesView, type ResourceRow } from "@/components/resources/resources-view";
import { PageHeader } from "@/components/ui/page-header";
import { listAllFiles, listOrdersWithClients } from "@/lib/local/db";

export const metadata: Metadata = { title: "Ressources — Rixx Studio" };
export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  const [files, orders] = await Promise.all([listAllFiles(), listOrdersWithClients()]);
  const byId = new Map(orders.map((order) => [order.id, order]));

  const rows: ResourceRow[] = files.map((file) => {
    const order = byId.get(file.order_id);
    return {
      id: file.id,
      name: file.name,
      mime: file.type,
      size: file.size,
      createdAt: file.created_at,
      storagePath: file.storage_path,
      orderId: file.order_id,
      orderTitle: order?.title ?? "Commande supprimée",
      client: order?.client?.name ?? null,
    };
  });

  return (
    <main className="mx-auto h-full w-full max-w-[1500px] animate-fade-up overflow-y-auto px-4 py-6 sm:px-8">
      <PageHeader
        eyebrow="Bibliothèque"
        title="Ressources"
        subtitle="Les fichiers importés dans tes commandes, rassemblés au même endroit."
      />
      <div className="mt-6">
        <ResourcesView rows={rows} />
      </div>
    </main>
  );
}
