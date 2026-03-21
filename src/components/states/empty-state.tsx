export function EmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-10 py-20">
      <h1 className="text-5xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">{body}</p>
    </section>
  );
}
