import { addDays } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

export function normalizeTimezone(value?: string | null) {
  if (!value) return "UTC";

  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return value;
  } catch {
    return "UTC";
  }
}

export function getDigestDayKey(timezone: string, now = new Date()) {
  return formatInTimeZone(now, timezone, "yyyy-MM-dd");
}

export function hasDailyRunPassed(timezone: string, now = new Date()) {
  return Number(formatInTimeZone(now, timezone, "HH")) >= 7;
}

export function getNextDigestDayKey(timezone: string, now = new Date()) {
  const zonedNow = toZonedTime(now, timezone);
  return formatInTimeZone(addDays(zonedNow, 1), timezone, "yyyy-MM-dd");
}
