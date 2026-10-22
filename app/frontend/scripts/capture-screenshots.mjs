// Captures the README screenshots from the real static demo build (dist-demo/), in a real browser.
// Usage: npm run build:demo && node scripts/capture-screenshots.mjs
// Output: ../../docs/images/*.png. Every image shows the simulated demo with fictional data.
import { chromium } from "playwright";
import { preview } from "vite";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const out = path.resolve(root, "../../docs/images");
const PORT = 4181;
const BASE = `http://localhost:${PORT}/`;
fs.mkdirSync(out, { recursive: true });

const server = await preview({ root, preview: { port: PORT, strictPort: true }, build: { outDir: "dist-demo" }, logLevel: "error" });
const browser = await chromium.launch();
const consoleErrors = [];

async function newPage(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: width < 600 ? 2 : 1 });
  const page = await ctx.newPage();
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
  page.on("pageerror", (e) => consoleErrors.push(e.message));
  return page;
}
const shot = (page, name, opts = {}) => page.screenshot({ path: path.join(out, name), ...opts });
const settle = (page, ms = 2800) => page.waitForTimeout(ms);

async function signIn(page, hash = "") {
  await page.goto(`${BASE}app/${hash}`);
  await page.click("button[type=submit]");
  await page.waitForSelector("table");
}

// 1. Landing hero with the product signed in and clickable
{
  const page = await newPage(1440, 900);
  await page.goto(BASE);
  const frame = page.frameLocator("iframe.browser-view");
  await frame.locator("button[type=submit]").click();
  await frame.locator("table").waitFor();
  await frame.locator("body").evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(5, 5);
  await settle(page);
  await shot(page, "landing-hero.png");
  await page.close();
}

// 3. Main working view
{
  const page = await newPage(1440, 1000);
  await signIn(page);
  await page.mouse.move(5, 5);
  await settle(page);
  await shot(page, "app-directory.png");

  // 7a/2. Before: add dialog filled in. After: toast, flashed bar and row.
  await page.click("text=Add employee");
  await page.fill("dialog input >> nth=0", "Grace Hopper");
  await page.fill("dialog input >> nth=1", "Engineering");
  await page.fill("dialog input[type=date]", "2026-01-12");
  await page.waitForTimeout(500);
  await shot(page, "_before.png");
  await page.click("dialog button[type=submit]");
  await page.waitForSelector(".toast");
  await page.locator(".bar.is-flash").evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.mouse.move(5, 5);
  await page.waitForTimeout(1200);
  await shot(page, "product-after-add.png");

  // 4. Activity with a write expanded
  await page.click("nav >> text=Activity");
  await page.waitForSelector(".log-row");
  await page.locator(".method-POST").first().click();
  await page.waitForTimeout(900);
  await page.evaluate(() => document.querySelectorAll(".toast").forEach((t) => t.remove()));
  await shot(page, "app-activity-expanded.png");
  await page.close();
}

// 5. Architecture diagram, no sticky nav in the way
{
  const page = await newPage(1440, 900);
  await page.goto(BASE);
  await page.addStyleTag({ content: ".site-nav{display:none!important}" });
  await page.click(".arch-all");
  const frame = page.locator(".arch-frame");
  await frame.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  // The diagram plus its numbered legend, on the section's own dark background.
  const a = await frame.boundingBox();
  const b = await page.locator(".arch-legend").boundingBox();
  const y = await page.evaluate(() => window.scrollY);
  await page.screenshot({ path: path.join(out, "architecture-diagram.png"), fullPage: true, clip: { x: a.x, y: a.y + y, width: a.width, height: b.y + b.height - a.y + 16 } });
  await page.close();
}

// 6. Phone composite: landing, directory, activity at 390px
{
  const files = [];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "phone-"));
  const grab = async (page, name) => {
    const file = path.join(tmp, name);
    await page.screenshot({ path: file });
    files.push(file);
    await page.close();
  };
  let page = await newPage(390, 844);
  await page.goto(BASE);
  await settle(page, 1500);
  await grab(page, "a.png");
  page = await newPage(390, 844);
  await signIn(page);
  await page.mouse.move(0, 0);
  await settle(page);
  await grab(page, "b.png");
  page = await newPage(390, 844);
  await signIn(page);
  await page.click("nav >> text=Activity");
  await page.waitForSelector(".log-row");
  await page.locator(".log-summary").first().click();
  await page.waitForTimeout(700);
  await grab(page, "c.png");
  await compose(files, ["Landing", "Directory", "Activity"], "mobile-three-pages.png", 390);
}

// 7. Before / after of the key interaction
await compose([path.join(out, "_before.png"), path.join(out, "product-after-add.png")], ["Before: fill in the form", "After: toast and the new record highlighted on the timeline"], "interaction-before-after.png", 720);
fs.rmSync(path.join(out, "_before.png"));

async function compose(files, labels, name, cellWidth) {
  const page = await browser.newPage({ viewport: { width: 100, height: 100 } });
  const cells = files
    .map((f, i) => `<figure><img src="data:image/png;base64,${fs.readFileSync(f).toString("base64")}"><figcaption>${labels[i]}</figcaption></figure>`)
    .join("");
  const html = `<style>*{box-sizing:border-box;margin:0}body{background:#e9e4d6;padding:24px;display:flex;gap:24px;font:600 15px system-ui;color:#16140f;width:max-content}
  figure{width:${cellWidth}px}img{display:block;width:100%;border:1px solid #16140f;box-shadow:6px 6px 0 #16140f;margin-bottom:14px}figcaption{text-align:center}</style>${cells}`;
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "compose-")), "c.html");
  fs.writeFileSync(file, html);
  await page.goto(`file://${file}`);
  await page.waitForTimeout(300);
  const size = await page.evaluate(() => ({ w: document.body.scrollWidth, h: document.body.scrollHeight }));
  await page.setViewportSize({ width: size.w, height: size.h });
  await page.screenshot({ path: path.join(out, name) });
  await page.close();
}

await browser.close();
await server.close();
console.log(consoleErrors.length ? `CONSOLE ERRORS:\n${consoleErrors.join("\n")}` : "screenshots written, no console errors");
