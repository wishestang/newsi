import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "@/components/layout/app-shell";

describe("AppShell", () => {
  it("renders the primary navigation items", () => {
    render(
      <AppShell>
        <div>Body</div>
      </AppShell>,
    );

    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Archive")).toBeInTheDocument();
    expect(screen.getByText("Topics")).toBeInTheDocument();
  });
});
