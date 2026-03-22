"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import {
  isNavigationItemActive,
  navigationItems,
} from "@/components/layout/navigation-items";

const STORAGE_KEY = "newsi.sidebar.collapsed";

function readStoredCollapsedState() {
  if (
    typeof window === "undefined" ||
    typeof window.localStorage?.getItem !== "function"
  ) {
    return false;
  }

  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

function persistCollapsedState(next: boolean) {
  if (typeof window.localStorage?.setItem !== "function") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, String(next));
}

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
  const [collapsed, setCollapsed] = useState(readStoredCollapsedState);

  function handleCollapsedChange(next: boolean) {
    setCollapsed(next);
    persistCollapsedState(next);
  }

  return (
    <aside
      className={`flex flex-col bg-nav-rail px-4 py-12 transition-[width,padding] duration-200 motion-reduce:transition-none ${
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
            aria-label="Expand sidebar"
            onClick={() => handleCollapsedChange(false)}
            className="rounded-md p-1 text-nav-foreground transition-[background-color,color] duration-200 hover:bg-nav-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none"
          >
            <MenuUnfoldOutlined aria-hidden style={{ fontSize: 15 }} />
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
              aria-label="Collapse sidebar"
              onClick={() => handleCollapsedChange(true)}
              className="rounded-md p-1 text-nav-foreground transition-[background-color,color] duration-200 hover:bg-nav-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none"
            >
              <MenuFoldOutlined aria-hidden style={{ fontSize: 15 }} />
            </button>
          </>
        )}
      </div>

      {/* Nav items */}
      <nav
        aria-label="Primary"
        className={`flex flex-col ${collapsed ? "gap-6 items-center" : "gap-8"}`}
      >
        {navigationItems.map((item) => {
          const isActive = isNavigationItemActive(pathname, item.href);
          const color = isActive ? "var(--foreground)" : "var(--text-muted)";

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              key={item.href}
              href={item.href}
              className={`flex rounded-[10px] transition-[background-color,color,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
                collapsed
                  ? "justify-center px-2.5 py-2.5"
                  : "items-center gap-4 px-3 py-2.5"
              } ${
                isActive
                  ? "bg-nav-active text-nav-active-foreground"
                  : "text-nav-foreground hover:bg-nav-hover hover:text-foreground"
              }`}
            >
              <item.Icon aria-hidden style={{ fontSize: 14, color }} />
              {collapsed ? (
                <span
                  aria-hidden="true"
                  className={`font-mono text-[11px] uppercase tracking-[2.2px] leading-[16.5px] ${
                    isActive
                      ? "font-bold text-nav-active-foreground"
                      : "font-normal text-nav-foreground"
                  }`}
                >
                  {item.shortLabel}
                </span>
              ) : (
                <span
                  className={`font-mono text-[11px] uppercase tracking-[2.2px] leading-[16.5px] ${
                    isActive
                      ? "font-bold text-nav-active-foreground"
                      : "font-normal text-nav-foreground"
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
