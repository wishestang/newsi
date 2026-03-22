import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: "http://127.0.0.1:3100",
  },
  webServer: {
    command: "PORT=3100 FORCE_LOCAL_PREVIEW=1 pnpm dev",
    env: {
      ...process.env,
      PORT: "3100",
      FORCE_LOCAL_PREVIEW: "1",
    },
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
  },
});
