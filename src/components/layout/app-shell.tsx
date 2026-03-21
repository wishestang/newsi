import { SideNav } from "@/components/layout/side-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <div className="mx-auto min-h-screen max-w-[1600px] bg-white md:grid md:grid-cols-[220px_1fr]">
        <div className="border-b border-stone-200 md:border-r md:border-b-0">
          <SideNav />
        </div>
        <main>{children}</main>
      </div>
    </div>
  );
}
