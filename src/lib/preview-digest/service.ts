import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { generateDigest, parseStoredDigestContent } from "@/lib/digest/service";
import type { DigestProvider } from "@/lib/digest/provider";
import type { DigestResponse } from "@/lib/digest/schema";
import {
  getDigestDayKey,
  getNextDigestDayKey,
  normalizeTimezone,
} from "@/lib/timezone";

export interface StoredPreviewDigest {
  previewDigest: {
    userId: string;
    generationToken: string;
    interestTextSnapshot: string;
    status: "generating" | "failed" | "ready";
    title: string | null;
    intro: string | null;
    readingTime: number | null;
    contentJson: unknown;
    failureReason: string | null;
    providerName: string | null;
    providerModel: string | null;
    updatedAt: Date;
  };
  content: DigestResponse | null;
}

export async function getPreviewDigest(userId: string): Promise<StoredPreviewDigest | null> {
  if (!db) {
    throw new Error("Persistence is not configured.");
  }

  const previewDigest = await db.previewDigest.findUnique({
    where: { userId },
  });

  if (!previewDigest) {
    return null;
  }

  return {
    previewDigest,
    content: parseStoredDigestContent(previewDigest.contentJson),
  };
}

export async function startPreviewDigestGeneration(
  userId: string,
  { provider }: { provider?: DigestProvider } = {},
) {
  if (!db) {
    throw new Error("Persistence is not configured.");
  }

  const previewDigest = await db.previewDigest.findUnique({
    where: { userId },
  });

  if (!previewDigest || previewDigest.status !== "generating") {
    return { started: false };
  }

  const claimed = await db.previewDigest.updateMany({
    where: {
      userId,
      status: "generating",
      generationToken: previewDigest.generationToken,
      updatedAt: previewDigest.updatedAt,
    },
    data: {
      updatedAt: new Date(),
    },
  });

  if (claimed.count === 0) {
    return { started: false };
  }

  try {
    const digest = await generateDigest({
      provider,
      dateLabel: "Preview",
      interestText: previewDigest.interestTextSnapshot,
    });

    await db.previewDigest.updateMany({
      where: {
        userId,
        generationToken: previewDigest.generationToken,
      },
      data: {
        status: "ready",
        title: digest.title,
        intro: digest.intro,
        contentJson: digest,
        readingTime: digest.readingTime,
        providerName: provider?.name ?? null,
        providerModel: provider?.model ?? null,
        failureReason: null,
      },
    });
  } catch (error) {
    await db.previewDigest.updateMany({
      where: {
        userId,
        generationToken: previewDigest.generationToken,
      },
      data: {
        status: "failed",
        failureReason: getErrorMessage(error),
      },
    });
  }

  return { started: true };
}

export async function retryPreviewDigest(userId: string) {
  if (!db) {
    throw new Error("Persistence is not configured.");
  }

  await db.previewDigest.update({
    where: { userId },
    data: {
      status: "generating",
      generationToken: randomUUID(),
      title: null,
      intro: null,
      contentJson: Prisma.DbNull,
      readingTime: null,
      providerName: null,
      providerModel: null,
      failureReason: null,
    },
  });
}

export async function confirmPreviewDigest(userId: string, now = new Date()) {
  if (!db) {
    throw new Error("Persistence is not configured.");
  }

  const previewDigest = await db.previewDigest.findUnique({
    where: { userId },
  });

  if (!previewDigest || previewDigest.status !== "ready") {
    throw new Error("Preview digest is not ready yet.");
  }

  const interestProfile = await db.interestProfile.findUnique({
    where: { userId },
  });

  if (!interestProfile) {
    throw new Error("Interest profile is missing.");
  }

  if (interestProfile.interestText !== previewDigest.interestTextSnapshot) {
    throw new Error("Preview digest is stale. Regenerate it from the latest Topics.");
  }

  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
  });
  const timezone = normalizeTimezone(user.accountTimezone);
  const digestDayKey = getDigestDayKey(timezone, now);
  const firstEligibleDigestDayKey = getNextDigestDayKey(timezone, now);
  const contentJson = previewDigest.contentJson ?? Prisma.JsonNull;

  await db.$transaction(async (tx) => {
    await tx.dailyDigest.upsert({
      where: {
        userId_digestDayKey: {
          userId,
          digestDayKey,
        },
      },
      update: {
        status: "ready",
        title: previewDigest.title,
        intro: previewDigest.intro,
        contentJson,
        readingTime: previewDigest.readingTime,
        providerName: previewDigest.providerName,
        providerModel: previewDigest.providerModel,
        failureReason: null,
      },
      create: {
        userId,
        digestDayKey,
        status: "ready",
        title: previewDigest.title,
        intro: previewDigest.intro,
        contentJson,
        readingTime: previewDigest.readingTime,
        providerName: previewDigest.providerName,
        providerModel: previewDigest.providerModel,
        failureReason: null,
      },
    });

    await tx.interestProfile.update({
      where: { userId },
      data: {
        status: "active",
        firstEligibleDigestDayKey,
      },
    });

    await tx.previewDigest.delete({
      where: { userId },
    });
  });
}

export async function deletePreviewDigest(userId: string) {
  if (!db) {
    throw new Error("Persistence is not configured.");
  }

  await db.previewDigest.deleteMany({
    where: { userId },
  });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Preview digest generation failed.";
}
