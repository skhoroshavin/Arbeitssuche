import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests-flow",
  timeout: 60_000,
  retries: 0,
});
