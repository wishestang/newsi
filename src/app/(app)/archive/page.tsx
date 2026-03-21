import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ArchiveList } from "@/components/archive/archive-list";
import { EmptyState } from "@/components/states/empty-state";
import { db } from "@/lib/db";
import { listArchivedDigests } from "@/lib/digest/service";
import { isLocalPreviewMode } from "@/lib/env";

export default async function ArchivePage() {
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

  if (!db) {
    return (
      <EmptyState
        title="Archive unavailable"
        body="Persistence is not configured for this environment."
      />
    );
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/signin");
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    redirect("/signin");
  }

  const digests = await listArchivedDigests(user.id);

  if (digests.length === 0) {
    return (
      <EmptyState
        title="No archived digests yet"
        body="Your daily syntheses will appear here once generation is enabled."
      />
    );
  }

  return (
    <ArchiveList
      items={digests.map((digest) => ({
        digestDayKey: digest.digestDayKey,
        title: digest.title ?? "Untitled digest",
        readingTime: digest.readingTime ?? 5,
      }))}
    />
  );
}

export const dynamic = "force-dynamic";
