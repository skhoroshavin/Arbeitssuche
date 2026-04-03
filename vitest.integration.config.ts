import { defineConfig } from "vitest/config"
import UnpluginTypia from "@typia/unplugin/vite"
import path from "node:path"

export default defineConfig({
  plugins: [UnpluginTypia()],
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
