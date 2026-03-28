"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DigestSkeleton } from "@/components/digest/digest-skeleton";
import { StatusPanel } from "@/components/states/status-panel";

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function HistoryRetryPanel({
  digestDayKey,
  label,
  body,
}: {
  digestDayKey: string;
  label: string;
  body: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "polling" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function pollUntilReady() {
    for (let i = 0; i < 60; i += 1) {
      await sleep(3000);

      try {
        const res = await fetch(
          `/api/digests/status?digestDayKey=${encodeURIComponent(digestDayKey)}`,
        );

        if (!res.ok) {
          continue;
        }

        const data = await res.json();

        if (data.status === "ready") {
          router.refresh();
          return;
        }

        if (data.status === "failed") {
          setError(data.failureReason ?? "Generation failed.");
          setStatus("error");
          return;
        }
      } catch {
        // ignore transient poll errors and keep trying
      }
    }

    setError("Timed out waiting for digest generation.");
    setStatus("error");
  }

  async function handleRetry() {
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/digests/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ digestDayKey }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Retry failed.");
        setStatus("error");
        return;
      }

      setStatus("polling");
      void pollUntilReady();
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  }

  if (status === "loading" || status === "polling") {
    return <DigestSkeleton />;
  }

  return (
    <StatusPanel
      label={label}
      body={error ?? body}
      action={
        <div className="flex justify-center">
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 rounded bg-stone-950 px-4 py-2 text-sm text-white"
          >
            Retry
          </button>
        </div>
      }
    />
  );
}
