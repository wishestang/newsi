import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { isLocalPreviewMode } from "@/lib/env";
import {
  completePreviewGeneration,
  parsePreviewInterestProfile,
  PREVIEW_INTEREST_COOKIE,
} from "@/lib/preview-state";
import { startPreviewDigestGeneration } from "@/lib/preview-digest/service";

export async function POST() {
  if (isLocalPreviewMode()) {
    const cookieStore = await cookies();
    const profile = parsePreviewInterestProfile(
      cookieStore.get(PREVIEW_INTEREST_COOKIE)?.value,
    );

    if (!profile || profile.status !== "pending_preview") {
      return Response.json({ ok: true, skipped: "no-preview" });
    }

    if (profile.preview.status === "generating") {
      const nextProfile = completePreviewGeneration(
        profile,
        profile.preview.generationToken,
      );
      cookieStore.set(PREVIEW_INTEREST_COOKIE, JSON.stringify(nextProfile), {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return Response.json({ ok: true });
  }

  if (!db) {
    return Response.json({ ok: false, error: "Persistence is not configured." }, { status: 500 });
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  await startPreviewDigestGeneration(user.id);

  return Response.json({ ok: true });
}
