import { notFound } from "next/navigation";

import { WorkboardEditor } from "@/components/workboards/workboard-editor";
import { getWorkboard } from "@/lib/local/workspaces";

export const dynamic = "force-dynamic";

export default async function WorkboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workboard = await getWorkboard(id);
  if (!workboard) notFound();
  return <WorkboardEditor workboard={workboard} />;
}
