import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { shareDigest } from "@/lib/digest/service";

export async function POST(request: Request) {
  if (!db) {
    return NextResponse.json(
      { ok: false, error: "Persistence is not configured." },
      { status: 500 },
    );
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { digestDayKey } = await request.json();

  if (!digestDayKey || typeof digestDayKey !== "string") {
    return NextResponse.json(
      { ok: false, error: "digestDayKey is required." },
      { status: 400 },
    );
  }

  try {
    const shareUrl = await shareDigest(user.id, digestDayKey);
    return NextResponse.json({ ok: true, shareUrl });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Share failed.";
    const status = message === "Digest not found." ? 404 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
