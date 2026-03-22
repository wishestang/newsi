"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

export function PreviewGenerationKickoff() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      await fetch("/api/preview/generate", {
        method: "POST",
      });

      if (!cancelled) {
        startTransition(() => {
          router.refresh();
        });
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
