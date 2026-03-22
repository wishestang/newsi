import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { interestProfileSchema } from "@/lib/topics/schema";
import {
  getDigestDayKey,
  getNextDigestDayKey,
  hasDailyRunPassed,
  normalizeTimezone,
} from "@/lib/timezone";

export async function saveInterestProfile(userId: string, input: unknown) {
  if (!db) {
    throw new Error("Persistence is not configured.");
  }

  const data = interestProfileSchema.parse(input);
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
  });

  const timezone = user.accountTimezone ?? normalizeTimezone(data.browserTimezone);
  const now = new Date();
  const firstEligibleDigestDayKey = hasDailyRunPassed(timezone, now)
    ? getNextDigestDayKey(timezone, now)
    : getDigestDayKey(timezone, now);

  await db.interestProfile.upsert({
    where: { userId },
    update: {
      interestText: data.interestText,
      status: "pending_preview",
    },
    create: {
      userId,
      interestText: data.interestText,
      status: "pending_preview",
      firstEligibleDigestDayKey,
    },
  });

  await db.previewDigest.upsert({
    where: { userId },
    update: {
      generationToken: randomUUID(),
      interestTextSnapshot: data.interestText,
      status: "generating",
      title: null,
      intro: null,
      contentJson: Prisma.DbNull,
      readingTime: null,
      providerName: null,
      providerModel: null,
      failureReason: null,
    },
    create: {
      userId,
      generationToken: randomUUID(),
      interestTextSnapshot: data.interestText,
      status: "generating",
    },
  });

  if (!user.accountTimezone) {
    await db.user.update({
      where: { id: userId },
      data: { accountTimezone: timezone },
    });
  }
}

export async function clearInterestProfile(userId: string) {
  if (!db) {
    throw new Error("Persistence is not configured.");
  }

  await db.previewDigest.deleteMany({
    where: { userId },
  });

  await db.interestProfile.deleteMany({
    where: { userId },
  });
}
