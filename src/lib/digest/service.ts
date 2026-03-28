import { formatInTimeZone } from "date-fns-tz";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { buildBasePrompt } from "@/lib/digest/prompt";
import { fetchMatchingDataSources } from "@/lib/datasources";
import { digestResponseSchema, type DigestResponse } from "@/lib/digest/schema";
import {
  createDigestProvider,
  type DigestProvider,
  parseDigestResult,
} from "@/lib/digest/provider";
import {
  DIGEST_TIMEZONE,
  getBeijingDigestDayKey,
  hasBeijingDailyRunPassed,
} from "@/lib/timezone";

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
  const dataSourceContexts = await fetchMatchingDataSources(interestText);
  const prompt = buildBasePrompt({ dateLabel, interestText, dataSourceContexts });
  const raw = await provider.generate({ prompt });
  return parseDigestResult(raw);
}

export async function shareDigest(
  userId: string,
  digestDayKey: string,
): Promise<string> {
  if (!db) {
    throw new Error("Persistence is not configured.");
  }

  const digest = await db.dailyDigest.findUnique({
    where: { userId_digestDayKey: { userId, digestDayKey } },
    select: { shareSlug: true, status: true },
  });

  if (!digest) {
    throw new Error("Digest not found.");
  }

  if (digest.status !== "ready") {
    throw new Error("Digest is not ready to be shared.");
  }

  if (digest.shareSlug) {
    return `${process.env.APP_URL || "http://localhost:3000"}/public/${digest.shareSlug}`;
  }

  const slug = crypto.randomUUID().replace(/-/g, "").slice(0, 21);

  try {
    await db.dailyDigest.update({
      where: { userId_digestDayKey: { userId, digestDayKey } },
      data: { shareSlug: slug },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await db.dailyDigest.findUnique({
        where: { userId_digestDayKey: { userId, digestDayKey } },
        select: { shareSlug: true },
      });
      if (existing?.shareSlug) {
        return `${process.env.APP_URL || "http://localhost:3000"}/public/${existing.shareSlug}`;
      }
    }
    throw error;
  }

  return `${process.env.APP_URL || "http://localhost:3000"}/public/${slug}`;
}

export async function getSharedDigest(
  slug: string,
): Promise<StoredDigest | null> {
  if (!db) {
    throw new Error("Persistence is not configured.");
  }

  const digest = await db.dailyDigest.findUnique({
    where: { shareSlug: slug },
  });

  if (!digest || digest.status !== "ready") {
    return null;
  }

  return {
    digest,
    content: parseStoredDigestContent(digest.contentJson),
  };
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
  now = new Date(),
) {
  return getDigestByDayKey(userId, getBeijingDigestDayKey(now));
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
    where: {
      status: "active",
    },
  });

  const result: DigestCycleResult = {
    processed: 0,
    ready: 0,
    failed: 0,
    skipped: 0,
  };

  if (!hasBeijingDailyRunPassed(now)) {
    result.skipped = profiles.length;
    return result;
  }

  const digestDayKey = getBeijingDigestDayKey(now);

  for (const profile of profiles) {
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
        dateLabel: formatInTimeZone(now, DIGEST_TIMEZONE, "MMMM d, yyyy"),
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

export async function retryDigest(
  userId: string,
  digestDayKey: string,
  { provider = createDigestProvider() }: { provider?: DigestProvider } = {},
) {
  if (!db) {
    throw new Error("Persistence is not configured.");
  }

  const digest = await db.dailyDigest.findUnique({
    where: { userId_digestDayKey: { userId, digestDayKey } },
  });

  if (!digest) {
    throw new Error("Digest not found.");
  }

  if (digest.status === "ready" && digest.contentJson) {
    const parsed = parseStoredDigestContent(digest.contentJson);
    if (parsed) {
      throw new Error("Digest is already ready.");
    }
  }

  await db.dailyDigest.update({
    where: { userId_digestDayKey: { userId, digestDayKey } },
    data: {
      status: "generating",
      failureReason: null,
      contentJson: Prisma.DbNull,
      title: null,
      intro: null,
      readingTime: null,
    },
  });

  // Fire-and-forget: don't await the LLM call
  generateDigestInBackground(userId, digestDayKey, digest.retryCount, provider).catch(
    (error) => console.error(`[retryDigest] background generation failed:`, error),
  );
}

function getDateLabelForDigestDayKey(digestDayKey: string) {
  const [year, month, day] = digestDayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  return formatInTimeZone(date, DIGEST_TIMEZONE, "MMMM d, yyyy");
}

async function generateDigestInBackground(
  userId: string,
  digestDayKey: string,
  retryCount: number,
  provider: DigestProvider,
) {
  try {
    const profile = await db!.interestProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new Error("Interest profile not found.");
    }

    const result = await generateDigest({
      provider,
      dateLabel: getDateLabelForDigestDayKey(digestDayKey),
      interestText: profile.interestText,
    });

    await db!.dailyDigest.update({
      where: { userId_digestDayKey: { userId, digestDayKey } },
      data: {
        status: "ready",
        title: result.title,
        intro: result.intro,
        contentJson: result,
        readingTime: result.readingTime,
        providerName: provider.name ?? null,
        providerModel: provider.model ?? null,
        failureReason: null,
      },
    });
  } catch (error) {
    await db!.dailyDigest.update({
      where: { userId_digestDayKey: { userId, digestDayKey } },
      data: {
        status: "failed",
        retryCount: retryCount + 1,
        failureReason: getErrorMessage(error),
      },
    });
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Digest generation failed.";
}
