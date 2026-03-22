import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ArchiveList } from "@/components/archive/archive-list";
import { EmptyState } from "@/components/states/empty-state";
import { db } from "@/lib/db";
import { listArchivedDigests } from "@/lib/digest/service";
import { isLocalPreviewMode } from "@/lib/env";
import {
  getLocalArchiveItems,
  parsePreviewInterestProfile,
  PREVIEW_INTEREST_COOKIE,
} from "@/lib/preview-state";

export default async function ArchivePage() {
  if (isLocalPreviewMode()) {
    const cookieStore = await cookies();
    const previewProfile = parsePreviewInterestProfile(
      cookieStore.get(PREVIEW_INTEREST_COOKIE)?.value,
    );

    if (!previewProfile) {
      return (
        <EmptyState
          title="No archived digests yet"
          body="Your daily syntheses will appear here once generation is enabled."
        />
      );
    }

    const items = getLocalArchiveItems(previewProfile);

    if (items.length === 0) {
      return (
        <EmptyState
          title="No archived digests yet"
          body="Your daily syntheses will appear here once generation is enabled."
        />
      );
    }

    return (
      <ArchiveList
        items={items}
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
