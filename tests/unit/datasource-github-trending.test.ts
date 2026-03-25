import { describe, expect, it, vi } from "vitest";
import {
  matchesGitHubTrending,
  parseTrendingHtml,
  formatTrendingMarkdown,
  createGitHubTrendingSource,
} from "@/lib/datasources/github-trending";

describe("matchesGitHubTrending", () => {
  it.each([
    "GitHub Trending",
    "github trending",
    "GitHub 趋势",
    "github 热门",
    "github 热榜",
    "关注 GitHub Trending 项目",
  ])('matches "%s"', (text) => {
    expect(matchesGitHubTrending(text)).toBe(true);
  });

  it.each(["US stocks", "AI agents", "GitHub issues"])(
    'does not match "%s"',
    (text) => {
      expect(matchesGitHubTrending(text)).toBe(false);
    },
  );
});

const SAMPLE_HTML = `
<article class="Box-row">
  <h2><a href="/owner/repo-one">owner / repo-one</a></h2>
  <p>A cool project</p>
  <span itemprop="programmingLanguage">TypeScript</span>
  <span class="d-inline-block float-sm-right">1,234 stars today</span>
</article>
<article class="Box-row">
  <h2><a href="/owner/repo-two">owner / repo-two</a></h2>
  <p>Another project</p>
  <span itemprop="programmingLanguage">Rust</span>
  <span class="d-inline-block float-sm-right">567 stars today</span>
</article>
`;

describe("parseTrendingHtml", () => {
  it("extracts repos from HTML", () => {
    const repos = parseTrendingHtml(SAMPLE_HTML);
    expect(repos).toHaveLength(2);
    expect(repos[0]).toEqual({
      name: "owner/repo-one",
      url: "https://github.com/owner/repo-one",
      description: "A cool project",
      todayStars: "1,234 stars today",
    });
    expect(repos[1].name).toBe("owner/repo-two");
    expect(repos[1].description).toBe("Another project");
  });

  it("returns empty array for empty HTML", () => {
    expect(parseTrendingHtml("<html></html>")).toEqual([]);
  });
});

describe("formatTrendingMarkdown", () => {
  it("generates a markdown table", () => {
    const repos = parseTrendingHtml(SAMPLE_HTML);
    const md = formatTrendingMarkdown(repos);

    expect(md).toContain("| # | Repository |");
    expect(md).toContain("[owner/repo-one](https://github.com/owner/repo-one)");
    expect(md).toContain("| 1 |");
    expect(md).toContain("| 2 |");
  });

  it("returns empty string for no repos", () => {
    expect(formatTrendingMarkdown([])).toBe("");
  });
});

describe("createGitHubTrendingSource", () => {
  it("has correct id and name", () => {
    const source = createGitHubTrendingSource();
    expect(source.id).toBe("github-trending");
    expect(source.name).toBe("GitHub Trending");
  });

  it("fetches and parses trending page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(SAMPLE_HTML),
      }),
    );

    const source = createGitHubTrendingSource();
    const result = await source.fetch();

    expect(result.sourceName).toBe("GitHub Trending");
    expect(result.markdown).toContain("owner/repo-one");
    expect(result.markdown).toContain("owner/repo-two");

    vi.unstubAllGlobals();
  });

  it("throws on fetch failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );

    const source = createGitHubTrendingSource();
    await expect(source.fetch()).rejects.toThrow("GitHub Trending fetch failed: 503");

    vi.unstubAllGlobals();
  });
});
