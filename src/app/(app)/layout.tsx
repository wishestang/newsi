import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { isLocalPreviewMode } from "@/lib/env";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (isLocalPreviewMode()) {
    return <AppShell>{children}</AppShell>;
  }

  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/signin");
  }

  return (
    <AppShell
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
    >
      {children}
    </AppShell>
  );
}
