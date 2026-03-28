"use client";

import { useState, useCallback } from "react";

function normalizeShareError(error: unknown) {
  if (typeof error !== "string" || !error.trim()) {
    return "分享服务暂时不可用。";
  }

  const normalized = error.toLowerCase();
  if (
    normalized.includes("shareslug") &&
    (normalized.includes("does not exist") ||
      normalized.includes("unknown field") ||
      normalized.includes("unknown argument") ||
      normalized.includes("column"))
  ) {
    return "分享链接生成失败。请查看本地服务日志里的 share 错误详情。";
  }

  if (normalized === "unauthorized") {
    return "当前登录态无效，请重新登录后再试。";
  }

  return error;
}

export function ShareButton({ digestDayKey }: { digestDayKey: string }) {
  const [state, setState] = useState<
    "idle" | "loading" | "copied" | "request-error" | "clipboard-error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleShare = useCallback(async () => {
    setState("loading");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/digests/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ digestDayKey }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok || !data.shareUrl) {
        setErrorMessage(normalizeShareError(data?.error));
        setState("request-error");
        setTimeout(() => setState("idle"), 2500);
        return;
      }

      try {
        await navigator.clipboard.writeText(data.shareUrl);
      } catch {
        setErrorMessage("链接已生成，但浏览器拒绝复制。");
        setState("clipboard-error");
        setTimeout(() => setState("idle"), 2500);
        return;
      }

      setState("copied");
      setErrorMessage(null);
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setErrorMessage("分享服务暂时不可用。");
      setState("request-error");
      setTimeout(() => setState("idle"), 2500);
    }
  }, [digestDayKey]);

  return (
    <div className="flex flex-col items-end gap-1">
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
        ) : state === "request-error" ? (
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
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            生成链接失败
          </>
        ) : state === "clipboard-error" ? (
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
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            复制失败
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
      {errorMessage ? (
        <p className="max-w-[240px] text-right text-[11px] leading-[16px] text-[var(--text-muted)]">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
