"use client";

import { useState, useCallback } from "react";

export function ShareButton({ digestDayKey }: { digestDayKey: string }) {
  const [state, setState] = useState<"idle" | "loading" | "copied">("idle");

  const handleShare = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/digests/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ digestDayKey }),
      });

      const data = await res.json();

      if (data.ok && data.shareUrl) {
        await navigator.clipboard.writeText(data.shareUrl);
        setState("copied");
        setTimeout(() => setState("idle"), 2000);
      } else {
        setState("idle");
      }
    } catch {
      setState("idle");
    }
  }, [digestDayKey]);

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={state === "loading"}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-foreground disabled:opacity-50"
      aria-label="Share this digest"
    >
      {state === "copied" ? (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          已复制
        </>
      ) : (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Share
        </>
      )}
    </button>
  );
}
