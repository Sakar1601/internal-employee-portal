// Captures the README screenshots from the real static demo build (dist-demo/), in a real browser.
//   npm run build:demo && node scripts/capture-screenshots.mjs
// Optionally also capture the REAL app (backend + SQLite in Docker, seeded through its API):
//   docker compose up --build -d   (from the repo root)   then   REAL_URL=http://localhost:8080 node scripts/capture-screenshots.mjs
// Output: ../../docs/images/*.png. Everything shown is fictional demo data.
import { chromium } from "@playwright/test";
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

async function dismissToasts(page) {
  const buttons = page.getByRole("button", { name: "Dismiss notification" });
  while ((await buttons.count()) > 0) await buttons.first().click();
}

async function signInDemo(page, hash = "#/portal/login") {
  await page.goto(`${BASE}${hash}`);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForSelector("table");
}

// 1. Overview: the whole project, everything running
{
  const page = await newPage(1440, 900);
  await page.goto(BASE);
  await settle(page);
  await page.mouse.move(2, 2);
  await shot(page, "site-overview.png");
  // 2. The diagram on its own (header hidden so nothing overlaps it)
  await page.addStyleTag({ content: ".site-header{display:none!important}" });
  await page.locator(".hero-arch").screenshot({ path: path.join(out, "architecture-diagram.png") });
  await page.close();
}

// 3 + 4. Watch it deploy: mid-run, then complete
{
  const page = await newPage(1440, 1000);
  await page.goto(`${BASE}#/deploy`);
  await page.getByRole("button", { name: "Run deployment" }).click();
  await page.waitForSelector(".step.is-done");
  await page.locator(".step.is-running").waitFor();
  await page.waitForTimeout(1500);
  await page.mouse.move(2, 2);
  await shot(page, "deploy-running.png");
  await page.getByRole("button", { name: "Skip to the end" }).click();
  await page.getByRole("status").waitFor();
  await page.waitForTimeout(1200);
  await shot(page, "deploy-complete.png");
  await page.close();
}

// 5-8. The portal: directory, before/after of adding someone, dark theme, activity
{
  const page = await newPage(1440, 1000);
  await signInDemo(page);
  await page.mouse.move(2, 2);
  await settle(page);
  await shot(page, "app-directory.png");

  await page.click("text=Add employee");
  await page.getByRole("dialog").getByLabel("Name").fill("Grace Hopper");
  await page.getByRole("dialog").getByLabel("Department").fill("Engineering");
  await page.getByRole("dialog").getByLabel("Start date").fill("2026-01-12");
  await page.waitForTimeout(500);
  await shot(page, "_before.png");
  await page.click("dialog button[type=submit]");
  await page.waitForSelector(".toast");
  await page.locator(".bar.is-flash").evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.mouse.move(2, 2);
  await page.waitForTimeout(1200);
  await shot(page, "_after.png");

  await dismissToasts(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("button", { name: "Dark mode" }).click();
  await page.mouse.move(2, 2);
  await page.waitForTimeout(600);
  await shot(page, "app-dark.png");
  await page.getByRole("button", { name: "Dark mode" }).click();

  await page.getByRole("link", { name: "Activity" }).click();
  await page.waitForSelector(".log-row");
  await page.locator(".method-POST").first().click();
  await page.waitForTimeout(900);
  await dismissToasts(page);
  await shot(page, "app-activity-expanded.png");
  await page.close();
}

// 9. Phone composite: overview, deploy (complete), portal directory
{
  const files = [];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "phone-"));
  const grab = async (page, name) => {
    await page.mouse.move(0, 0);
    const file = path.join(tmp, name);
    await page.screenshot({ path: file });
    files.push(file);
    await page.close();
  };
  let page = await newPage(390, 844);
  await page.goto(BASE);
  await settle(page, 2200);
  await grab(page, "a.png");
  page = await newPage(390, 844);
  await page.goto(`${BASE}#/deploy`);
  await page.getByRole("button", { name: "Run deployment" }).click();
  await page.getByRole("button", { name: "Skip to the end" }).click();
  await page.getByRole("status").waitFor();
  await page.waitForTimeout(800);
  await grab(page, "b.png");
  page = await newPage(390, 844);
  await signInDemo(page);
  await settle(page);
  await grab(page, "c.png");
  await compose(files, ["Overview", "Watch it deploy", "The app"], "mobile-three-pages.png", 390);
}

// 10. Before / after of the key interaction
await compose([path.join(out, "_before.png"), path.join(out, "_after.png")], ["Before: fill in the form", "After: toast and the new record highlighted on the timeline"], "interaction-before-after.png", 720);
fs.rmSync(path.join(out, "_before.png"));
fs.rmSync(path.join(out, "_after.png"));

// 11. The real app (Docker), if asked for
if (process.env.REAL_URL) {
  const page = await newPage(1440, 1000);
  await page.goto(process.env.REAL_URL);
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("demo-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForSelector(".empty-state, table");
  const people = [
    ["Amara Okafor", "Engineering", "2017-03-06"], ["Daniel Reyes", "Engineering", "2019-08-19"], ["Mei Lin Zhao", "Engineering", "2021-01-11"],
    ["Hannah Cole", "Platform & Security", "2016-10-03"], ["Rafael Duarte", "Platform & Security", "2018-05-14"],
    ["Ines Marchetti", "Finance", "2017-07-24"], ["Kwame Mensah", "Finance", "2019-11-04"], ["Leila Haddad", "People Ops", "2018-02-12"],
  ];
  await page.evaluate(async (list) => {
    const token = localStorage.getItem("token");
    for (const [name, department, start_date] of list) {
      await fetch("/api/employees", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ name, department, start_date }) });
    }
  }, people);
  await page.reload();
  await page.waitForSelector("tbody tr");
  await page.mouse.move(2, 2);
  await settle(page);
  await shot(page, "real-app-docker.png");
  await page.close();
}

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
