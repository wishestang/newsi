import { notFound } from "next/navigation";
import { StatusPanel } from "@/components/states/status-panel";
import { isLocalPreviewMode } from "@/lib/env";

export default async function ArchiveDetailPage({
  params,
}: {
  params: Promise<{ digestDayKey: string }>;
}) {
  const { digestDayKey } = await params;

  if (isLocalPreviewMode()) {
    return (
      <StatusPanel
        label={digestDayKey}
        body="Archive detail preview mode. Full digest history will appear here once generation is wired."
      />
    );
  }

  notFound();
}
