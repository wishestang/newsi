import { describe, expect, it, vi } from "vitest";
import { fetchMatchingDataSources } from "@/lib/datasources/registry";

vi.mock("@/lib/datasources/github-trending", () => ({
  createGitHubTrendingSource: () => ({
    id: "github-trending",
    name: "GitHub Trending",
    matches: (text: string) => /github\s*trending/i.test(text),
    fetch: vi.fn().mockResolvedValue({
      sourceName: "GitHub Trending",
      markdown: "| # | Repo |\n|---|------|\n| 1 | test |",
    }),
  }),
}));

vi.mock("@/lib/datasources/us-stock-movers", () => ({
  createUSStockMoversSource: () => ({
    id: "us-stock-movers",
    name: "US Stock Movers",
    matches: (text: string) => /美股|us\s*stock/i.test(text),
    fetch: vi.fn().mockResolvedValue({
      sourceName: "US Stock Movers (Yahoo Finance)",
      markdown: "| # | Symbol |\n|---|--------|\n| 1 | AAPL |",
    }),
  }),
}));

describe("fetchMatchingDataSources", () => {
  it("returns results for matching interest text", async () => {
    const results = await fetchMatchingDataSources("GitHub Trending repos");
    expect(results).toHaveLength(1);
    expect(results[0].sourceName).toBe("GitHub Trending");
  });

  it("returns US stock results for stock-related text", async () => {
    const results = await fetchMatchingDataSources("US stock market");
    expect(results).toHaveLength(1);
    expect(results[0].sourceName).toBe("US Stock Movers (Yahoo Finance)");
  });

  it("returns empty array for non-matching interest text", async () => {
    const results = await fetchMatchingDataSources("天气预报");
    expect(results).toEqual([]);
  });

  it("returns multiple results when multiple sources match", async () => {
    const results = await fetchMatchingDataSources(
      "GitHub Trending 和美股行情",
    );
    expect(results).toHaveLength(2);
  });
});
