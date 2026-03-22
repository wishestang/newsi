import { SideNav } from "@/components/layout/side-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-foreground">
      <div className="mx-auto min-h-screen max-w-[1600px] bg-[var(--surface)] md:grid md:grid-cols-[256px_1fr]">
        <div className="border-b border-[var(--border)] bg-[var(--background)] md:border-r md:border-b-0">
          <SideNav />
        </div>
        <main>{children}</main>
      </div>
    </div>
  );
}
