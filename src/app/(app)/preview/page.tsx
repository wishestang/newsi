import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { DigestView } from "@/components/digest/digest-view";
import { PreviewActions } from "@/components/preview/preview-actions";
import { StatusPanel } from "@/components/states/status-panel";
import { db } from "@/lib/db";
import {
  confirmPreviewDigest,
  getPreviewDigest,
  retryPreviewDigest,
  startPreviewDigestGeneration,
} from "@/lib/preview-digest/service";

export default async function PreviewPage() {
  if (!db) {
    redirect("/topics");
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/signin");
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return redirect("/signin");
  }

  const currentUser = user;

  async function confirmAction() {
    "use server";

    await confirmPreviewDigest(currentUser.id);
    revalidatePath("/preview");
    revalidatePath("/today");
    revalidatePath("/archive");
    revalidatePath("/topics");
    redirect("/today");
  }

  async function retryAction() {
    "use server";

    await retryPreviewDigest(currentUser.id);
    revalidatePath("/preview");
    redirect("/preview");
  }

  const preview = await getPreviewDigest(currentUser.id);

  if (!preview) {
    return redirect("/topics");
  }

  if (preview.previewDigest.status === "generating") {
    void startPreviewDigestGeneration(currentUser.id);

    return (
      <>
        <StatusPanel
          label="Generating"
          body="Newsi is preparing a real preview digest from your current Topics."
        />
        <PreviewActions />
      </>
    );
  }

  if (preview.previewDigest.status === "failed") {
    return (
      <>
        <StatusPanel
          label="Failed"
          body={preview.previewDigest.failureReason ?? "Preview generation failed. Try again."}
        />
        <PreviewActions onRetryAction={retryAction} canRetry />
      </>
    );
  }

  if (!preview.content) {
    return (
      <>
        <StatusPanel
          label="Unavailable"
          body="Preview content is stored, but it does not match the readable digest format."
        />
        <PreviewActions onRetryAction={retryAction} canRetry />
      </>
    );
  }

  return (
    <>
      <DigestView
        title={preview.previewDigest.title ?? preview.content.title}
        intro={preview.previewDigest.intro ?? preview.content.intro}
        sections={preview.content.sections}
      />
      <PreviewActions onConfirmAction={confirmAction} canConfirm />
    </>
  );
}

export const dynamic = "force-dynamic";
