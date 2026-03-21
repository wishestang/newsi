export default function TodayPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-100 text-stone-900">
      <div className="w-full max-w-3xl px-10 py-20">
        <p className="text-xs uppercase tracking-[0.32em] text-stone-500">
          Today
        </p>
        <h1 className="mt-6 text-5xl font-semibold tracking-tight">Today&apos;s Synthesis</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
          The authenticated app shell is now wired. Topics, archive, and digest generation come next.
        </p>
      </div>
    </main>
  );
}
