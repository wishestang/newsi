import Link from "next/link";

export function PreviewActions({
  onConfirmAction,
  onRetryAction,
  canConfirm = false,
  canRetry = false,
}: {
  onConfirmAction?: () => Promise<void>;
  onRetryAction?: () => Promise<void>;
  canConfirm?: boolean;
  canRetry?: boolean;
}) {
  return (
    <div className="mx-auto flex max-w-3xl gap-4 px-10 pb-20">
      {canConfirm && onConfirmAction ? (
        <form action={onConfirmAction}>
          <button className="bg-stone-950 px-4 py-2 text-sm text-white">
            Confirm and start daily digests
          </button>
        </form>
      ) : null}
      {canRetry && onRetryAction ? (
        <form action={onRetryAction}>
          <button className="border border-stone-300 px-4 py-2 text-sm text-stone-700">
            Try again
          </button>
        </form>
      ) : null}
      <Link
        href="/topics"
        className="border border-stone-300 px-4 py-2 text-sm text-stone-700"
      >
        Back to Topics
      </Link>
    </div>
  );
}
