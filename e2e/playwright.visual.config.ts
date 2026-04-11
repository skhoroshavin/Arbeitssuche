import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests-templates",
  timeout: 15_000,
  retries: 0,
  expect: {
    toMatchSnapshot: {
      maxDiffPixelRatio: 0.01,
    },
  },
})
