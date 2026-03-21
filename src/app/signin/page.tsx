import Link from "next/link";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { isAuthConfigured } from "@/lib/env";

export default function SignInPage() {
  const authConfigured = isAuthConfigured();

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-950 text-stone-100">
      <div className="w-full max-w-md px-10 py-14">
        <p className="mb-4 text-xs uppercase tracking-[0.32em] text-stone-400">
          Personal Daily Synthesis
        </p>
        <h1 className="text-5xl font-semibold tracking-tight">Newsi</h1>
        <GoogleSignInButton />
        {!authConfigured ? (
          <div className="mt-6">
            <p className="text-sm text-stone-400">
              Auth is not configured in this environment.
            </p>
            <Link
              href="/today"
              className="mt-4 inline-flex items-center justify-center border border-stone-600 px-4 py-2 text-sm text-stone-100"
            >
              Open preview
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
