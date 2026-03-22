import { SideNav } from "@/components/layout/side-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1600px] bg-[var(--surface)]">
        <div className="shrink-0 border-b border-[var(--border)] bg-[var(--background)] md:border-r md:border-b-0">
          <SideNav />
        </div>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
