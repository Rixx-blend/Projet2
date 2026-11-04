import type { Metadata } from "next";

import { InboxView } from "@/components/inbox/inbox-view";
import { listInbox } from "@/lib/local/db";

export const metadata: Metadata = { title: "Messages — Rixx Studio" };
export const dynamic = "force-dynamic";

export default async function DemandsPage() {
  const items = await listInbox();
  return <InboxView items={items} />;
}
