type DigestSection = {
  title: string;
  summary: string[];
  keyPoints: string[];
  whyItMatters?: string;
};

export function DigestView({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: DigestSection[];
}) {
  return (
    <article className="mx-auto max-w-3xl px-10 py-20">
      <h1 className="text-5xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">{intro}</p>
      <div className="mt-16 space-y-16">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-2xl font-semibold tracking-tight">
              {section.title}
            </h2>
            <div className="mt-6 space-y-4 text-base leading-8 text-stone-700">
              {section.summary.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <ul className="mt-6 space-y-3 text-sm text-stone-600">
              {section.keyPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            {section.whyItMatters ? (
              <p className="mt-6 text-sm italic text-stone-500">
                {section.whyItMatters}
              </p>
            ) : null}
          </section>
        ))}
      </div>
    </article>
  );
}
