import { isAuthConfigured, isPersistenceConfigured } from "@/lib/env";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!isPersistenceConfigured() || !isAuthConfigured()) {
    return Response.json({
      ok: true,
      skipped: "preview-mode",
    });
  }

  return Response.json({
    ok: true,
    skipped: "not-implemented",
  });
}
