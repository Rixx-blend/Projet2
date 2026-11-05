import type { Metadata } from "next";

import { NewOrderPage } from "@/components/orders/new-order-page";
import { listClients } from "@/lib/local/db";

export const metadata: Metadata = { title: "Nouvelle commande — Rixx Studio" };

export default async function NewOrderRoute() {
  const clients = await listClients();
  return <NewOrderPage clients={clients} />;
}
