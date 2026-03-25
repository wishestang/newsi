import type { DataSource, DataSourceResult } from "./types";
import { createGitHubTrendingSource } from "./github-trending";
import { createUSStockMoversSource } from "./us-stock-movers";

const dataSources: DataSource[] = [
  createGitHubTrendingSource(),
  createUSStockMoversSource(),
];

export async function fetchMatchingDataSources(
  interestText: string,
): Promise<DataSourceResult[]> {
  const matching = dataSources.filter((ds) => ds.matches(interestText));
  if (matching.length === 0) return [];

  const results = await Promise.allSettled(matching.map((ds) => ds.fetch()));

  return results
    .filter(
      (r): r is PromiseFulfilledResult<DataSourceResult> =>
        r.status === "fulfilled",
    )
    .map((r) => r.value);
}
