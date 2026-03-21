import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { DigestView } from "@/components/digest/digest-view";
import { EmptyState } from "@/components/states/empty-state";
import { StatusPanel } from "@/components/states/status-panel";
import { db } from "@/lib/db";
import {
  getTodayDigest,
  parseStoredDigestContent,
} from "@/lib/digest/service";
import {
  formatScheduledDigestMessage,
  getTodayDigestState,
} from "@/lib/digest/view-state";
import { isLocalPreviewMode } from "@/lib/env";
import {
  parsePreviewInterestProfile,
  PREVIEW_INTEREST_COOKIE,
} from "@/lib/preview-state";

export default async function TodayPage() {
  if (isLocalPreviewMode()) {
    const cookieStore = await cookies();
    const previewProfile = parsePreviewInterestProfile(
      cookieStore.get(PREVIEW_INTEREST_COOKIE)?.value,
    );

    if (!previewProfile) {
      return (
        <EmptyState
          title="What are you exploring?"
          body="Add your interests in Topics and Newsi will prepare a daily synthesis around them."
        />
      );
    }

    return (
      <StatusPanel
        label="Scheduled"
        body={formatScheduledDigestMessage({
          firstEligibleDigestDayKey: previewProfile.firstEligibleDigestDayKey,
        })}
      />
    );
  }

  if (!db) {
    return (
      <StatusPanel
        label="Unavailable"
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
    include: {
      interestProfile: true,
    },
  });

  if (!user) {
    redirect("/signin");
  }

  const storedDigest = await getTodayDigest(user.id, user.accountTimezone ?? "UTC");
  const digest = storedDigest?.digest ?? null;

  const state = getTodayDigestState({
    hasInterestProfile: Boolean(user.interestProfile),
    digest: digest ? { status: digest.status } : null,
  });

  if (state === "unconfigured") {
    return (
      <EmptyState
        title="What are you exploring?"
        body="Add your interests in Topics and Newsi will prepare a daily synthesis around them."
      />
    );
  }

  if (state === "scheduled") {
    return (
      <StatusPanel
        label="Scheduled"
        body={formatScheduledDigestMessage({
          firstEligibleDigestDayKey:
            user.interestProfile?.firstEligibleDigestDayKey ?? null,
        })}
      />
    );
  }

  if (state === "generating") {
    return (
      <StatusPanel
        label="Generating"
        body="Newsi is assembling today's synthesis now."
      />
    );
  }

  if (state === "failed") {
    return (
      <StatusPanel
        label="Retrying"
        body="Today's digest failed on the last attempt. Newsi will retry automatically."
      />
    );
  }

  if (!digest?.contentJson) {
    return (
      <StatusPanel
        label="Unavailable"
        body="Today's digest metadata exists, but no readable content has been stored yet."
      />
    );
  }

  const content = storedDigest?.content ?? parseStoredDigestContent(digest.contentJson);

  if (!content) {
    return (
      <StatusPanel
        label="Unavailable"
        body="Today's digest content is stored, but it does not match the readable digest format."
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
