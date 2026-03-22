import Image from "next/image";
import { DigestMarkdown } from "@/components/digest/digest-markdown";

type DigestSection = {
  title: string;
  summary: string[];
  keyPoints: string[];
  whyItMatters?: string;
};

function KeyPoint({ text }: { text: string }) {
  return (
    <div className="relative pl-[42px]">
      <div className="absolute left-[24px] top-[8px] size-[6px] bg-accent" />
      <div className="font-sans text-[17px] leading-[28.9px] text-[var(--text-body)] [&_strong]:text-foreground">
        <DigestMarkdown content={text} />
      </div>
    </div>
  );
}

export function DigestView({
  title,
  digestDate,
  sections,
}: {
  title: string;
  intro: string;
  digestDate: string;
  sections: DigestSection[];
}) {
  return (
    <article className="mx-auto max-w-[680px] px-10 py-32">
      {/* Date header */}
      <div className="flex items-center gap-4 pb-8">
        <div className="flex flex-col items-start">
          <span className="whitespace-nowrap font-mono text-[11px] font-bold uppercase leading-[16.5px] tracking-[2.2px] text-text-muted">
            {digestDate}
          </span>
        </div>
        <div className="h-px flex-1 bg-[var(--border)]" />
      </div>

      {/* Title */}
      <h1 className="font-heading text-[40px] font-bold leading-[44px] tracking-[-0.8px] text-foreground">
        {title}
      </h1>

      {/* Intro — kept in props for backward compat but not rendered per Figma design */}

      {/* Sections */}
      <div className="mt-16 flex flex-col gap-[96px]">
        {sections.map((section) => (
          <section key={section.title} className="flex flex-col gap-8">
            <h2 className="font-heading text-[24px] font-bold leading-[33px] tracking-[-0.24px] text-foreground">
              {section.title}
            </h2>
            <div className="flex flex-col gap-[23.4px]">
              <DigestMarkdown content={section.summary.join("\n\n")} />
              {section.keyPoints.length > 0 && (
                <div className="flex flex-col gap-4 border-t border-[var(--border-list)] pt-[17.61px]">
                  {section.keyPoints.map((point) => (
                    <KeyPoint key={point} text={point} />
                  ))}
                </div>
              )}
            </div>
            {section.whyItMatters ? (
              <div className="text-sm italic text-text-muted">
                <DigestMarkdown content={section.whyItMatters} />
              </div>
            ) : null}
          </section>
        ))}
      </div>

      {/* Footer */}
      <div className="pt-32">
        <div className="flex flex-col items-center border-t border-[var(--border-solid)] pt-[65px]">
          <Image
            src="/icon-sparkle-footer.svg"
            alt=""
            width={18.33}
            height={42.33}
          />
          <span className="font-mono text-[11px] uppercase leading-[16.5px] tracking-[3.3px] text-text-muted">
            End of Digest
          </span>
        </div>
      </div>
    </article>
  );
}
