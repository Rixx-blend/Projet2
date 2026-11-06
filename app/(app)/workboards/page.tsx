import { WorkboardLibrary } from "@/components/workboards/workboard-library";
import { listWorkboards } from "@/lib/local/workspaces";

export const metadata = { title: "Planches de travail — Rixx Studio" };
export const dynamic = "force-dynamic";

export default async function WorkboardsPage() {
  const workboards = await listWorkboards();
  return <WorkboardLibrary initialWorkboards={workboards} />;
}
