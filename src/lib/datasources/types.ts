export interface DataSourceResult {
  sourceName: string;
  markdown: string;
}

export interface DataSource {
  id: string;
  name: string;
  matches(interestText: string): boolean;
  fetch(): Promise<DataSourceResult>;
}
