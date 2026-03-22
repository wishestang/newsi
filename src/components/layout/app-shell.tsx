import { MobileTopBar } from "@/components/layout/mobile-top-bar";
import { SideNav } from "@/components/layout/side-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col bg-[var(--surface)] md:flex-row">
        <MobileTopBar />
        <div className="hidden shrink-0 border-r border-nav-rail-border bg-nav-rail md:block">
          <SideNav />
        </div>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
