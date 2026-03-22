import {
  AppstoreOutlined,
  CalendarOutlined,
  InboxOutlined,
} from "@ant-design/icons";

export const navigationItems = [
  { href: "/today", label: "Today", shortLabel: "T", Icon: CalendarOutlined },
  { href: "/history", label: "History", shortLabel: "H", Icon: InboxOutlined },
  { href: "/topics", label: "Topics", shortLabel: "P", Icon: AppstoreOutlined },
] as const;

export function isNavigationItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getNavigationItemLabel(pathname: string) {
  return (
    navigationItems.find((item) => isNavigationItemActive(pathname, item.href))
      ?.label ?? "Today"
  );
}
