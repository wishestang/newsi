import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { isPersistenceConfigured } from "@/lib/env";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient | null;
};

export function createPrismaClient() {
  if (!isPersistenceConfigured()) {
    return null;
  }

  if (process.env.NODE_ENV === "development") {
    try {
      const url = new URL(process.env.DATABASE_URL!);
      console.log("[db] Initializing PrismaClient", {
        host: url.hostname,
        port: url.port || "(default)",
        database: url.pathname.replace(/^\//, ""),
      });
    } catch (error) {
      console.warn("[db] Failed to parse DATABASE_URL", error);
    }
  }

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production" && globalForPrisma.prisma === undefined) {
  globalForPrisma.prisma = db;
}
