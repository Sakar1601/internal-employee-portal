import { createHash } from "node:crypto";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// GitHub Pages cannot send response headers, so the static demo carries its policy in a
// <meta> tag, with a hash for each inline script.
const demoCsp = {
  name: "demo-csp",
  apply: () => process.env.VITE_DEMO === "true",
  transformIndexHtml: {
    order: "post",
    handler(html) {
      const hashes = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
        ([, body]) => `'sha256-${createHash("sha256").update(body).digest("base64")}'`,
      );
      const content = [
        "default-src 'self'",
        ["script-src 'self'", ...hashes].join(" "),
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; ");
      return [
        { tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content }, injectTo: "head-prepend" },
        { tag: "meta", attrs: { name: "referrer", content: "strict-origin-when-cross-origin" }, injectTo: "head-prepend" },
      ];
    },
  },
};

// SITE_URL feeds the absolute Open Graph URLs in index.html (set by the Pages workflow).
export default defineConfig({
  plugins: [
    react(),
    demoCsp,
    { name: "site-url", transformIndexHtml: (html) => html.replaceAll("%SITE_URL%", process.env.SITE_URL ?? "/") },
  ],
  server: {
    proxy: {
      "/api": "http://localhost:8000",
      "/healthz": "http://localhost:8000",
    },
  },
  test: { environment: "jsdom", include: ["src/**/*.test.js"] },
});
