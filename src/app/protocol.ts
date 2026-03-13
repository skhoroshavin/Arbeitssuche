import { protocol } from "electron";
import { join, extname, resolve } from "node:path";
import { readFileSync } from "node:fs";

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
};

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

function tryServeFile(filePath: string, allowedDir: string): Response | null {
  const resolved = resolve(filePath);
  if (!resolved.startsWith(resolve(allowedDir) + "/")) return null;

  try {
    const data = readFileSync(resolved);
    const mimeType =
      MIME_TYPES[extname(resolved)] || "application/octet-stream";
    const headers: Record<string, string> = { "Content-Type": mimeType };
    if (extname(resolved) === ".html") {
      headers["Content-Security-Policy"] = CSP;
    }
    return new Response(data, { headers });
  } catch {
    return null;
  }
}

export function registerAppProtocol(rendererDir: string): void {
  protocol.handle("app", (request) => {
    const url = new URL(request.url);

    // Try the exact path first
    if (!url.pathname.endsWith("/")) {
      const response = tryServeFile(
        join(rendererDir, url.pathname),
        rendererDir,
      );
      if (response) return response;
    }

    // Handle relative asset paths from sub-routes:
    // e.g. /applicants/assets/index.js → /assets/index.js
    const assetMatch = url.pathname.match(/\/(assets\/.+)$/);
    if (assetMatch) {
      const response = tryServeFile(
        join(rendererDir, assetMatch[1]),
        rendererDir,
      );
      if (response) return response;
    }

    // SPA fallback: serve index.html for client-side routes
    return tryServeFile(join(rendererDir, "index.html"), rendererDir)!;
  });
}
