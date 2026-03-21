import Link from "next/link";

export function ArchiveList({
  items,
}: {
  items: {
    digestDayKey: string;
    title: string;
    readingTime?: number | null;
    status?: "scheduled" | "generating" | "failed" | "ready";
  }[];
}) {
  return (
    <div className="mx-auto max-w-4xl px-10 py-20">
      {items.map((item) => (
        <Link
          key={item.digestDayKey}
          href={`/archive/${item.digestDayKey}`}
          className="grid grid-cols-[120px_1fr_80px] border-b border-stone-200 py-5 text-sm"
        >
          <span>{item.digestDayKey}</span>
          <span>{item.title}</span>
          <span>{getArchiveMetaLabel(item)}</span>
        </Link>
      ))}
    </div>
  );
}

function getArchiveMetaLabel(item: {
  readingTime?: number | null;
  status?: "scheduled" | "generating" | "failed" | "ready";
}) {
  if (typeof item.readingTime === "number") {
    return `${item.readingTime} min`;
  }

  switch (item.status) {
    case "scheduled":
      return "Scheduled";
    case "generating":
      return "Generating";
    case "failed":
      return "Failed";
    default:
      return "Ready";
  }
}
