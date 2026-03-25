import type { Locale } from "@/lib/i18n/config";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";

export type Messages = {
  meta: {
    title: string;
    description: string;
  };
  nav: {
    today: string;
    archive: string;
    topics: string;
  };
  localeSwitcher: {
    label: string;
    en: string;
    zh: string;
  };
  signin: {
    eyebrow: string;
    preview: string;
    unavailable: string;
  };
};

export const messages = {
  en: {
    meta: {
      title: "Newsi",
      description: "Personal daily synthesis for knowledge workers.",
    },
    nav: {
      today: "Today",
      archive: "History",
      topics: "Topics",
    },
    localeSwitcher: {
      label: "Language",
      en: "English",
      zh: "中文",
    },
    signin: {
      eyebrow: "Personal Daily Synthesis",
      preview: "Open preview",
      unavailable: "Auth is not configured in this environment.",
    },
  },
  zh: {
    meta: {
      title: "Newsi",
      description: "面向知识工作者的每日摘要。",
    },
    nav: {
      today: "今天",
      archive: "历史",
      topics: "主题",
    },
    localeSwitcher: {
      label: "语言",
      en: "English",
      zh: "中文",
    },
    signin: {
      eyebrow: "个人每日摘要",
      preview: "打开预览",
      unavailable: "当前环境未配置身份验证。",
    },
  },
} satisfies Record<Locale, Messages>;

export function getMessages(locale: Locale) {
  return messages[locale] ?? messages[DEFAULT_LOCALE];
}
