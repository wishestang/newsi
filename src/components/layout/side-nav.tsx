"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarOutlined,
  InboxOutlined,
  AppstoreOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";

const items = [
  { href: "/today", label: "Today", Icon: CalendarOutlined },
  { href: "/history", label: "History", Icon: InboxOutlined },
  { href: "/topics", label: "Topics", Icon: AppstoreOutlined },
];

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16.5"
      height="16.5"
      viewBox="0 0 16.5 16.5"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13.5 6L12.5625 3.9375L10.5 3L12.5625 2.0625L13.5 0L14.4375 2.0625L16.5 3L14.4375 3.9375L13.5 6V6M13.5 16.5L12.5625 14.4375L10.5 13.5L12.5625 12.5625L13.5 10.5L14.4375 12.5625L16.5 13.5L14.4375 14.4375L13.5 16.5V16.5M6 14.25L4.125 10.125L0 8.25L4.125 6.375L6 2.25L7.875 6.375L12 8.25L7.875 10.125L6 14.25V14.25"
        fill="currentColor"
      />
    </svg>
  );
}

export function SideNav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex flex-col px-4 py-12 transition-all duration-200 ${
        collapsed ? "w-[60px] items-center" : "w-[256px] px-8"
      }`}
    >
      {/* Brand header */}
      <div
        className={`mb-16 flex items-center ${
          collapsed ? "justify-center" : "justify-between px-1"
        }`}
      >
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="text-text-muted hover:text-foreground"
          >
            <MenuUnfoldOutlined style={{ fontSize: 15 }} />
          </button>
        ) : (
          <>
            <Link href="/today" className="flex items-center gap-2">
              <SparkleIcon className="text-foreground" />
              <span className="font-heading text-[20px] font-bold leading-7 tracking-[-0.5px] text-foreground">
                Newsi
              </span>
            </Link>
            <button
              onClick={() => setCollapsed(true)}
              className="p-1 text-text-muted hover:text-foreground"
            >
              <MenuFoldOutlined style={{ fontSize: 15 }} />
            </button>
          </>
        )}
      </div>

      {/* Nav items */}
      <nav className={`flex flex-col ${collapsed ? "gap-6 items-center" : "gap-8"}`}>
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const color = isActive ? "var(--foreground)" : "var(--text-muted)";

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center ${collapsed ? "justify-center" : "gap-4"}`}
              title={collapsed ? item.label : undefined}
            >
              <item.Icon style={{ fontSize: 14, color }} />
              {!collapsed && (
                <span
                  className={`font-mono text-[11px] uppercase tracking-[2.2px] leading-[16.5px] ${
                    isActive
                      ? "font-bold text-foreground"
                      : "font-normal text-text-muted"
                  }`}
                >
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
