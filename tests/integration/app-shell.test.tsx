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

  it("shows a bottom account summary with name and email when expanded", () => {
    render(
      <AppShell user={demoUser}>
        <div>Body</div>
      </AppShell>,
    );

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();

    const accountTrigger = screen.getByRole("button", { name: /ada lovelace/i });
    expect(accountTrigger).toHaveAttribute("aria-haspopup", "dialog");
  });

  it("opens an upward account panel with profile info and sign out", () => {
    render(
      <AppShell user={demoUser}>
        <div>Body</div>
      </AppShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: /ada lovelace/i }));

    const panel = screen.getByRole("dialog");
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
    fireEvent.click(accountTrigger!);

    const panel = screen.getByRole("dialog");
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
