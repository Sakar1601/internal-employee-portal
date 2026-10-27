// Renders the raster brand assets from the SVG mark and the project fonts:
//   public/apple-touch-icon.png (180x180), public/og.png (1200x630), docs/images/banner.png (1600x420)
// Usage: node scripts/make-brand.mjs   (needs Playwright's Chromium)
import { chromium } from "@playwright/test";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const repo = path.resolve(root, "../..");
const font = (pkg, file) => pathToFileURL(path.join(root, "node_modules", pkg, "files", file)).href;

const MARK = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#16140f"/><g fill="#f2eee4"><circle cx="8" cy="10" r="2.4"/><rect x="12" y="9.1" width="12" height="1.8" rx=".9"/><circle cx="12" cy="16" r="2.4" fill="#6fc2ae"/><rect x="16" y="15.1" width="8" height="1.8" rx=".9" fill="#6fc2ae"/><circle cx="10" cy="22" r="2.4"/><rect x="14" y="21.1" width="10" height="1.8" rx=".9"/></g></svg>`;

const FONTS = `
@font-face{font-family:"Instrument Serif";src:url(${font("@fontsource/instrument-serif", "instrument-serif-latin-400-normal.woff2")})}
@font-face{font-family:"Instrument Serif";font-style:italic;src:url(${font("@fontsource/instrument-serif", "instrument-serif-latin-400-italic.woff2")})}
@font-face{font-family:"Hanken";font-weight:100 900;src:url(${font("@fontsource-variable/hanken-grotesk", "hanken-grotesk-latin-wght-normal.woff2")})}
@font-face{font-family:"Plex Mono";src:url(${font("@fontsource/ibm-plex-mono", "ibm-plex-mono-latin-400-normal.woff2")})}
*{box-sizing:border-box;margin:0}body{background:#f2eee4;color:#16140f;font-family:Hanken,sans-serif}`;

// Decorative tenure bars: the same picture the roster timeline draws.
const bars = (n, w) =>
  Array.from({ length: n }, (_, i) => {
    const x = 4 + ((i * 37) % 55);
    return `<div style="position:relative;height:22px"><i style="position:absolute;left:${x}%;top:6px;width:11px;height:11px;border-radius:50%;background:#16140f;box-shadow:0 0 0 2px #f2eee4,0 0 0 3px #16140f"></i><b style="position:absolute;left:calc(${x}% + 12px);right:0;top:11px;height:2px;background:${i % 3 === 1 ? "#a63a22" : "#1e5b4f"}"></b></div>`;
  }).join("");

const pages = {
  "apple-touch-icon.png": { w: 180, h: 180, out: path.join(root, "public"), html: `<body style="display:grid;place-items:center;width:180px;height:180px;background:#f2eee4">${MARK(140)}` },
  "og.png": {
    w: 1200,
    h: 630,
    out: path.join(root, "public"),
    html: `<body style="width:1200px;height:630px;padding:64px 72px;display:grid;grid-template-columns:1.15fr 1fr;gap:56px;align-items:center">
      <div><div style="display:flex;align-items:center;gap:16px;font:400 44px 'Instrument Serif'">${MARK(56)}<span>Employee <i style="color:#1e5b4f">Portal</i></span></div>
      <h1 style="font:400 76px/1.02 'Instrument Serif';margin-top:40px">An employee directory, <i style="color:#1e5b4f">deployed like a regulated company would.</i></h1>
      <p style="font:400 19px 'Plex Mono';margin-top:32px;color:#655f53">FastAPI · React · Terraform · Vault · Ansible</p></div>
      <div style="padding:28px;background:#fbf9f3;border:2px solid #16140f;box-shadow:12px 12px 0 #16140f">${bars(11)}</div></body>`,
  },
  "banner.png": {
    w: 1600,
    h: 420,
    out: path.join(repo, "docs", "images"),
    html: `<body style="width:1600px;height:420px;padding:56px 72px;display:grid;grid-template-columns:1.3fr 1fr;gap:64px;align-items:center">
      <div><div style="display:flex;align-items:center;gap:18px;font:400 52px 'Instrument Serif'">${MARK(64)}<span>Employee <i style="color:#1e5b4f">Portal</i></span></div>
      <p style="font:400 40px/1.1 'Instrument Serif';margin-top:28px;color:#3a362d">A small directory app, deployed like a regulated company would: Terraform, Vault, Ansible, AWX.</p></div>
      <div style="padding:20px 24px;background:#fbf9f3;border:2px solid #16140f;box-shadow:10px 10px 0 #16140f">${bars(8)}</div></body>`,
  },
};

import fs from "node:fs";
import os from "node:os";
const browser = await chromium.launch();
for (const [name, { w, h, out, html }] of Object.entries(pages)) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  // Fonts load from file:// URLs, which Chromium only allows from a file:// page.
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "brand-")), "page.html");
  fs.writeFileSync(tmp, `<!doctype html><style>${FONTS}</style>${html}`);
  await page.goto(pathToFileURL(tmp).href);
  await page.evaluate(() => document.fonts.ready);
  fs.mkdirSync(out, { recursive: true });
  await page.screenshot({ path: path.join(out, name) });
  await page.close();
}
await browser.close();
console.log("brand assets written");
