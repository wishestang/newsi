function Bar({ className }: { className?: string }) {
  return (
    <div
      className={`rounded bg-[var(--border-list)] ${className ?? ""}`}
    />
  );
}

function EventBlock() {
  return (
    <div className="flex flex-col gap-4">
      {/* h4 event title */}
      <Bar className="h-5 w-3/5" />
      {/* description lines */}
      <div className="flex flex-col gap-2">
        <Bar className="h-4 w-full" />
        <Bar className="h-4 w-full" />
        <Bar className="h-4 w-4/5" />
      </div>
      {/* blockquote insight */}
      <div className="flex gap-3">
        <div className="w-0.5 shrink-0 rounded bg-[var(--border-list)]" />
        <div className="flex flex-1 flex-col gap-2">
          <Bar className="h-4 w-full" />
          <Bar className="h-4 w-3/4" />
        </div>
      </div>
      {/* source line */}
      <Bar className="h-3 w-2/5" />
    </div>
  );
}

function TopicBlock() {
  return (
    <div className="flex flex-col gap-10">
      {/* topic heading */}
      <Bar className="h-7 w-2/5" />

      <div className="flex flex-col gap-4">
        {/* intro paragraph */}
        <Bar className="h-4 w-full" />
        <Bar className="h-4 w-3/4" />
      </div>

      {/* separator */}
      <Bar className="h-px w-full" />

      <EventBlock />

      <Bar className="h-px w-full" />

      <EventBlock />

      <Bar className="h-px w-full" />

      {/* closing takeaway blockquote */}
      <div className="flex gap-3">
        <div className="w-0.5 shrink-0 rounded bg-[var(--border-list)]" />
        <Bar className="h-4 w-3/5" />
      </div>
    </div>
  );
}

export function DigestSkeleton() {
  return (
    <article className="mx-auto max-w-[680px] animate-pulse px-10 py-32">
      {/* Date header */}
      <div className="flex items-center gap-4 pb-8">
        <Bar className="h-3 w-28" />
        <div className="h-px flex-1 bg-[var(--border)]" />
      </div>

      {/* Title */}
      <Bar className="h-10 w-4/5" />

      {/* Intro */}
      <div className="mt-4 flex flex-col gap-2">
        <Bar className="h-4 w-full" />
        <Bar className="h-4 w-2/3" />
      </div>

      {/* Topic blocks */}
      <div className="mt-16 flex flex-col gap-[96px]">
        <TopicBlock />
        <TopicBlock />
      </div>
    </article>
  );
}
