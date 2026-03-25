import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  normalizeLocale,
} from "@/lib/i18n/config";

describe("i18n config", () => {
  it("exposes the supported locales and default locale", () => {
    expect(SUPPORTED_LOCALES).toEqual(["en", "zh"]);
    expect(DEFAULT_LOCALE).toBe("en");
  });

  it("recognizes supported and unsupported locales", () => {
    expect(isSupportedLocale("en")).toBe(true);
    expect(isSupportedLocale("zh")).toBe(true);
    expect(isSupportedLocale("fr")).toBe(false);
  });

  it("falls back to the default locale for invalid values", () => {
    expect(normalizeLocale("fr")).toBe(DEFAULT_LOCALE);
    expect(normalizeLocale(undefined)).toBe(DEFAULT_LOCALE);
    expect(normalizeLocale(new FormData().get("missing"))).toBe(DEFAULT_LOCALE);
  });

  it("uses a stable locale cookie name", () => {
    expect(LOCALE_COOKIE_NAME).toBe("newsi-locale");
  });
});
