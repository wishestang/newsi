import Image from "next/image";
import { DigestMarkdown } from "@/components/digest/digest-markdown";

type DigestTopic = {
  topic: string;
  eventsMarkdown: string;
  insightsMarkdown: string;
  takeawayMarkdown: string;
};

export function DigestView({
  title,
  digestDate,
  topics,
}: {
  title: string;
  intro?: string;
  digestDate: string;
  topics: DigestTopic[];
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

      {/* Topic blocks */}
      <div className="mt-16 flex flex-col gap-[96px]">
        {topics.map((topic) => (
          <section key={topic.topic} className="flex flex-col gap-10">
            <h2 className="font-heading text-[24px] font-bold leading-[33px] tracking-[-0.24px] text-foreground">
              {topic.topic}
            </h2>

            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <h3 className="font-mono text-[11px] font-bold uppercase leading-[16.5px] tracking-[2.2px] text-text-muted">
                  Top Events
                </h3>
                <div className="font-sans text-[17px] leading-[28.9px] text-[var(--text-body)] [&_strong]:text-foreground">
                  <DigestMarkdown content={topic.eventsMarkdown} />
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <h3 className="font-mono text-[11px] font-bold uppercase leading-[16.5px] tracking-[2.2px] text-text-muted">
                  Insights
                </h3>
                <div className="font-sans text-[17px] leading-[28.9px] text-[var(--text-body)] [&_strong]:text-foreground">
                  <DigestMarkdown content={topic.insightsMarkdown} />
                </div>
              </div>

              <div className="flex flex-col gap-4 border-t border-[var(--border-list)] pt-[17.61px]">
                <h3 className="font-mono text-[11px] font-bold uppercase leading-[16.5px] tracking-[2.2px] text-text-muted">
                  Takeaway
                </h3>
                <div className="font-sans text-[17px] leading-[28.9px] text-[var(--text-body)] [&_strong]:text-foreground">
                  <DigestMarkdown content={topic.takeawayMarkdown} />
                </div>
              </div>
            </div>
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
