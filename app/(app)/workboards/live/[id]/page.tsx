import { LiveWorkboard } from "@/components/workboards/live-workboard";

export const dynamic = "force-dynamic";

export default async function LiveWorkboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LiveWorkboard id={id} />;
}
