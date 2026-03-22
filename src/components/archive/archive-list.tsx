import Link from "next/link";

type ArchiveItem = {
  digestDayKey: string;
  title: string;
  readingTime?: number | null;
  status?: "scheduled" | "generating" | "failed" | "ready";
};

export function ArchiveList({ items }: { items: ArchiveItem[] }) {
  const groups = groupByMonth(items);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 sm:px-10">
      {groups.map((group, gi) => (
        <section key={group.label} className={gi > 0 ? "mt-12" : ""}>
          <h2 className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">
            {group.label}
            <span className="h-px flex-1 bg-stone-100" />
          </h2>

          <div className="mt-2">
            {group.items.map((item, i) => {
              const isLatest = gi === 0 && i === 0;
              const date = parseDayKey(item.digestDayKey);

              return (
                <Link
                  key={item.digestDayKey}
                  href={`/history/${item.digestDayKey}`}
                  className="group flex items-baseline border-b border-stone-100 py-5"
                >
                  {/* Date column */}
                  <span className="w-24 shrink-0 text-sm text-stone-400">
                    {date}
                  </span>

                  {/* Title */}
                  <span
                    className={`flex-1 text-sm ${
                      isLatest
                        ? "font-semibold text-stone-900"
                        : "text-stone-500"
                    }`}
                  >
                    {item.title}
                  </span>

                  {/* Meta */}
                  <span className="ml-4 shrink-0 text-sm text-stone-400">
                    {getArchiveMetaLabel(item)}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function groupByMonth(items: ArchiveItem[]) {
  const groups: { label: string; items: ArchiveItem[] }[] = [];
  const map = new Map<string, ArchiveItem[]>();

  for (const item of items) {
    // digestDayKey format: "YYYY-MM-DD"
    const [year, month] = item.digestDayKey.split("-");
    const key = `${year}-${month}`;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(item);
  }

  for (const [key, groupItems] of map) {
    const [year, month] = key.split("-");
    const monthName = MONTH_NAMES[Number(month) - 1];
    groups.push({
      label: `${monthName} ${year}`,
      items: groupItems,
    });
  }

  return groups;
}

function parseDayKey(dayKey: string): string {
  // "YYYY-MM-DD" -> "Oct 24"
  const [, month, day] = dayKey.split("-");
  const mon = MONTH_SHORT[Number(month) - 1];
  const d = Number(day);
  return `${mon} ${d}`;
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
