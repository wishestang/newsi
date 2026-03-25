import { describe, expect, it, vi } from "vitest";
import {
  matchesUSStocks,
  parseScreenerResponse,
  formatMoversMarkdown,
  createUSStockMoversSource,
} from "@/lib/datasources/us-stock-movers";

describe("matchesUSStocks", () => {
  it.each([
    "美股行情",
    "US stocks",
    "us stock market",
    "Wall Street",
    "NASDAQ",
    "S&P 500",
    "道琼斯指数",
    "纳斯达克",
    "标普500",
  ])('matches "%s"', (text) => {
    expect(matchesUSStocks(text)).toBe(true);
  });

  it.each(["GitHub Trending", "AI agents", "天气预报"])(
    'does not match "%s"',
    (text) => {
      expect(matchesUSStocks(text)).toBe(false);
    },
  );
});

const SAMPLE_RESPONSE = {
  finance: {
    result: [
      {
        quotes: [
          {
            symbol: "AAPL",
            shortName: "Apple Inc.",
            regularMarketPrice: 178.5,
            regularMarketChange: 5.2,
            regularMarketChangePercent: 3.0,
          },
          {
            symbol: "TSLA",
            shortName: "Tesla, Inc.",
            regularMarketPrice: 245.0,
            regularMarketChange: 12.3,
            regularMarketChangePercent: 5.28,
          },
        ],
      },
    ],
  },
};

describe("parseScreenerResponse", () => {
  it("extracts stock quotes from Yahoo Finance response", () => {
    const quotes = parseScreenerResponse(SAMPLE_RESPONSE);
    expect(quotes).toHaveLength(2);
    expect(quotes[0]).toEqual({
      symbol: "AAPL",
      shortName: "Apple Inc.",
      regularMarketPrice: 178.5,
      regularMarketChange: 5.2,
      regularMarketChangePercent: 3.0,
    });
  });

  it("returns empty array for invalid response", () => {
    expect(parseScreenerResponse({})).toEqual([]);
    expect(parseScreenerResponse(null)).toEqual([]);
    expect(parseScreenerResponse({ finance: {} })).toEqual([]);
  });
});

describe("formatMoversMarkdown", () => {
  const gainers = parseScreenerResponse(SAMPLE_RESPONSE);
  const losers = [
    {
      symbol: "META",
      shortName: "Meta Platforms",
      regularMarketPrice: 480.0,
      regularMarketChange: -15.5,
      regularMarketChangePercent: -3.13,
    },
  ];

  it("generates markdown with gainers and losers sections", () => {
    const md = formatMoversMarkdown(gainers, losers);

    expect(md).toContain("### Top Gainers");
    expect(md).toContain("### Top Losers");
    expect(md).toContain("Apple Inc. (AAPL)");
    expect(md).toContain("+5.20 (+3.00%)");
    expect(md).toContain("Meta Platforms (META)");
    expect(md).toContain("-15.50 (-3.13%)");
    expect(md).toContain("| Business |");
    expect(md).toContain("| Reason |");
    expect(md).toContain("{{FILL}}");
  });

  it("puts symbol in parentheses after name, not a separate column", () => {
    const md = formatMoversMarkdown(gainers, []);
    expect(md).toContain("| # | Name | Business |");
    expect(md).not.toContain("| Symbol |");
    expect(md).toContain("Apple Inc. (AAPL)");
  });

  it("omits section when no data", () => {
    const md = formatMoversMarkdown(gainers, []);
    expect(md).toContain("### Top Gainers");
    expect(md).not.toContain("### Top Losers");
  });

  it("returns empty string when both empty", () => {
    expect(formatMoversMarkdown([], [])).toBe("");
  });
});

describe("createUSStockMoversSource", () => {
  it("has correct id and name", () => {
    const source = createUSStockMoversSource();
    expect(source.id).toBe("us-stock-movers");
    expect(source.name).toBe("US Stock Movers");
  });

  it("fetches gainers and losers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(SAMPLE_RESPONSE),
      }),
    );

    const source = createUSStockMoversSource();
    const result = await source.fetch();

    expect(result.sourceName).toBe("US Stock Movers (Yahoo Finance)");
    expect(result.markdown).toContain("AAPL");
    expect(result.markdown).toContain("TSLA");
    expect(fetch).toHaveBeenCalledTimes(2);

    vi.unstubAllGlobals();
  });

  it("throws on fetch failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );

    const source = createUSStockMoversSource();
    await expect(source.fetch()).rejects.toThrow("Yahoo Finance fetch failed: 503");

    vi.unstubAllGlobals();
  });
});
