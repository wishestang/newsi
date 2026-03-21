"use client";

import { useEffect, useState } from "react";

export function TopicsForm({
  initialValue,
  onSubmitAction,
}: {
  initialValue: string;
  onSubmitAction: (formData: FormData) => void | Promise<void>;
}) {
  const [timezone, setTimezone] = useState("UTC");

  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  }, []);

  return (
    <form action={onSubmitAction} className="mx-auto max-w-3xl px-10 py-20">
      <h1 className="text-5xl font-semibold tracking-tight">
        What are you exploring?
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-stone-500">
        Describe your interests in plain language. Newsi will use them as your
        standing brief for future daily digests.
      </p>
      <input type="hidden" name="browserTimezone" value={timezone} />
      <textarea
        aria-label="Describe your interests"
        name="interestText"
        defaultValue={initialValue}
        placeholder="Describe your interests in plain language..."
        className="mt-12 min-h-[220px] w-full resize-none border-none bg-transparent text-lg leading-8 outline-none"
      />
      <button className="mt-10 bg-stone-950 px-4 py-2 text-sm text-white">
        Save interests
      </button>
    </form>
  );
}
