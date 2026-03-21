import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { isAuthConfigured } from "@/lib/env";

export const authOptions: NextAuthOptions = isAuthConfigured()
  ? {
      secret: process.env.AUTH_SECRET,
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
      secret: process.env.AUTH_SECRET,
      providers: [],
      pages: {
        signIn: "/signin",
      },
      session: {
        strategy: "jwt",
      },
    };
