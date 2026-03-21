"use client";

import { signIn } from "next-auth/react";

export function GoogleSignInButton() {
  return (
    <button
      className="mt-10 inline-flex items-center justify-center bg-white px-4 py-2 text-sm font-medium text-stone-950"
      onClick={() => signIn("google", { callbackUrl: "/today" })}
      type="button"
    >
      Continue with Google
    </button>
  );
}
