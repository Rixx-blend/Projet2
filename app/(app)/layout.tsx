import { AppAuthGate } from "@/components/auth/app-auth";
import { CloudAccountSync } from "@/components/sync/cloud-account-sync";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import type { SearchEntry } from "@/components/layout/global-search";
import { MobileNav } from "@/components/layout/mobile-nav";
import { TabBar } from "@/components/layout/tab-bar";
import { TabsProvider } from "@/components/layout/tabs-context";
import { emailConfigured } from "@/lib/email";
import {
  getSettings,
  listClients,
  listInbox,
  listOrdersWithClients,
} from "@/lib/local/db";
import { buildNotifications } from "@/lib/notifications";
import { totals } from "@/lib/revenue";

// Les données sont relues à chaque requête (pas de version figée au build).
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [orders, settings, inbox, clients] = await Promise.all([
    listOrdersWithClients(),
    getSettings(),
    listInbox(),
    listClients(),
  ]);
  const summary = totals(orders, settings.monthly_goal);
  const notifications = buildNotifications(orders, settings, new Date(), inbox);

  const searchEntries: SearchEntry[] = [
    ...orders.map((order) => ({
      id: `order-${order.id}`,
      kind: "commande" as const,
      title: order.title,
      subtitle: `${order.client?.name ?? "Sans client"} · ${order.service_type}`,
      href: `/orders/${order.id}`,
    })),
    ...clients.map((client) => ({
      id: `client-${client.id}`,
      kind: "client" as const,
      title: client.name,
      subtitle: client.discord ?? client.email ?? "Client",
      href: "/clients",
    })),
  ];

  return (
    <AppAuthGate>
      <TabsProvider>
        <div className="flex h-dvh overflow-hidden bg-bg">
          <AppSidebar
            thisMonth={summary.thisMonth}
            total={summary.total}
            goal={settings.monthly_goal}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <AppHeader
              notifications={notifications}
              emailReady={emailConfigured(settings)}
              searchEntries={searchEntries}
              clients={clients}
            />
            <TabBar />
            <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>
            <CloudAccountSync />
            <MobileNav />
          </div>
        </div>
      </TabsProvider>
    </AppAuthGate>
  );
}
