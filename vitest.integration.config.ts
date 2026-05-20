import { defineConfig } from "vitest/config"
import path from "node:path"
import { config as dotenvConfig } from "dotenv"

dotenvConfig()

export default defineConfig({
  plugins: [],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: [
      "src/plugins/**/integration.test.ts",
      "src/repositories/**/integration.test.ts",
    ],
    testTimeout: 60_000,
    env: {
      GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY ?? "",
    },
  },
})
