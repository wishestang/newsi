import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { TopicsForm } from "@/components/topics/topics-form";
import { db } from "@/lib/db";
import { isLocalPreviewMode } from "@/lib/env";
import {
  buildPreviewInterestProfile,
  parsePreviewInterestProfile,
  PREVIEW_INTEREST_COOKIE,
} from "@/lib/preview-state";
import {
  clearInterestProfile,
  saveInterestProfile,
} from "@/lib/topics/service";

export default async function TopicsPage() {
  if (isLocalPreviewMode() || !db) {
    const cookieStore = await cookies();
    const previewProfile = parsePreviewInterestProfile(
      cookieStore.get(PREVIEW_INTEREST_COOKIE)?.value,
    );

    async function saveTopicsPreview(formData: FormData) {
      "use server";

      const profile = buildPreviewInterestProfile({
        interestText: String(formData.get("interestText") ?? ""),
        browserTimezone: String(formData.get("browserTimezone") ?? "UTC"),
      });

      const nextCookies = await cookies();
      nextCookies.set(PREVIEW_INTEREST_COOKIE, JSON.stringify(profile), {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });

      redirect("/preview");
    }

    async function clearTopicsPreview() {
      "use server";

      const nextCookies = await cookies();
      nextCookies.delete(PREVIEW_INTEREST_COOKIE);
      redirect("/today");
    }

    return (
      <TopicsForm
        initialValue={previewProfile?.interestText ?? ""}
        onSubmitAction={saveTopicsPreview}
        onClearAction={clearTopicsPreview}
      />
    );
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/signin");
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    include: { interestProfile: true },
  });

  if (!user) {
    redirect("/signin");
  }

  const currentUser = user;

  async function saveTopics(formData: FormData) {
    "use server";

    await saveInterestProfile(currentUser.id, {
      interestText: formData.get("interestText"),
      browserTimezone: formData.get("browserTimezone"),
    });

    revalidatePath("/topics");
    revalidatePath("/today");
    revalidatePath("/preview");
    redirect("/preview");
  }

  async function clearTopics() {
    "use server";

    await clearInterestProfile(currentUser.id);
    revalidatePath("/topics");
    revalidatePath("/today");
    revalidatePath("/history");
    redirect("/today");
  }

  return (
    <TopicsForm
      initialValue={currentUser.interestProfile?.interestText ?? ""}
      onSubmitAction={saveTopics}
      onClearAction={clearTopics}
    />
  );
}
