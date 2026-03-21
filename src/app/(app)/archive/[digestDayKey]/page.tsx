import { DigestView } from "@/components/digest/digest-view";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { StatusPanel } from "@/components/states/status-panel";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDigestByDayKey } from "@/lib/digest/service";
import { isLocalPreviewMode } from "@/lib/env";

export default async function ArchiveDetailPage({
  params,
}: {
  params: Promise<{ digestDayKey: string }>;
}) {
  const { digestDayKey } = await params;

  if (isLocalPreviewMode()) {
    return (
      <DigestView
        title={`Archive: ${digestDayKey}`}
        intro="This is a preview of how historical daily syntheses will read once digest generation is wired to real stored data."
        sections={[
          {
            title: "Historical Snapshot",
            summary: [
              "Archive entries should feel like durable reading artifacts rather than disposable feed items. Each day should be readable on its own without depending on surrounding UI context.",
              "That makes the archive more useful for pattern recognition over time and aligns with the product's editorial direction.",
            ],
            keyPoints: [
              "Archive entries should preserve their original framing.",
              "Users should be able to revisit old syntheses as stable documents.",
            ],
          },
        ]}
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
