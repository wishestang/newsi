import { describe, expect, it } from "vitest";
import { getMessages, messages } from "@/lib/i18n/messages";

describe("i18n messages", () => {
  it("provides English copy for en", () => {
    expect(getMessages("en")).toBe(messages.en);
    expect(messages.en.meta.title).toBe("Newsi");
    expect(messages.en.meta.description).toBe(
      "Personal daily synthesis for knowledge workers.",
    );
    expect(messages.en.nav.today).toBe("Today");
    expect(messages.en.localeSwitcher).toEqual({
      label: "Language",
      en: "English",
      zh: "中文",
    });
    expect(messages.en.signin).toEqual({
      eyebrow: "Personal Daily Synthesis",
      preview: "Open preview",
      unavailable: "Auth is not configured in this environment.",
    });
  });

  it("provides Chinese copy for zh", () => {
    expect(getMessages("zh")).toBe(messages.zh);
    expect(messages.zh.meta.title).toBe("Newsi");
    expect(messages.zh.meta.description).toBe("面向知识工作者的每日摘要。");
    expect(messages.zh.nav.today).toBe("今天");
    expect(messages.zh.localeSwitcher).toEqual({
      label: "语言",
      en: "English",
      zh: "中文",
    });
    expect(messages.zh.signin).toEqual({
      eyebrow: "个人每日摘要",
      preview: "打开预览",
      unavailable: "当前环境未配置身份验证。",
    });
  });

  it("keeps the message schema aligned across locales", () => {
    expect(Object.keys(messages.zh)).toEqual(Object.keys(messages.en));
    expect(Object.keys(messages.zh.localeSwitcher)).toEqual([
      "label",
      "en",
      "zh",
    ]);
    expect(Object.keys(messages.zh.signin)).toEqual([
      "eyebrow",
      "preview",
      "unavailable",
    ]);
  });
});
