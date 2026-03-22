"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export interface SideNavUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

const items = [
  { href: "/today", label: "Today", iconSrc: "/icon-calendar.svg" },
  { href: "/history", label: "History", iconSrc: "/icon-archive.svg" },
  { href: "/topics", label: "Topics", iconSrc: "/icon-topics.svg" },
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

function getUserLabels(user: SideNavUser) {
  const primaryLabel = user.name ?? user.email ?? "Account";
  const secondaryLabel = user.name && user.email ? user.email : null;
  const initials = primaryLabel
    .split(/[\s@]/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  return { initials, primaryLabel, secondaryLabel };
}

function UserIdentity({
  user,
  showText,
}: {
  user: SideNavUser;
  showText: boolean;
}) {
  const { initials, primaryLabel, secondaryLabel } = getUserLabels(user);

  return (
    <>
      {user.image ? (
        <img
          src={user.image}
          alt=""
          className="h-8 w-8 rounded-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-border-solid text-[10px] font-bold text-text-muted">
          {initials}
        </div>
      )}
      {showText ? (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {primaryLabel}
          </p>
          {secondaryLabel ? (
            <p className="truncate text-xs text-text-muted">{secondaryLabel}</p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function UserSummaryBar({
  user,
  collapsed,
  open,
  onClick,
}: {
  user: SideNavUser;
  collapsed: boolean;
  open: boolean;
  onClick: () => void;
}) {
  const { primaryLabel, secondaryLabel } = getUserLabels(user);
  const ariaLabel = secondaryLabel
    ? `${primaryLabel} ${secondaryLabel}`
    : primaryLabel;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={ariaLabel}
      title={collapsed ? primaryLabel : undefined}
      className={
        collapsed
          ? "flex w-full justify-center"
          : "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-[rgba(0,0,0,0.03)]"
      }
    >
      <UserIdentity user={user} showText={!collapsed} />
    </button>
  );
}

function UserAccountPopover({
  user,
  collapsed,
}: {
  user: SideNavUser;
  collapsed: boolean;
}) {
  return (
    <div
      role="dialog"
      aria-label="Account panel"
      className={`absolute bottom-full mb-3 ${
        collapsed ? "left-1/2 -translate-x-1/2" : "left-0"
      } z-50 w-56 rounded-xl border border-border-solid bg-white p-3 shadow-[0_2px_12px_rgba(0,0,0,0.08)]`}
    >
      <div className="flex items-center gap-3">
        <UserIdentity user={user} showText />
      </div>
      <div className="mt-3 border-t border-border-solid pt-3">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/signin" })}
          className="w-full rounded-md px-1 py-1.5 text-left font-mono text-[11px] uppercase tracking-[2.2px] text-text-muted hover:text-foreground"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

export function SideNav({ user }: { user?: SideNavUser | null }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [accountPopoverOpen, setAccountPopoverOpen] = useState(false);
  const footerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountPopoverOpen) return;

    function handleClick(event: MouseEvent) {
      if (footerRef.current?.contains(event.target as Node)) {
        return;
      }

      setAccountPopoverOpen(false);
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [accountPopoverOpen]);

  return (
    <aside
      className={`flex flex-col py-12 transition-all duration-200 ${
        collapsed
          ? "w-[60px] min-w-[60px] max-w-[60px] px-0"
          : "w-[256px] min-w-[256px] max-w-[256px] px-8"
      }`}
    >
      {/* Brand header */}
      <div
        className={`mb-16 flex items-center ${
          collapsed ? "w-full justify-center" : "justify-between px-1"
        }`}
      >
        {collapsed ? (
          <button
            onClick={() => {
              setAccountPopoverOpen(false);
              setCollapsed(false);
            }}
            className="flex w-full justify-center text-text-muted hover:text-foreground"
          >
            <Image
              src="/icon-panel-toggle.svg"
                alt="Expand navigation"
                width={15}
                height={15}
                className="rotate-180 transition-transform"
              />
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
              onClick={() => {
                setAccountPopoverOpen(false);
                setCollapsed(true);
              }}
              className="p-1 text-text-muted hover:text-foreground"
            >
              <Image
                src="/icon-panel-toggle.svg"
                alt="Collapse navigation"
                width={15}
                height={15}
                className="transition-transform"
              />
            </button>
          </>
        )}
      </div>

      {/* Nav items */}
      <nav className={`flex flex-col ${collapsed ? "w-full gap-6" : "gap-8"}`}>
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center ${collapsed ? "w-full justify-center" : "gap-4"}`}
              title={collapsed ? item.label : undefined}
            >
              <Image
                src={item.iconSrc}
                alt={`${item.label} icon`}
                width={14}
                height={14}
                className={isActive ? "opacity-100" : "opacity-60"}
              />
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

      {/* User avatar & sign out */}
      <div
        ref={footerRef}
        className={collapsed ? "mt-auto flex w-full justify-center" : "mt-auto"}
      >
        {user ? (
          <div className="relative w-full">
            <UserSummaryBar
              user={user}
              collapsed={collapsed}
              open={accountPopoverOpen}
              onClick={() => setAccountPopoverOpen((open) => !open)}
            />
            {accountPopoverOpen ? (
              <UserAccountPopover user={user} collapsed={collapsed} />
            ) : null}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
