import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { DigestView } from "@/components/digest/digest-view";
import { PreviewActions } from "@/components/preview/preview-actions";
import { PreviewGenerationKickoff } from "@/components/preview/preview-generation-kickoff";
import { StatusPanel } from "@/components/states/status-panel";
import { db } from "@/lib/db";
import { isLocalPreviewMode } from "@/lib/env";
import { formatTodayDate } from "@/lib/digest/format";
import {
  confirmPreviewInterestProfile,
  parsePreviewInterestProfile,
  PREVIEW_INTEREST_COOKIE,
  retryPreviewGeneration,
} from "@/lib/preview-state";
import {
  confirmPreviewDigest,
  getPreviewDigest,
  retryPreviewDigest,
} from "@/lib/preview-digest/service";

export default async function PreviewPage() {
  if (isLocalPreviewMode()) {
    const cookieStore = await cookies();
    const profile = parsePreviewInterestProfile(
      cookieStore.get(PREVIEW_INTEREST_COOKIE)?.value,
    );

    if (!profile || profile.status !== "pending_preview") {
      return redirect("/topics");
    }

    async function confirmPreviewAction() {
      "use server";

      const nextCookies = await cookies();
      const nextProfile = parsePreviewInterestProfile(
        nextCookies.get(PREVIEW_INTEREST_COOKIE)?.value,
      );

      if (!nextProfile) {
        redirect("/topics");
      }

      nextCookies.set(
        PREVIEW_INTEREST_COOKIE,
        JSON.stringify(confirmPreviewInterestProfile(nextProfile)),
        {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 30,
        },
      );

      redirect("/today");
    }

    async function retryPreviewAction() {
      "use server";

      const nextCookies = await cookies();
      const nextProfile = parsePreviewInterestProfile(
        nextCookies.get(PREVIEW_INTEREST_COOKIE)?.value,
      );

      if (!nextProfile) {
        redirect("/topics");
      }

      nextCookies.set(
        PREVIEW_INTEREST_COOKIE,
        JSON.stringify(retryPreviewGeneration(nextProfile)),
        {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 30,
        },
      );

      redirect("/preview");
    }

    if (profile.preview.status === "generating") {
      return (
        <>
          <PreviewGenerationKickoff />
          <StatusPanel
            label="Generating"
            body="Newsi is preparing a real preview digest from your current Topics."
          />
          <PreviewActions />
        </>
      );
    }

    if (profile.preview.status === "failed") {
      return (
        <>
          <StatusPanel
            label="Failed"
            body={profile.preview.failureReason ?? "Preview generation failed. Try again."}
          />
          <PreviewActions onRetryAction={retryPreviewAction} canRetry />
        </>
      );
    }

    const previewDigest = profile.preview.digest;

    if (!previewDigest) {
      return (
        <>
          <StatusPanel
            label="Unavailable"
            body="Preview content is stored, but it does not match the readable digest format."
          />
          <PreviewActions onRetryAction={retryPreviewAction} canRetry />
        </>
      );
    }

    return (
      <>
        <DigestView
          title={previewDigest.title}
          intro={previewDigest.intro}
          sections={previewDigest.sections}
          digestDate={formatTodayDate()}
        />
        <PreviewActions onConfirmAction={confirmPreviewAction} canConfirm />
      </>
    );
  }

  if (!db) {
    return redirect("/topics");
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
    revalidatePath("/history");
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
    return (
      <>
        <PreviewGenerationKickoff />
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
        digestDate={formatTodayDate()}
      />
      <PreviewActions onConfirmAction={confirmAction} canConfirm />
    </>
  );
}

export const dynamic = "force-dynamic";
