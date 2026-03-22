import { SideNav } from "@/components/layout/side-nav";
import type { SideNavUser } from "@/components/layout/side-nav";

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: SideNavUser | null;
}) {
  return (
    <div className="h-screen overflow-hidden bg-[var(--background)] text-foreground">
      <div className="flex h-full w-full bg-[var(--surface)]">
        <div className="flex h-screen shrink-0 self-start border-b border-[var(--border)] bg-[var(--background)] md:border-r md:border-b-0">
          <SideNav user={user} />
        </div>
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
