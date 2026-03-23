import Link from "next/link";
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
  formatFailedDigestMessage,
  formatScheduledDigestMessage,
  getTodayDigestState,
} from "@/lib/digest/view-state";
import { formatDigestDate, formatTodayDate } from "@/lib/digest/format";
import { isLocalPreviewMode } from "@/lib/env";
import {
  getLocalTodayState,
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

    const previewState = getLocalTodayState(previewProfile);

    if (previewState.status === "pending_preview") {
      return (
        <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-10 py-20">
          <p className="text-xs uppercase tracking-[0.32em] text-stone-400">
            Preview required
          </p>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
            You have a preview digest waiting for confirmation. Continue preview to
            start daily digests for your current Topics.
          </p>
          <div className="mt-10">
            <Link
              href="/preview"
              className="inline-flex bg-stone-950 px-4 py-2 text-sm text-white"
            >
              Continue preview
            </Link>
          </div>
        </section>
      );
    }

    if (previewState.status === "ready") {
      return (
        <DigestView
          title={previewState.digest.title}
          intro={previewState.digest.intro}
          topics={previewState.digest.topics}
          digestDate={formatTodayDate()}
        />
      );
    }

    if (previewState.status === "scheduled") {
      return (
        <StatusPanel
          label="Scheduled"
          body={formatScheduledDigestMessage({
            firstEligibleDigestDayKey: previewState.firstEligibleDigestDayKey,
          })}
        />
      );
    }

    return (
      <EmptyState
        title="What are you exploring?"
        body="Add your interests in Topics and Newsi will prepare a daily synthesis around them."
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

  const storedDigest = await getTodayDigest(user.id);
  const digest = storedDigest?.digest ?? null;

  const state = getTodayDigestState({
    hasInterestProfile: Boolean(user.interestProfile),
    profileStatus: user.interestProfile?.status ?? null,
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

  if (state === "pending_preview_confirmation") {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-10 py-20">
        <p className="text-xs uppercase tracking-[0.32em] text-stone-400">
          Preview required
        </p>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
          You have a preview digest waiting for confirmation. Continue preview to
          start daily digests for your current Topics.
        </p>
        <div className="mt-10">
          <Link
            href="/preview"
            className="inline-flex bg-stone-950 px-4 py-2 text-sm text-white"
          >
            Continue preview
          </Link>
        </div>
      </section>
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
        label="Failed"
        body={formatFailedDigestMessage()}
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
      topics={content.topics}
      digestDate={formatDigestDate(digest.digestDayKey)}
    />
  );
}

export const dynamic = "force-dynamic";
