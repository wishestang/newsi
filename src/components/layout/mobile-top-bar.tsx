"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { getNavigationItemLabel } from "@/components/layout/navigation-items";
import { MobileNavDrawer } from "@/components/layout/mobile-nav-drawer";

export function MobileTopBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const currentLabel = getNavigationItemLabel(pathname);

  return (
    <>
      <header className="flex items-center justify-between border-b border-nav-rail-border bg-nav-rail px-4 py-3 md:hidden">
        <div className="font-heading text-lg font-bold text-foreground">
          Newsi
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-nav-foreground">
          {currentLabel}
        </div>
        <button
          aria-label="Open navigation"
          className="rounded-md px-2 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-nav-foreground transition-[background-color,color] duration-200 hover:bg-nav-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          onClick={() => setOpen(true)}
          type="button"
        >
          Menu
        </button>
      </header>
      <MobileNavDrawer
        onClose={() => setOpen(false)}
        open={open}
        pathname={pathname}
      />
    </>
  );
}
