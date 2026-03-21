export function StatusPanel({
  label,
  body,
}: {
  label: string;
  body: string;
}) {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-10 py-20">
      <p className="text-xs uppercase tracking-[0.32em] text-stone-400">
        {label}
      </p>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">{body}</p>
    </section>
  );
}
