import { DigestView } from "@/components/digest/digest-view";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { StatusPanel } from "@/components/states/status-panel";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDigestByDayKey } from "@/lib/digest/service";
import { isLocalPreviewMode } from "@/lib/env";
import {
  getPreviewDigestState,
  parsePreviewInterestProfile,
  PREVIEW_INTEREST_COOKIE,
} from "@/lib/preview-state";

export default async function ArchiveDetailPage({
  params,
}: {
  params: Promise<{ digestDayKey: string }>;
}) {
  const { digestDayKey } = await params;

  if (isLocalPreviewMode()) {
    const cookieStore = await cookies();
    const previewProfile = parsePreviewInterestProfile(
      cookieStore.get(PREVIEW_INTEREST_COOKIE)?.value,
    );

    if (!previewProfile) {
      notFound();
    }

    const previewState = getPreviewDigestState(previewProfile);

    if (
      (previewState.status === "scheduled" &&
        previewState.archiveItem.digestDayKey !== digestDayKey) ||
      (previewState.status === "ready" && previewState.digestDayKey !== digestDayKey)
    ) {
      notFound();
    }

    if (previewState.status === "ready") {
      return (
        <DigestView
          title={previewState.digest.title}
          intro={previewState.digest.intro}
          sections={previewState.digest.sections}
        />
      );
    }

    return (
      <StatusPanel
        label={digestDayKey}
        body={previewState.archiveItem.detailBody}
      />
    );
  }

  if (!db) {
    return (
      <StatusPanel
        label={digestDayKey}
        body="Persistence is not configured for this environment."
      />
    );
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    notFound();
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    notFound();
  }

  const storedDigest = await getDigestByDayKey(user.id, digestDayKey);
  if (!storedDigest) {
    notFound();
  }

  const { digest, content } = storedDigest;

  if (digest.status !== "ready" || !digest.contentJson) {
    return (
      <StatusPanel
        label={digestDayKey}
        body="This digest exists, but the readable content is not available yet."
      />
    );
  }

  if (!content) {
    return (
      <StatusPanel
        label={digestDayKey}
        body="This digest exists, but the stored content is not readable."
      />
    );
  }

  return (
    <DigestView
      title={digest.title ?? content.title}
      intro={digest.intro ?? content.intro}
      sections={content.sections}
    />
  );
}

export const dynamic = "force-dynamic";
