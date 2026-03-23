"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

const kickedOffGenerationTokens = new Set<string>();

export function PreviewGenerationKickoff({
  generationToken,
}: {
  generationToken: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (kickedOffGenerationTokens.has(generationToken)) {
      return;
    }

    kickedOffGenerationTokens.add(generationToken);
    let cancelled = false;

    async function run() {
      try {
        const response = await fetch("/api/preview/generate", {
          method: "POST",
        });

        if (!response.ok) {
          kickedOffGenerationTokens.delete(generationToken);
          return;
        }

        if (!cancelled) {
          startTransition(() => {
            router.refresh();
          });
        }
      } catch {
        kickedOffGenerationTokens.delete(generationToken);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [generationToken, router]);

  return null;
}
