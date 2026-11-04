import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OrderWorkspace } from "@/components/orders/order-workspace";
import {
  getBoard,
  getOrder,
  listChecklists,
  listClients,
  listFiles,
} from "@/lib/local/db";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const order = await getOrder(id);
  return { title: order ? `${order.title} — OrderBoard` : "Commande — Rixx Studio" };
}

export default async function OrderPage({ params }: PageProps) {
  const { id } = await params;
  const order = await getOrder(id);

  if (!order) {
    notFound();
  }

  const [board, files, checklists, clients] = await Promise.all([
    getBoard(id),
    listFiles(id),
    listChecklists(id),
    listClients(),
  ]);

  return (
    <OrderWorkspace
      order={order}
      board={board}
      boardNote={order.board_note ?? null}
      files={files}
      checklists={checklists}
      clients={clients}
    />
  );
}
