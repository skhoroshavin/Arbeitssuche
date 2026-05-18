import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  plugins: [],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["src/plugins/job-site/*.integration-test.ts"],
    testTimeout: 60_000,
  },
})
