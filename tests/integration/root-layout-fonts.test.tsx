import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const localFontMock = vi.fn();
const manropeMock = vi.fn();
const ibmPlexSansMock = vi.fn();
const ibmPlexMonoMock = vi.fn();

vi.mock("next/font/local", () => ({
  default: localFontMock,
}));

vi.mock("next/font/google", () => ({
  Manrope: manropeMock,
  IBM_Plex_Sans: ibmPlexSansMock,
  IBM_Plex_Mono: ibmPlexMonoMock,
}));

describe("RootLayout font loading", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("loads local fonts and avoids Google font loaders", async () => {
    localFontMock
      .mockReturnValueOnce({ variable: "font-heading-local" })
      .mockReturnValueOnce({ variable: "font-sans-local" })
      .mockReturnValueOnce({ variable: "font-mono-local" });

    manropeMock.mockReturnValue({ variable: "font-heading-google" });
    ibmPlexSansMock.mockReturnValue({ variable: "font-sans-google" });
    ibmPlexMonoMock.mockReturnValue({ variable: "font-mono-google" });

    const { default: RootLayout } = await import("@/app/layout");
    const element = RootLayout({ children: <div>Child</div> });

    expect(localFontMock).toHaveBeenCalledTimes(3);
    expect(manropeMock).not.toHaveBeenCalled();
    expect(ibmPlexSansMock).not.toHaveBeenCalled();
    expect(ibmPlexMonoMock).not.toHaveBeenCalled();
    expect(element.props.className).toContain("font-heading-local");
    expect(element.props.className).toContain("font-sans-local");
    expect(element.props.className).toContain("font-mono-local");
  });
});
