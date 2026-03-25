import type { DataSource, DataSourceResult } from "./types";

const GAINERS_URL =
  "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&lang=en-US&region=US&scrIds=day_gainers&count=5";
const LOSERS_URL =
  "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&lang=en-US&region=US&scrIds=day_losers&count=5";

const MATCH_PATTERNS = [
  /美股/i,
  /us\s*stock/i,
  /u\.?s\.?\s*equit/i,
  /wall\s*street/i,
  /nasdaq/i,
  /s&p\s*500/i,
  /道琼斯/i,
  /纳斯达克/i,
  /标普/i,
];

interface StockQuote {
  symbol: string;
  shortName: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
}

export function matchesUSStocks(interestText: string): boolean {
  return MATCH_PATTERNS.some((p) => p.test(interestText));
}

export function parseScreenerResponse(json: unknown): StockQuote[] {
  const data = json as {
    finance?: {
      result?: { quotes?: StockQuote[] }[];
    };
  };

  const quotes = data?.finance?.result?.[0]?.quotes;
  if (!Array.isArray(quotes)) return [];

  return quotes
    .filter((q) => q.symbol && typeof q.regularMarketChangePercent === "number")
    .map((q) => ({
      symbol: q.symbol,
      shortName: q.shortName ?? q.symbol,
      regularMarketPrice: q.regularMarketPrice ?? 0,
      regularMarketChange: q.regularMarketChange ?? 0,
      regularMarketChangePercent: q.regularMarketChangePercent ?? 0,
    }));
}

function formatChange(change: number, percent: number): string {
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(2)} (${sign}${percent.toFixed(2)}%)`;
}

export function formatMoversMarkdown(
  gainers: StockQuote[],
  losers: StockQuote[],
): string {
  if (gainers.length === 0 && losers.length === 0) return "";

  const sections: string[] = [];

  if (gainers.length > 0) {
    const header = "| # | Name | Business | Price | Change | Reason |";
    const sep = "|---|------|----------|-------|--------|--------|";
    const rows = gainers.map(
      (q, i) =>
        `| ${i + 1} | ${q.shortName} (${q.symbol}) | {{FILL}} | $${q.regularMarketPrice.toFixed(2)} | ${formatChange(q.regularMarketChange, q.regularMarketChangePercent)} | {{FILL}} |`,
    );
    sections.push(`### Top Gainers\n\n${[header, sep, ...rows].join("\n")}`);
  }

  if (losers.length > 0) {
    const header = "| # | Name | Business | Price | Change | Reason |";
    const sep = "|---|------|----------|-------|--------|--------|";
    const rows = losers.map(
      (q, i) =>
        `| ${i + 1} | ${q.shortName} (${q.symbol}) | {{FILL}} | $${q.regularMarketPrice.toFixed(2)} | ${formatChange(q.regularMarketChange, q.regularMarketChangePercent)} | {{FILL}} |`,
    );
    sections.push(`### Top Losers\n\n${[header, sep, ...rows].join("\n")}`);
  }

  sections.push(
    "**Instructions:** Keep this table format in your output. Replace every {{FILL}} in the Business column with the company's industry or main business (1-5 words), and every {{FILL}} in the Reason column with a brief reason for today's move (search for the cause). Do NOT expand rows into separate sections.",
  );

  return sections.join("\n\n");
}

async function fetchQuotes(url: string): Promise<StockQuote[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) {
    throw new Error(`Yahoo Finance fetch failed: ${res.status}`);
  }
  return parseScreenerResponse(await res.json());
}

export function createUSStockMoversSource(): DataSource {
  return {
    id: "us-stock-movers",
    name: "US Stock Movers",
    matches: matchesUSStocks,
    async fetch(): Promise<DataSourceResult> {
      const [gainers, losers] = await Promise.all([
        fetchQuotes(GAINERS_URL),
        fetchQuotes(LOSERS_URL),
      ]);
      return {
        sourceName: "US Stock Movers (Yahoo Finance)",
        markdown: formatMoversMarkdown(gainers, losers),
      };
    },
  };
}
