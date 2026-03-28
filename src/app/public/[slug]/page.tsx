import Image from "next/image";
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
          showEndMarker={false}
        />
      </main>

      <footer className="border-t border-[var(--border-solid)] px-6 py-16">
        <div className="mx-auto flex max-w-[520px] flex-col items-center text-center">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[3px] text-[var(--text-muted)]">
            Made with Newsi
          </p>
          <Link
            href="/"
            className="mt-3 flex items-center gap-2.5 font-heading text-[32px] font-bold tracking-[-0.6px] text-foreground"
          >
            <Image
              src="/icon-sparkle.svg"
              alt=""
              width={18}
              height={18}
              aria-hidden="true"
            />
            <span>Newsi</span>
          </Link>
          <p className="mt-4 max-w-[34ch] font-sans text-[15px] leading-7 text-[var(--text-muted)]">
            One brief, one digest, every day. Cut through the noise, focus on what
            matters.
          </p>
          <Link
            href="/"
            className="mt-5 border-b border-current pb-0.5 font-mono text-[11px] font-bold uppercase tracking-[2px] text-foreground transition-colors hover:text-[var(--text-muted)]"
          >
            Create Your Brief
          </Link>
        </div>
      </footer>
    </div>
  );
}
