import { expect, test } from "./fixtures";

test("every in-page link has a target and scrolls to it", async ({ page }) => {
  await page.goto("");
  const hrefs = await page.locator('a[href^="#"]').evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")))]);
  for (const href of hrefs) expect(await page.locator(href).count(), `${href} target exists`).toBe(1);
  for (const name of ["How it works", "What's different", "Architecture", "The repo", "Limits"]) {
    await page.locator("#nav-links").getByRole("link", { name }).click();
    const id = await page.locator("#nav-links").getByRole("link", { name }).getAttribute("href");
    await expect(page.locator(id)).toBeInViewport();
    await expect(page.locator("#nav-links").getByRole("link", { name })).toHaveAttribute("aria-current", "true");
  }
});

test("hero iframe is the live demo: sign in and add a person", async ({ page }) => {
  await page.goto("");
  const app = page.frameLocator("iframe.browser-view");
  await app.getByRole("button", { name: "Sign in" }).click();
  await expect(app.locator("tbody tr").first()).toBeVisible();
  await app.getByRole("button", { name: "Add employee" }).click();
  const dialog = app.getByRole("dialog");
  await dialog.getByLabel("Name").fill("Hero Check");
  await dialog.getByLabel("Department").fill("QA");
  await dialog.getByLabel("Start date").fill("2026-02-02");
  await dialog.getByRole("button", { name: "Add to registry" }).click();
  await expect(app.locator(".toast")).toContainText("Added Hero Check");
});

test("hero buttons: full-screen demo link and the jump to the deployment steps", async ({ page }) => {
  await page.goto("");
  await expect(page.getByRole("link", { name: "Open full screen" })).toHaveAttribute("href", "./app/");
  await page.getByRole("link", { name: "See how it is deployed" }).click();
  await expect(page.locator("#how")).toBeInViewport();
  await page.getByRole("link", { name: "Try the demo" }).click();
  await expect(page.locator("#hero")).toBeInViewport();
});

test("steps: select, keyboard, play/pause and copy", async ({ page }) => {
  await page.goto("");
  const panel = page.locator("#step-panel");
  await page.getByRole("tab", { name: /Provision AWS/ }).click();
  await expect(panel).toContainText("Step 3 of 6");
  await page.getByRole("tab", { name: /Provision AWS/ }).press("ArrowDown");
  await expect(panel).toContainText("Step 4 of 6");
  await page.getByRole("tab", { name: /Deploy with Ansible/ }).click();
  await expect(panel.getByRole("link")).toHaveAttribute("href", /roles\/portal\/tasks\/main\.yml/);
  await panel.getByRole("button", { name: "Copy" }).click();
  await expect(panel.getByRole("button", { name: "Copied" })).toBeVisible();
  const play = page.getByRole("button", { name: "Play walkthrough" });
  await play.click();
  await expect(page.getByRole("button", { name: "Pause" })).toHaveAttribute("aria-pressed", "true");
  await expect(panel).toContainText("Step 1 of 6");
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(play).toHaveAttribute("aria-pressed", "false");
});

test("architecture: steps isolate parts of the diagram and Show all restores it", async ({ page }) => {
  await page.goto("");
  await page.getByRole("tab", { name: /Bootstrap both Vault/ }).click();
  const dimmed = page.locator("#arch .is-dim");
  expect(await dimmed.count()).toBeGreaterThan(5);
  await page.getByRole("button", { name: "Show all" }).click();
  await expect(dimmed).toHaveCount(0);
  await page.getByRole("button", { name: /Highlight step 3/ }).click();
  await expect(page.getByRole("button", { name: /Highlight step 3/ })).toHaveAttribute("aria-pressed", "true");
  expect(await page.locator("#arch .packet").count()).toBeGreaterThan(5);
});

test("theme toggle switches the page and the embedded app, and persists", async ({ page }) => {
  await page.goto("");
  await page.getByRole("button", { name: "Dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.frameLocator("iframe.browser-view").locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("repo and source links go to the repository", async ({ page }) => {
  await page.goto("");
  const external = await page.locator('a[href^="https://github.com/Sakar1601/internal-employee-portal"]').count();
  expect(external).toBeGreaterThanOrEqual(5);
  await expect(page.getByRole("link", { name: "Source on GitHub" })).toHaveAttribute("href", "https://github.com/Sakar1601/internal-employee-portal");
});

test("mobile menu opens, navigates and closes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("");
  const nav = page.locator("#nav-links");
  await expect(nav).toBeHidden();
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(nav).toBeVisible();
  await nav.getByRole("link", { name: "Limits" }).click();
  await expect(nav).toBeHidden();
  await expect(page.locator("#limits")).toBeInViewport();
  await page.getByRole("button", { name: "Menu" }).click();
  await page.keyboard.press("Escape");
  await expect(nav).toBeHidden();
});

test("the hero headline words animate in and end visible", async ({ page }) => {
  await page.goto("");
  await page.waitForTimeout(1800);
  const opacities = await page.locator(".hero h1 .word").evaluateAll((els) => els.map((e) => getComputedStyle(e).opacity));
  expect(opacities.length).toBeGreaterThan(8);
  expect(opacities.every((o) => o === "1")).toBe(true);
});

for (const width of [320, 360, 390, 414, 768, 1024, 1280]) {
  test(`landing has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("");
    for (let y = 0; y < 12000; y += 700) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(40);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });
}

