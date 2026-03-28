import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DigestView } from "@/components/digest/digest-view";
import { db } from "@/lib/db";
import { getSharedDigest } from "@/lib/digest/service";
import { formatDigestDate } from "@/lib/digest/format";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;

  if (!db) {
    return { title: "Digest Not Found" };
  }

  const result = await getSharedDigest(slug);

  if (!result || !result.content) {
    return { title: "Digest Not Found" };
  }

  const { digest, content } = result;
  const date = formatDigestDate(digest.digestDayKey);

  return {
    title: `${digest.title ?? content.title} — ${date}`,
    description: digest.intro ?? content.intro ?? "A shared Newsi digest.",
  };
}

export default async function PublicDigestPage({ params }: PageProps) {
  const { slug } = await params;

  if (!db) {
    notFound();
  }

  const result = await getSharedDigest(slug);

  if (!result) {
    notFound();
  }

  const { digest, content } = result;

  if (!content) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <DigestView
          title={digest.title ?? content.title}
          intro={digest.intro ?? content.intro}
          topics={content.topics}
          digestDate={formatDigestDate(digest.digestDayKey)}
        />
      </main>

      <footer className="border-t border-[var(--border-solid)] py-8 text-center">
        <p className="font-sans text-sm text-[var(--text-muted)]">
          由{" "}
          <Link
            href="/"
            className="underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Newsi
          </Link>{" "}
          生成 · 创建你的每日简报
        </p>
      </footer>
    </div>
  );
}
