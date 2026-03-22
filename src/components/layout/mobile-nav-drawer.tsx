"use client";

import Link from "next/link";
import {
  getNavigationItemLabel,
  isNavigationItemActive,
  navigationItems,
} from "@/components/layout/navigation-items";

type MobileNavDrawerProps = {
  onClose: () => void;
  open: boolean;
  pathname: string;
};

export function MobileNavDrawer({
  onClose,
  open,
  pathname,
}: MobileNavDrawerProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        aria-label="Dismiss navigation"
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
        type="button"
      />
      <div
        aria-label="Navigation"
        className="relative h-full w-[280px] max-w-[85vw] border-r border-nav-rail-border bg-nav-rail px-4 py-5 shadow-xl"
        role="dialog"
      >
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="font-heading text-lg font-bold text-foreground">
              Newsi
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-nav-foreground">
              {getNavigationItemLabel(pathname)}
            </div>
          </div>
          <button
            aria-label="Close navigation"
            className="rounded-md px-2 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-nav-foreground transition-[background-color,color] duration-200 hover:bg-nav-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <nav aria-label="Primary" className="flex flex-col gap-6">
          {navigationItems.map((item) => {
            const isActive = isNavigationItemActive(pathname, item.href);

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 transition-[background-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
                  isActive
                    ? "bg-nav-active text-nav-active-foreground"
                    : "text-nav-foreground hover:bg-nav-hover hover:text-foreground"
                }`}
                href={item.href}
                key={item.href}
                onClick={onClose}
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${
                    isActive ? "bg-accent" : "bg-nav-marker"
                  }`}
                />
                <span
                  className={`font-mono text-[11px] uppercase tracking-[0.18em] ${
                    isActive
                      ? "font-bold text-nav-active-foreground"
                      : "font-normal text-nav-foreground"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
