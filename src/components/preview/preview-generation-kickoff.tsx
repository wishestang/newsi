"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const previewGenerationRequests = new Map<string, Promise<boolean>>();

export function PreviewGenerationKickoff({
  generationToken,
}: {
  generationToken: string;
}) {
  const router = useRouter();

  useEffect(() => {
    let request = previewGenerationRequests.get(generationToken);

    if (!request) {
      request = fetch("/api/preview/generate", {
        method: "POST",
      })
        .then((response) => {
          if (!response.ok) {
            previewGenerationRequests.delete(generationToken);
            return false;
          }

          return true;
        })
        .catch(() => {
          previewGenerationRequests.delete(generationToken);
          return false;
        });

      previewGenerationRequests.set(generationToken, request);
    }

    let cancelled = false;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    void request.then((ok) => {
      if (cancelled || !ok) {
        return;
      }

      router.refresh();
      pollInterval = setInterval(() => {
        router.refresh();
      }, 1000);
    });

    return () => {
      cancelled = true;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [generationToken, router]);

  return null;
}
