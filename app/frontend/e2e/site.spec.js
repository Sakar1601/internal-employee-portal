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

  test("explains the idea: air gap, why it matters, what breaks, how it works, request flow, glossary, limits", async ({ page }) => {
    await page.goto("");
    await expect(page.getByRole("heading", { name: "What is an air-gapped environment?" })).toBeAttached();
    await expect(page.getByRole("heading", { name: "Isolation is cheap to describe and hard to live with" })).toBeAttached();
    await expect(page.getByRole("heading", { name: "A true air gap" })).toBeAttached();
    await expect(page.locator("#breaks [role=row]")).toHaveCount(8); // header + seven habits
    await expect(page.locator("#how .how-list > li")).toHaveCount(6);
    await expect(page.locator("#how .how-airgap")).toHaveCount(6);
    await expect(page.locator("#runtime .flow-list li")).toHaveCount(6);
    expect(await page.locator("#glossary dt").count()).toBeGreaterThanOrEqual(10);
    await expect(page.locator("#limits")).toContainText("Nothing in the repo renews it");
    await expect(page.locator("#limits")).toContainText("Not physically air-gapped");
  });

  test("the contents chips scroll to their sections", async ({ page }) => {
    await page.goto("");
    const chips = page.locator(".contents .chip");
    await expect(chips).toHaveCount(7);
    for (const [label, id] of [["What is an air gap?", "airgap"], ["Why it matters", "why"], ["What breaks, and the fix", "breaks"], ["How it works", "how"], ["A request, end to end", "runtime"], ["Glossary", "glossary"], ["Limits", "limits"]]) {
      await page.getByRole("button", { name: label }).click();
      await expect(page.locator(`#${id}`)).toBeInViewport();
    }
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
    for (let y = 0; y < (await page.evaluate(() => document.documentElement.scrollHeight)); y += 500) {
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
    await expect(page.locator(".step-explain")).toContainText("What this step does");
    await expect(page.locator(".step-explain")).toContainText("The air-gap angle");
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
    await expect(page.locator(".step-explain a")).toHaveAttribute("href", /02-bootstrap-vault\.sh$/);
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
