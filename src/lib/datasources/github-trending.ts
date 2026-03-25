import * as cheerio from "cheerio";
import type { DataSource, DataSourceResult } from "./types";

const TRENDING_URL = "https://github.com/trending?since=daily";

const MATCH_PATTERNS = [
  /github\s*trending/i,
  /github\s*趋势/i,
  /github\s*热门/i,
  /github\s*热榜/i,
];

interface TrendingRepo {
  name: string;
  url: string;
  description: string;
  todayStars: string;
}

export function matchesGitHubTrending(interestText: string): boolean {
  return MATCH_PATTERNS.some((p) => p.test(interestText));
}

export function parseTrendingHtml(html: string): TrendingRepo[] {
  const $ = cheerio.load(html);
  const repos: TrendingRepo[] = [];

  $("article.Box-row").each((_, el) => {
    const $el = $(el);
    const repoLink = $el.find("h2 a");
    const href = repoLink.attr("href")?.trim() ?? "";
    const name = repoLink
      .text()
      .replace(/\s+/g, " ")
      .trim()
      .replace(" / ", "/");
    const description = $el.find("p").first().text().trim();
    const starsEl = $el.find("span.d-inline-block.float-sm-right");
    const todayStars = starsEl.text().trim();

    if (name && href) {
      repos.push({
        name,
        url: `https://github.com${href}`,
        description: description || "—",
        todayStars: todayStars || "—",
      });
    }
  });

  return repos;
}

export function formatTrendingMarkdown(repos: TrendingRepo[]): string {
  if (repos.length === 0) return "";

  const header = "| # | Repository | Description | Today's Stars |";
  const separator = "|---|-----------|-------------|---------------|";
  const rows = repos.map(
    (r, i) =>
      `| ${i + 1} | [${r.name}](${r.url}) | ${r.description} | ${r.todayStars} |`,
  );

  return [header, separator, ...rows].join("\n");
}

export function createGitHubTrendingSource(): DataSource {
  return {
    id: "github-trending",
    name: "GitHub Trending",
    matches: matchesGitHubTrending,
    async fetch(): Promise<DataSourceResult> {
      const res = await fetch(TRENDING_URL);
      if (!res.ok) {
        throw new Error(`GitHub Trending fetch failed: ${res.status}`);
      }
      const html = await res.text();
      const repos = parseTrendingHtml(html);
      return {
        sourceName: "GitHub Trending",
        markdown: formatTrendingMarkdown(repos),
      };
    },
  };
}
