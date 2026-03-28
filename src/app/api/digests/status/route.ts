import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const digestDayKey = searchParams.get("digestDayKey");

  if (!digestDayKey) {
    return NextResponse.json(
      { ok: false, error: "digestDayKey is required." },
      { status: 400 },
    );
  }

  const digest = await db.dailyDigest.findUnique({
    where: { userId_digestDayKey: { userId: user.id, digestDayKey } },
    select: {
      status: true,
      failureReason: true,
    },
  });

  if (!digest) {
    return NextResponse.json(
      { ok: false, error: "Digest not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    status: digest.status,
    failureReason: digest.failureReason,
  });
}
