import Link from "next/link";

export function ArchiveList({
  items,
}: {
  items: { digestDayKey: string; title: string; readingTime: number }[];
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
          <span>{item.readingTime} min</span>
        </Link>
      ))}
    </div>
  );
}
