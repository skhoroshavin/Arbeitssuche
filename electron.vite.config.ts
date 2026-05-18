import { defineConfig } from "electron-vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "node:path"
import { cpSync, readdirSync } from "node:fs"
import type { Plugin } from "vite"

function copyTemplatesPlugin(): Plugin {
  const sourceDirectory = path.resolve(
    __dirname,
    "src/services/resume-renderer/templates",
  )
  const outputDirectory = path.resolve(__dirname, "out/main/templates")
  return {
    name: "copy-templates",
    buildStart() {
      for (const file of readdirSync(sourceDirectory)) {
        this.addWatchFile(path.resolve(sourceDirectory, file))
      }
    },
    closeBundle() {
      cpSync(sourceDirectory, outputDirectory, { recursive: true })
    },
  }
}

export default defineConfig({
  main: {
    plugins: [copyTemplatesPlugin()],
    build: {
      outDir: "out/main",
      lib: {
        entry: {
          main: "src/app/main.ts",
        },
      },
      rollupOptions: {
        external: ["electron"],
        output: {
          format: "cjs",
          entryFileNames: "[name].cjs",
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  },
  preload: {
    build: {
      outDir: "out/preload",
      lib: {
        entry: "src/app/preload.ts",
      },
      rollupOptions: {
        output: {
          format: "cjs",
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  },
  renderer: {
    root: "src/ui",
    plugins: [react(), tailwindcss()],
    build: {
      outDir: path.resolve(__dirname, "out/renderer"),
      rollupOptions: {
        input: path.resolve(__dirname, "src/ui/index.html"),
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  },
})
