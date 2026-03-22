"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/today", label: "Today", icon: "/icon-calendar.svg", iconW: 13.5, iconH: 15 },
  { href: "/history", label: "History", icon: "/icon-archive.svg", iconW: 13.5, iconH: 13.5 },
  { href: "/topics", label: "Topics", icon: "/icon-topics.svg", iconW: 15, iconH: 14.25 },
];

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="px-8 py-12">
      <div className="mb-16 flex items-center justify-between px-1">
        <Link href="/today" className="flex items-center gap-2">
          <Image src="/icon-sparkle.svg" alt="" width={16.5} height={16.5} />
          <span className="font-heading text-[20px] font-bold leading-7 tracking-[-0.5px] text-foreground">
            Newsi
          </span>
        </Link>
        <div className="p-1">
          <Image src="/icon-panel-toggle.svg" alt="" width={15} height={15} />
        </div>
      </div>
      <nav className="flex flex-col gap-8">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-4"
            >
              <Image src={item.icon} alt="" width={item.iconW} height={item.iconH} />
              <span
                className={`font-mono text-[11px] uppercase tracking-[2.2px] leading-[16.5px] ${
                  isActive
                    ? "font-bold text-foreground"
                    : "font-normal text-text-muted"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
