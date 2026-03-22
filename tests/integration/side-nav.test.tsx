import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SideNav } from "@/components/layout/side-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/today",
}));

describe("SideNav", () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => storage[key] ?? null,
        setItem: (key: string, value: string) => {
          storage[key] = value;
        },
        removeItem: (key: string) => {
          delete storage[key];
        },
        clear: () => {
          storage = {};
        },
      },
    });
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("marks the current route with aria-current", () => {
    render(<SideNav />);

    const currentLink = screen.getByRole("link", { name: "Today" });

    expect(currentLink).toHaveAttribute("aria-current", "page");
    expect(currentLink.className).toContain("bg-nav-active");
    expect(currentLink.className).toContain("text-nav-active-foreground");
  });

  it("renders an accessible collapse toggle", () => {
    render(<SideNav />);

    expect(
      screen.getByRole("button", { name: "Collapse sidebar" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "History" }).className).toContain(
      "hover:bg-nav-hover",
    );
  });

  it("restores collapsed state from localStorage", () => {
    window.localStorage.setItem("newsi.sidebar.collapsed", "true");

    render(<SideNav />);

    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Today" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByText("T")).toBeInTheDocument();
  });
});
