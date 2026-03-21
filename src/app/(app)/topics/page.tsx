import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { TopicsForm } from "@/components/topics/topics-form";
import { db } from "@/lib/db";
import { isLocalPreviewMode } from "@/lib/env";
import { saveInterestProfile } from "@/lib/topics/service";

export default async function TopicsPage() {
  if (isLocalPreviewMode() || !db) {
    async function saveTopicsPreview(_formData: FormData) {
      "use server";
    }

    return <TopicsForm initialValue="" onSubmitAction={saveTopicsPreview} />;
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
  }

  return (
    <TopicsForm
      initialValue={currentUser.interestProfile?.interestText ?? ""}
      onSubmitAction={saveTopics}
    />
  );
}
