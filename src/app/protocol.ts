import { protocol } from "electron"
import path from "node:path"
import { readFileSync } from "node:fs"

export function registerAppProtocol(rendererDirectory: string): void {
  protocol.handle("app", (request) => {
    const url = new URL(request.url)

    // Try the exact path first
    if (!url.pathname.endsWith("/")) {
      const response = tryServeFile(
        path.join(rendererDirectory, url.pathname),
        rendererDirectory,
      )
      if (response) return response
    }

    // Handle relative asset paths from sub-routes:
    // e.g. /applicants/assets/index.js → /assets/index.js
    const assetMatch = url.pathname.match(/\/(assets\/.+)$/)
    if (assetMatch) {
      const response = tryServeFile(
        path.join(rendererDirectory, assetMatch[1]),
        rendererDirectory,
      )
      if (response) return response
    }

    // SPA fallback: serve index.html for client-side routes
    return (
      tryServeFile(
        path.join(rendererDirectory, "index.html"),
        rendererDirectory,
      ) ?? new Response("Not Found", { status: 404 })
    )
  })
}

function tryServeFile(
  filePath: string,
  allowedDirectory: string,
): Response | undefined {
  const resolved = path.resolve(filePath)
  if (!resolved.startsWith(path.resolve(allowedDirectory) + "/"))
    return undefined

  try {
    const data = readFileSync(resolved)
    const mimeType =
      MIME_TYPES[path.extname(resolved)] || "application/octet-stream"
    const headers: Record<string, string> = { "Content-Type": mimeType }
    if (path.extname(resolved) === ".html") {
      headers["Content-Security-Policy"] = [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'none'",
      ].join("; ")
    }
    return new Response(data, { headers })
  } catch {
    return undefined
  }
}

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
}
