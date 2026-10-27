import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// SITE_URL feeds the absolute Open Graph URLs in index.html (set by the Pages workflow).
export default defineConfig({
  plugins: [
    react(),
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
