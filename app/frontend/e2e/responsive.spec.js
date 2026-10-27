import { expect, signIn, test } from "./fixtures";

// Screen sizes from a 280px fold-cover to a 2560px monitor, including phones held sideways.
const SCREENS = [
  [280, 653], [320, 640], [360, 740], [390, 844], [414, 896], [568, 320], [667, 375], [768, 1024], [820, 1180], [1024, 768], [1280, 800], [1440, 900], [1920, 1080], [2560, 1440],
];

const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

// Interactive controls must be at least 24x24 CSS px (WCAG 2.5.8), links inside running text excepted;
// text must be at least 11.5px; nothing may spill out of its box horizontally.
async function layoutProblems(page) {
  return page.evaluate(() => {
    const problems = [];
    const visible = (e) => {
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
    };
    for (const e of document.querySelectorAll("button, a[href], input, select")) {
      if (!visible(e) || e.closest("svg") || e.classList.contains("visually-hidden")) continue;
      const r = e.getBoundingClientRect();
      const inText = e.tagName === "A" && getComputedStyle(e).display === "inline" && e.closest("p, li, dd");
      if (!inText && (r.width < 24 || r.height < 24)) problems.push(`target ${e.tagName}.${e.className} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    for (const e of document.querySelectorAll("body *:not(svg *)")) {
      if (!visible(e)) continue;
      if ([...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 11.5) {
        problems.push(`text ${e.tagName}.${e.className} ${getComputedStyle(e).fontSize}`);
      }
    }
    return [...new Set(problems)];
  });
}

async function scrollThrough(page) {
  for (let y = 0; y < (await page.evaluate(() => document.documentElement.scrollHeight)); y += 600) {
    await page.evaluate((t) => window.scrollTo(0, t), y);
    await page.waitForTimeout(25);
  }
}

for (const [width, height] of SCREENS) {
  test(`${width}x${height}: every page fits, targets and text are big enough`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 900, isMobile: width < 900 });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

    await page.goto("");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await scrollThrough(page);
    expect(await overflow(page), "overview overflow").toBeLessThanOrEqual(0);
    expect(await layoutProblems(page), "overview").toEqual([]);

    await page.goto("#/deploy");
    await page.getByRole("button", { name: "Run deployment" }).click();
    await page.getByRole("button", { name: "Skip to the end" }).click();
    await expect(page.getByRole("status")).toContainText("The portal is live");
    await scrollThrough(page);
    expect(await overflow(page), "deploy overflow").toBeLessThanOrEqual(0);
    expect(await layoutProblems(page), "deploy").toEqual([]);

    await page.goto("#/portal/login");
    expect(await overflow(page), "login overflow").toBeLessThanOrEqual(0);
    await signIn(page);
    await page.waitForTimeout(1400);
    expect(await overflow(page), "directory overflow").toBeLessThanOrEqual(0);
    expect(await layoutProblems(page), "directory").toEqual([]);

    await page.getByRole("button", { name: "Add employee" }).click();
    const dialog = page.getByRole("dialog");
    const box = await dialog.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
    expect(box.y).toBeGreaterThanOrEqual(0);
    await page.keyboard.press("Escape");

    await page.getByRole("link", { name: "Activity" }).click();
    await page.locator(".log-summary").first().click();
    expect(await overflow(page), "activity overflow").toBeLessThanOrEqual(0);
    expect(await layoutProblems(page), "activity").toEqual([]);
    expect(errors).toEqual([]);
    await context.close();
  });
}

test("phones get a readable list instead of the shrunken diagram, larger screens get the drawing", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("");
  await expect(page.locator(".arch-stack").first()).toBeVisible();
  await expect(page.locator("svg.arch").first()).toBeHidden();
  await expect(page.locator(".arch-stack .stack-flow").first()).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator("svg.arch").first()).toBeVisible();
  await expect(page.locator(".arch-stack").first()).toBeHidden();
});

test("on a phone the deployment replay still lights the list step by step", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("#/deploy");
  await expect(page.locator(".arch-stack .stack-node.is-off")).toHaveCount(11);
  await page.getByRole("button", { name: "Run deployment" }).click();
  await page.getByRole("button", { name: "Skip to the end" }).click();
  await expect(page.locator(".arch-stack .stack-node.is-off")).toHaveCount(0);
  await expect(page.locator(".arch-stack .stack-flow.is-off")).toHaveCount(0);
});

test("a short, wide screen (phone held sideways) does not pin the header over the content", async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 375 });
  await page.goto("");
  await expect(page.locator(".site-header")).toHaveCSS("position", "static");
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator(".site-header")).toHaveCSS("position", "sticky");
});
