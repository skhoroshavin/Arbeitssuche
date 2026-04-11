import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests-flow",
  timeout: 15_000,
  retries: 0,
  expect: {
    toMatchSnapshot: {
      maxDiffPixelRatio: 0.01,
    },
  },
  projects: [
    {
      name: "e2e",
      testMatch: "tests-flow/**/*.spec.ts",
    },
    {
      name: "visual",
      testMatch: "tests-templates/**/*.spec.ts",
      timeout: 15_000,
    },
  ],
})
