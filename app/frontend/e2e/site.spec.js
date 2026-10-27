import { expect, test } from "./fixtures";

test.describe("overview", () => {
  test("shows the architecture with everything running, and the way into both demos", async ({ page }) => {
    await page.goto("");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("An employee directory");
    await expect(page.locator(".arch .node")).toHaveCount(11);
    await expect(page.locator(".arch .is-off")).toHaveCount(0);
    expect(await page.locator(".arch .packet").count()).toBeGreaterThan(5);
    await expect(page.getByRole("img", { name: /whole project/ })).toBeVisible();
    await page.getByRole("link", { name: "Watch it deploy" }).first().click();
    await expect(page.getByRole("heading", { name: "Watch it deploy" })).toBeVisible();
    await page.getByRole("link", { name: "Overview", exact: true }).click();
    await page.getByRole("link", { name: "Try the app" }).first().click();
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("header: logo, all three tabs, GitHub link", async ({ page }) => {
    await page.goto("#/deploy");
    await page.getByRole("link", { name: "Employee Portal, overview" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("An employee directory");
    await expect(page.getByRole("link", { name: "GitHub", exact: true })).toHaveAttribute("href", /github\.com\/Sakar1601\/internal-employee-portal/);
    await expect(page.getByRole("link", { name: "Overview", exact: true })).toHaveAttribute("aria-current", "page");
  });

  test("every repository link points at a file in the repo", async ({ page }) => {
    await page.goto("");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const hrefs = await page.locator('#main a[href*="github.com"]').evaluateAll((as) => as.map((a) => a.href));
    expect(hrefs.length).toBeGreaterThanOrEqual(6);
    for (const h of hrefs) expect(h).toMatch(/^https:\/\/github\.com\/Sakar1601\/internal-employee-portal(\/blob\/main\/.+|\/tree\/main\/.+)?$/);
  });

  test("sections reveal as they scroll into view, and the counters land on the real numbers", async ({ page }) => {
    await page.goto("");
    await page.locator(".facts").scrollIntoViewIfNeeded();
    await expect(page.locator(".facts dt").first()).toContainText("23");
    await expect(page.locator(".facts dt").nth(2)).toContainText(/\d+/);
    for (let y = 0; y < 8000; y += 500) {
      await page.evaluate((t) => window.scrollTo(0, t), y);
      await page.waitForTimeout(40);
    }
    await expect(page.locator(".reveal:not(.is-in)")).toHaveCount(0);
  });

  test("theme toggle switches the site and is remembered", async ({ page }) => {
    await page.goto("");
    await page.getByRole("button", { name: "Dark mode" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("the headline words animate in and end visible", async ({ page }) => {
    await page.goto("");
    await page.waitForTimeout(2800);
    const opacities = await page.locator(".hero h1 .word").evaluateAll((els) => els.map((e) => getComputedStyle(e).opacity));
    expect(opacities.length).toBeGreaterThan(8);
    expect(opacities.every((o) => o === "1")).toBe(true);
  });
});

test.describe("watch it deploy", () => {
  test("starts with nothing deployed: every step waiting, the diagram dimmed", async ({ page }) => {
    await page.goto("#/deploy");
    await expect(page.locator(".arch .node.is-off")).toHaveCount(11);
    await expect(page.locator(".arch .packet")).toHaveCount(0);
    for (const b of await page.locator(".steps-list button").all()) await expect(b).toBeDisabled();
    await expect(page.getByRole("button", { name: "Reset" })).toBeDisabled();
  });

  test("runs all six steps by itself, lighting the diagram, then offers the app", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("#/deploy");
    await page.getByRole("button", { name: "Run deployment" }).click();
    await expect(page.locator(".step.is-running")).toHaveCount(1);
    await expect(page.locator(".term-log")).toContainText("Starting registry, minio, gitea, vault-unseal");
    await expect(page.locator(".arch .node:not(.is-off)")).not.toHaveCount(0);
    await expect(page.getByRole("status")).toContainText("The portal is live", { timeout: 40_000 });
    await expect(page.locator(".step.is-done")).toHaveCount(6);
    await expect(page.locator(".arch .is-off")).toHaveCount(0);
    await page.getByRole("link", { name: "Open the app" }).click();
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("skip to the end, read any step's log, reset and run again", async ({ page }) => {
    await page.goto("#/deploy");
    await page.getByRole("button", { name: "Run deployment" }).click();
    await page.getByRole("button", { name: "Skip to the end" }).click();
    await expect(page.getByRole("status")).toContainText("The portal is live");
    await page.getByRole("button", { name: /Bootstrap both Vault clusters/ }).click();
    await expect(page.locator(".term-log")).toContainText("auto-unseal confirmed");
    await expect(page.locator(".term-why a")).toHaveAttribute("href", /02-bootstrap-vault\.sh$/);
    await page.getByRole("button", { name: /Deploy with Ansible/ }).click();
    await expect(page.locator(".term-log")).toContainText("Enable and start the portal service");
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.locator(".arch .node.is-off")).toHaveCount(11);
    await expect(page.getByRole("status")).toHaveCount(0);
    await page.getByRole("button", { name: "Run deployment" }).click();
    await expect(page.locator(".step.is-running")).toHaveCount(1);
    await page.getByRole("button", { name: "Skip to the end" }).click();
    await expect(page.getByRole("button", { name: "Run again" })).toBeVisible();
  });

  test("with reduced motion it completes at once", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("#/deploy");
    await page.getByRole("button", { name: "Run deployment" }).click();
    await expect(page.getByRole("status")).toContainText("The portal is live");
  });
});

for (const width of [320, 360, 390, 414, 768, 1024, 1280]) {
  test(`overview and deploy have no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await page.goto("");
    for (let y = 0; y < 9000; y += 700) {
      await page.evaluate((t) => window.scrollTo(0, t), y);
      await page.waitForTimeout(30);
    }
    expect(await overflow()).toBeLessThanOrEqual(0);
    await page.goto("#/deploy");
    await page.getByRole("button", { name: "Run deployment" }).click();
    await page.getByRole("button", { name: "Skip to the end" }).click();
    expect(await overflow()).toBeLessThanOrEqual(0);
  });
}
