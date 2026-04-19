import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests-flow",
  testMatch: "**/*.spec.ts",
  timeout: 120_000,
  retries: 0,
  expect: {
    toMatchSnapshot: {
      maxDiffPixelRatio: 0.01,
    },
  },
})
