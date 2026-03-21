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
import { getTodayDigestState } from "@/lib/digest/view-state";
import { isLocalPreviewMode } from "@/lib/env";

export default async function TodayPage() {
  if (isLocalPreviewMode()) {
    return (
      <DigestView
        title="Today's Synthesis"
        intro="Two signals stood out across your tracked space today: AI productization is moving toward bundled workflows, and quiet, editorial interfaces are becoming a competitive advantage again."
        sections={[
          {
            title: "AI Agents Are Becoming Product Surfaces",
            summary: [
              "The most interesting movement is no longer around standalone model demos, but around how agentic behavior is packaged into usable workflows. Teams are collapsing multi-step research, planning, and execution tasks into narrower, opinionated experiences.",
              "That shift matters because product value is moving from raw model capability to orchestration, context retention, and trust in the output shape. The winners may look more like well-edited tools than generic chat boxes.",
            ],
            keyPoints: [
              "Workflow packaging is becoming a moat.",
              "Users care more about predictable outputs than broad model flexibility.",
            ],
            whyItMatters:
              "This is the kind of pattern Newsi itself needs to embody: a focused workflow, not an open-ended prompt box.",
          },
          {
            title: "Editorial Interfaces Feel More Valuable Again",
            summary: [
              "A second pattern is visual rather than purely technical. As more AI products compete on similar capabilities, calmer interfaces with stronger hierarchy and fewer controls are starting to feel more trustworthy.",
              "Products that look like feeds, dashboards, or control panels often make intelligence feel noisy. Interfaces that feel more like reading surfaces create a clearer sense of synthesis.",
            ],
            keyPoints: [
              "Visual restraint is becoming a product differentiator.",
              "Reading-oriented layouts reinforce trust and comprehension.",
            ],
          },
        ]}
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
        body="Your first digest will appear after the next local 07:00 run."
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
