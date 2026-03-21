import Link from "next/link";

const items = [
  { href: "/today", label: "Today" },
  { href: "/archive", label: "Archive" },
  { href: "/topics", label: "Topics" },
];

export function SideNav() {
  return (
    <aside className="px-6 py-8">
      <p className="mb-10 text-sm font-medium tracking-tight">Newsi</p>
      <nav className="space-y-4 text-sm text-stone-600">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="block">
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
