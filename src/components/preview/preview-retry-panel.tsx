"use client";

import Link from "next/link";
import { useState } from "react";
import { DigestSkeleton } from "@/components/digest/digest-skeleton";
import { StatusPanel } from "@/components/states/status-panel";

export function PreviewRetryPanel({
  body,
  onRetryAction,
}: {
  body: string;
  onRetryAction: () => Promise<void>;
}) {
  const [isRetrying, setIsRetrying] = useState(false);

  if (isRetrying) {
    return (
      <>
        <DigestSkeleton />
        <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-4 px-10 pb-20">
          <Link
            href="/topics"
            className="border border-stone-300 px-4 py-2 text-sm text-stone-700"
          >
            Back to Topics
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <StatusPanel label="Failed" body={body} />
      <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-4 px-10 pb-20">
        <form action={onRetryAction}>
          <button
            type="submit"
            onClick={() => setIsRetrying(true)}
            className="border border-stone-300 px-4 py-2 text-sm text-stone-700"
          >
            Try again
          </button>
        </form>
        <Link
          href="/topics"
          className="border border-stone-300 px-4 py-2 text-sm text-stone-700"
        >
          Back to Topics
        </Link>
      </div>
    </>
  );
}
