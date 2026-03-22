import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/layout/app-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/today",
}));

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

const demoUser = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  image: null,
};

describe("AppShell", () => {
  it("renders the primary navigation items", () => {
    render(
      <AppShell>
        <div>Body</div>
      </AppShell>,
    );

    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByText("Topics")).toBeInTheDocument();
  });

  it("uses a full-width shell instead of a centered max-width frame", () => {
    const { container } = render(
      <AppShell>
        <div>Body</div>
      </AppShell>,
    );

    expect(container.querySelector(".mx-auto")).toBeNull();
    expect(container.querySelector(".max-w-\\[1600px\\]")).toBeNull();
  });

  it("renders the Newsi brand name", () => {
    render(
      <AppShell>
        <div>Body</div>
      </AppShell>,
    );

    expect(screen.getByText("Newsi")).toBeInTheDocument();
  });

  it("renders sidebar icons from public assets", () => {
    render(
      <AppShell>
        <div>Body</div>
      </AppShell>,
    );

    expect(screen.getByAltText("Today icon")).toHaveAttribute(
      "src",
      expect.stringContaining("/icon-calendar.svg"),
    );
    expect(screen.getByAltText("History icon")).toHaveAttribute(
      "src",
      expect.stringContaining("/icon-archive.svg"),
    );
    expect(screen.getByAltText("Topics icon")).toHaveAttribute(
      "src",
      expect.stringContaining("/icon-topics.svg"),
    );
    expect(screen.getByAltText("Collapse navigation")).toHaveAttribute(
      "src",
      expect.stringContaining("/icon-panel-toggle.svg"),
    );
    expect(screen.getByAltText("Collapse navigation")).not.toHaveClass("opacity-60");
  });

  it("keeps collapsed sidebar controls centered within the narrow rail", () => {
    render(
      <AppShell>
        <div>Body</div>
      </AppShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Collapse navigation" }));

    expect(screen.getByRole("complementary")).toHaveClass(
      "w-[60px]",
      "min-w-[60px]",
      "max-w-[60px]",
      "px-0",
    );
    expect(screen.getByRole("button", { name: "Expand navigation" })).toHaveClass(
      "w-full",
      "justify-center",
    );
    expect(screen.getByRole("link", { name: "Today icon" })).toHaveClass(
      "w-full",
      "justify-center",
    );
  });

  it("renders a stable sidebar footer slot even without a signed-in user", () => {
    const { container } = render(
      <AppShell>
        <div>Body</div>
      </AppShell>,
    );

    expect(container.querySelector("aside > .mt-auto")).not.toBeNull();
  });

  it("stretches the sidebar column so the footer can anchor to the bottom", () => {
    render(
      <AppShell user={demoUser}>
        <div>Body</div>
      </AppShell>,
    );

    const sideNav = screen.getByRole("complementary");
    expect(sideNav).toHaveClass("h-full");
    expect(sideNav.parentElement).toHaveClass("flex");
  });

  it("matches the viewport height without pinning the rail during page scroll", () => {
    render(
      <AppShell user={demoUser}>
        <div className="h-[2000px]">Tall body</div>
      </AppShell>,
    );

    expect(screen.getByRole("complementary").parentElement).toHaveClass(
      "self-start",
      "h-screen",
    );
    expect(screen.getByRole("complementary").parentElement).not.toHaveClass(
      "sticky",
      "top-0",
    );
  });

  it("locks the shell to the viewport and makes only the main content area scroll", () => {
    const { container } = render(
      <AppShell user={demoUser}>
        <div className="h-[2000px]">Tall body</div>
      </AppShell>,
    );

    expect(container.firstElementChild).toHaveClass("h-screen", "overflow-hidden");
    expect(screen.getByRole("main")).toHaveClass("overflow-y-auto");
  });

  it("shows a bottom account summary without email in the expanded trigger", () => {
    render(
      <AppShell user={demoUser}>
        <div>Body</div>
      </AppShell>,
    );

    const accountTrigger = screen.getByRole("button", { name: /ada lovelace/i });
    expect(within(accountTrigger).getByText("Ada Lovelace")).toBeInTheDocument();
    expect(within(accountTrigger).queryByText("ada@example.com")).toBeNull();
    expect(accountTrigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(accountTrigger).toHaveClass("rounded-2xl", "px-3", "py-2.5");
    expect(accountTrigger).not.toHaveClass(
      "border",
      "bg-[rgba(255,255,255,0.72)]",
    );
  });

  it("opens an upward account panel with profile info and sign out", () => {
    render(
      <AppShell user={demoUser}>
        <div>Body</div>
      </AppShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: /ada lovelace/i }));

    const panel = screen.getByRole("dialog");
    expect(panel).toHaveClass(
      "rounded-[18px]",
      "bg-[rgba(255,255,255,0.96)]",
      "shadow-[0_18px_38px_rgba(15,23,42,0.08)]",
    );
    expect(within(panel).getByText("Ada Lovelace")).toBeInTheDocument();
    expect(within(panel).getByText("ada@example.com")).toBeInTheDocument();
    expect(
      within(panel).getByRole("button", { name: "Sign Out" }),
    ).toBeInTheDocument();
  });

  it("keeps only the avatar trigger in the collapsed footer and still opens the account panel", () => {
    render(
      <AppShell user={demoUser}>
        <div>Body</div>
      </AppShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Collapse navigation" }));

    expect(screen.queryByText("ada@example.com")).not.toBeInTheDocument();

    const footerButtons = screen.getAllByRole("button");
    const accountTrigger = footerButtons.find((button) =>
      button.getAttribute("title")?.includes("Ada Lovelace"),
    );

    expect(accountTrigger).toBeDefined();
    expect(accountTrigger).toHaveClass("h-8", "w-8");
    expect(accountTrigger?.parentElement).toHaveClass("flex", "justify-center");
    fireEvent.click(accountTrigger!);

    const panel = screen.getByRole("dialog");
    expect(panel).toHaveClass("left-full", "ml-3", "translate-x-0");
    expect(within(panel).getByText("Ada Lovelace")).toBeInTheDocument();
    expect(within(panel).getByText("ada@example.com")).toBeInTheDocument();
  });

  it("closes the account panel on repeated trigger clicks and outside clicks", () => {
    render(
      <AppShell user={demoUser}>
        <div>Body</div>
      </AppShell>,
    );

    const accountTrigger = screen.getByRole("button", { name: /ada lovelace/i });

    fireEvent.click(accountTrigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(accountTrigger);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(accountTrigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
