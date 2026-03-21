export function normalizeTimezone(value?: string | null) {
  if (!value) return "UTC";

  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return value;
  } catch {
    return "UTC";
  }
}
