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
            status: "ready",
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
        title: digest.title ?? getArchiveDigestTitle(digest.status),
        readingTime: digest.readingTime,
        status: digest.status,
      }))}
    />
  );
}

export const dynamic = "force-dynamic";

function getArchiveDigestTitle(status: "scheduled" | "generating" | "failed" | "ready") {
  switch (status) {
    case "scheduled":
      return "Digest scheduled";
    case "generating":
      return "Digest generating";
    case "failed":
      return "Digest failed";
    case "ready":
    default:
      return "Untitled digest";
  }
}
