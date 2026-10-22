import { defineConfig } from "vite";

// Builds the portfolio landing page (plain HTML/JS, no React) into dist-demo/, next to the
// demo app that build:demo puts in dist-demo/app/. SITE_URL feeds the absolute Open Graph URLs.
export default defineConfig({
  root: "landing",
  base: "./",
  publicDir: "../public",
  plugins: [
    {
      name: "site-url",
      transformIndexHtml: (html) => html.replaceAll("%SITE_URL%", process.env.SITE_URL ?? "./"),
    },
  ],
  build: { outDir: "../dist-demo", emptyOutDir: false },
});
