/**
 * Format a YYYY-MM-DD day key into an uppercase date string.
 * Example: "2023-10-24" → "OCTOBER 24, 2023"
 */
export function formatDigestDate(dayKey: string): string {
  const [year, month, day] = dayKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date
    .toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    .toUpperCase();
}

/**
 * Get today's date formatted for display.
 */
export function formatTodayDate(timezone?: string): string {
  const now = new Date();
  return now
    .toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: timezone ?? "UTC",
    })
    .toUpperCase();
}
