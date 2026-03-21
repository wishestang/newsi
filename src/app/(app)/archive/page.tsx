import { ArchiveList } from "@/components/archive/archive-list";
import { EmptyState } from "@/components/states/empty-state";
import { isLocalPreviewMode } from "@/lib/env";

export default function ArchivePage() {
  if (isLocalPreviewMode()) {
    return (
      <ArchiveList
        items={[
          {
            digestDayKey: "2026-03-21",
            title: "Today's Synthesis",
            readingTime: 6,
          },
        ]}
      />
    );
  }

  return (
    <EmptyState
      title="No archived digests yet"
      body="Your daily syntheses will appear here once generation is enabled."
    />
  );
}
