import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import UnpluginTypia from "@typia/unplugin/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), UnpluginTypia()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["{src,scripts,eslint}/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/ui/test-setup.ts"],
  },
});
