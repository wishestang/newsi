import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { isAuthConfigured } from "@/lib/env";

export const authOptions: NextAuthOptions = isAuthConfigured()
  ? {
      adapter: PrismaAdapter(db!),
      providers: [
        GoogleProvider({
          clientId: process.env.AUTH_GOOGLE_ID ?? "",
          clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
        }),
      ],
      pages: {
        signIn: "/signin",
      },
      session: {
        strategy: "database",
      },
    }
  : {
      providers: [],
      pages: {
        signIn: "/signin",
      },
      session: {
        strategy: "jwt",
      },
    };
