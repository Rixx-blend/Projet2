import type { Metadata } from "next";

import { CalendarView, type CalendarOrder } from "@/components/calendar/calendar-view";
import { listOrdersWithClients } from "@/lib/local/db";

export const metadata: Metadata = { title: "Planning — Rixx Studio" };

export default async function CalendarPage() {
  const orders = await listOrdersWithClients();

  const events: CalendarOrder[] = orders
    .filter((order) => Boolean(order.deadline))
    .map((order) => ({
      id: order.id,
      title: order.title,
      client: order.client?.name ?? null,
      deadline: order.deadline as string,
      status: order.status,
    }));

  return <CalendarView orders={events} today={new Date().toISOString()} />;
}
