import { defineConfig } from "@playwright/test";

// End-to-end tests run against the static demo build (dist-demo/), the same files that get deployed.
// Build first: npm run build:demo
const PORT = 4190;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL: `http://localhost:${PORT}/`, trace: "retain-on-failure", permissions: ["clipboard-read", "clipboard-write"] },
  projects: [{ name: "chromium", use: { browserName: "chromium", viewport: { width: 1280, height: 900 } } }],
  webServer: {
    command: `npx vite preview --outDir dist-demo --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
