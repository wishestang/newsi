import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db";
import { buildDigestPrompt } from "@/lib/digest/prompt";
import { digestResponseSchema, type DigestResponse } from "@/lib/digest/schema";
import {
  createDigestProvider,
  type DigestProvider,
  parseDigestResult,
} from "@/lib/digest/provider";
import { getDigestDayKey, hasDailyRunPassed, normalizeTimezone } from "@/lib/timezone";

export const MAX_DIGEST_RETRIES = 3;

export interface DigestCycleResult {
  processed: number;
  ready: number;
  failed: number;
  skipped: number;
}

export interface StoredDigest {
  digest: {
    digestDayKey: string;
    status: "scheduled" | "generating" | "failed" | "ready";
    title: string | null;
    intro: string | null;
    readingTime: number | null;
    contentJson: unknown;
  };
  content: DigestResponse | null;
}

export async function generateDigest({
  provider = createDigestProvider(),
  dateLabel,
  interestText,
}: {
  provider?: DigestProvider;
  dateLabel: string;
  interestText: string;
}) {
  const prompt = buildDigestPrompt({ dateLabel, interestText });
  const raw = await provider.generate({ prompt });
  return parseDigestResult(raw);
}

export function parseStoredDigestContent(content: unknown): DigestResponse | null {
  const result = digestResponseSchema.safeParse(content);
  return result.success ? result.data : null;
}

export async function listArchivedDigests(userId: string) {
  if (!db) {
    throw new Error("Persistence is not configured.");
  }

  return db.dailyDigest.findMany({
    where: {
      userId,
    },
    orderBy: {
      digestDayKey: "desc",
    },
    select: {
      digestDayKey: true,
      title: true,
      readingTime: true,
      status: true,
    },
  });
}

export async function getDigestByDayKey(
  userId: string,
  digestDayKey: string,
): Promise<StoredDigest | null> {
  if (!db) {
    throw new Error("Persistence is not configured.");
  }

  const digest = await db.dailyDigest.findUnique({
    where: {
      userId_digestDayKey: {
        userId,
        digestDayKey,
      },
    },
  });

  if (!digest) {
    return null;
  }

  return {
    digest,
    content: parseStoredDigestContent(digest.contentJson),
  };
}

export async function getTodayDigest(
  userId: string,
  timezone: string,
  now = new Date(),
) {
  return getDigestByDayKey(userId, getDigestDayKey(timezone, now));
}

export async function runDigestGenerationCycle({
  now = new Date(),
  provider = createDigestProvider(),
}: {
  now?: Date;
  provider?: DigestProvider;
} = {}): Promise<DigestCycleResult> {
  if (!db) {
    throw new Error("Persistence is not configured.");
  }

  const profiles = await db.interestProfile.findMany({
    include: {
      user: {
        select: {
          accountTimezone: true,
        },
      },
    },
  });

  const result: DigestCycleResult = {
    processed: 0,
    ready: 0,
    failed: 0,
    skipped: 0,
  };

  for (const profile of profiles) {
    const timezone = normalizeTimezone(profile.user.accountTimezone);

    if (!hasDailyRunPassed(timezone, now)) {
      result.skipped += 1;
      continue;
    }

    const digestDayKey = getDigestDayKey(timezone, now);

    if (profile.firstEligibleDigestDayKey > digestDayKey) {
      result.skipped += 1;
      continue;
    }

    const existingDigest = await db.dailyDigest.findUnique({
      where: {
        userId_digestDayKey: {
          userId: profile.userId,
          digestDayKey,
        },
      },
    });

    if (
      existingDigest?.status === "ready" ||
      existingDigest?.status === "generating" ||
      (existingDigest?.status === "failed" &&
        existingDigest.retryCount >= MAX_DIGEST_RETRIES)
    ) {
      result.skipped += 1;
      continue;
    }

    result.processed += 1;

    await db.dailyDigest.upsert({
      where: {
        userId_digestDayKey: {
          userId: profile.userId,
          digestDayKey,
        },
      },
      update: {
        status: "generating",
        failureReason: null,
      },
      create: {
        userId: profile.userId,
        digestDayKey,
        status: "generating",
      },
    });

    try {
      const digest = await generateDigest({
        provider,
        dateLabel: formatInTimeZone(now, timezone, "MMMM d, yyyy"),
        interestText: profile.interestText,
      });

      await db.dailyDigest.update({
        where: {
          userId_digestDayKey: {
            userId: profile.userId,
            digestDayKey,
          },
        },
        data: {
          status: "ready",
          title: digest.title,
          intro: digest.intro,
          contentJson: digest,
          readingTime: digest.readingTime,
          providerName: provider.name ?? null,
          providerModel: provider.model ?? null,
          failureReason: null,
        },
      });

      result.ready += 1;
    } catch (error) {
      await db.dailyDigest.update({
        where: {
          userId_digestDayKey: {
            userId: profile.userId,
            digestDayKey,
          },
        },
        data: {
          status: "failed",
          retryCount: (existingDigest?.retryCount ?? 0) + 1,
          failureReason: getErrorMessage(error),
        },
      });

      result.failed += 1;
    }
  }

  return result;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Digest generation failed.";
}
