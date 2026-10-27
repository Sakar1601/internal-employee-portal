import { addPerson, expect, signIn, test } from "./fixtures";

test.describe("sign in", () => {
  test("rejects a wrong password, then accepts the demo credentials", async ({ page }) => {
    await page.goto("#/portal/login");
    await expect(page.getByText("Simulated demo.")).toBeVisible();
    await page.getByLabel("Password").fill("wrong");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert")).toContainText("Invalid username or password");
    await page.getByLabel("Password").fill("demo-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: "Directory" })).toBeVisible();
  });

  test("a protected page redirects to sign in, and log out returns there", async ({ page }) => {
    await page.goto("#/portal/activity");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await signIn(page);
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });
});

test.describe("directory", () => {
  test.beforeEach(async ({ page }) => signIn(page));

  test("adds a person: toast, numbers, timeline and table all change", async ({ page }) => {
    await expect(page.locator(".stat-value").first()).toContainText("26");
    await addPerson(page, "Grace Hopper", "Engineering", "2026-01-12");
    await expect(page.locator(".toast")).toContainText("Added Grace Hopper");
    await expect(page.locator(".toast")).toContainText("27 people across 6 departments");
    await expect(page.locator("tbody tr")).toHaveCount(27);
    await expect(page.locator(".bar", { hasText: "Grace Hopper" })).toBeVisible();
    await expect(page.locator("tr.is-flash")).toHaveCount(1);
    await page.getByRole("button", { name: "Show record" }).click();
    await expect(page.locator("#employee-27")).toBeVisible();
  });

  test("shows the server's validation message instead of failing silently", async ({ page }) => {
    await addPerson(page, "   ", "QA", "2026-02-01");
    await expect(page.locator(".field-error")).toContainText("at least 1 character");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("edits a record from the table and from the timeline", async ({ page }) => {
    await page.getByRole("button", { name: "Edit Amara Okafor" }).click();
    await page.getByRole("dialog").getByLabel("Department").fill("Finance");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.locator(".toast")).toContainText("Updated Amara Okafor");
    await expect(page.locator("#employee-1")).toContainText("Finance");
    await page.locator(".bar", { hasText: "Amara Okafor" }).click();
    await expect(page.getByRole("dialog").getByLabel("Name")).toHaveValue("Amara Okafor");
    await page.getByRole("button", { name: "Cancel" }).click();
  });

  test("deletes a record after confirmation, and can keep it instead", async ({ page }) => {
    await page.getByRole("button", { name: "Delete Elena Rossi" }).click();
    await page.getByRole("button", { name: "Keep record" }).click();
    await expect(page.locator("tbody tr")).toHaveCount(26);
    await page.getByRole("button", { name: "Delete Elena Rossi" }).click();
    await page.getByRole("button", { name: "Delete record" }).click();
    await expect(page.locator(".toast")).toContainText("Deleted Elena Rossi");
    await expect(page.locator("tbody tr")).toHaveCount(25);
  });

  test("searches by name, filters by department and clears to the empty state", async ({ page }) => {
    await page.getByLabel("Search by name").fill("ann");
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await page.getByLabel("Search by name").fill("zzzz");
    await expect(page.getByText("Nobody matches that.")).toBeVisible();
    await page.getByLabel("Search by name").fill("");
    await page.getByLabel("Department").selectOption("Finance");
    await expect(page.locator("tbody tr")).toHaveCount(4);
    await expect(page.locator(".stat-value").first()).toContainText("4");
  });

  test("sorts by every column in both directions", async ({ page }) => {
    const names = () => page.locator("tbody tr td:first-child .name-link").allTextContents();
    const first = (await names())[0];
    await page.getByRole("button", { name: "Name" }).click();
    await expect(page.getByRole("columnheader", { name: "Name" })).toHaveAttribute("aria-sort", "descending");
    expect((await names())[0]).not.toBe(first);
    await page.getByRole("button", { name: "Start date" }).click();
    await expect(page.getByRole("columnheader", { name: "Start date" })).toHaveAttribute("aria-sort", "ascending");
    expect((await names())[0]).toBe("Elena Rossi");
    await page.getByRole("button", { name: "Tenure" }).click();
    expect((await names())[0]).toBe("Nadia Volkova");
    await page.getByRole("button", { name: "Department" }).click();
    await expect(page.getByRole("columnheader", { name: "Department" })).toHaveAttribute("aria-sort", "ascending");
  });

  test("exports the visible rows as CSV", async ({ page }) => {
    await page.getByLabel("Department").selectOption("Finance");
    await expect(page.locator("tbody tr")).toHaveCount(4);
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export CSV" }).click()]);
    expect(download.suggestedFilename()).toBe("employees.csv");
    const text = await (await import("node:fs/promises")).readFile(await download.path(), "utf8");
    expect(text.split("\r\n")[0]).toBe("id,name,department,start_date");
    expect(text.trim().split("\r\n")).toHaveLength(5);
    await expect(page.locator(".toast")).toContainText("Exported employees.csv");
  });

  test("toggles dark mode and remembers it across a reload", async ({ page }) => {
    await page.getByRole("button", { name: "Dark mode" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.getByRole("button", { name: "Dark mode" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });
});

test.describe("activity", () => {
  test("records calls, expands one, filters to changes, links back and clears", async ({ page }) => {
    await signIn(page);
    await addPerson(page, "Ada Lovelace", "Engineering", "2026-03-02");
    await expect(page.locator(".toast")).toContainText("Added Ada Lovelace");
    await page.getByRole("link", { name: "Activity" }).click();
    await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();
    await page.locator(".log-summary", { hasText: "Created record" }).click();
    await expect(page.locator(".log-detail pre").first()).toContainText("Ada Lovelace");
    await page.getByLabel("Changes only").check();
    await expect(page.locator(".log-row")).toHaveCount(1);
    await page.getByRole("link", { name: /Show record #27/ }).click();
    await expect(page.getByRole("heading", { name: "Directory" })).toBeVisible();
    await expect(page.locator("#employee-27")).toBeVisible();
    await page.getByRole("link", { name: "Activity" }).click();
    await page.getByRole("button", { name: "Clear log" }).click();
    await expect(page.getByText("Nothing here yet.")).toBeVisible();
  });

  test("never shows the password or the full token", async ({ page }) => {
    await signIn(page);
    await page.getByRole("link", { name: "Activity" }).click();
    await page.locator(".log-summary", { hasText: "Signed in" }).click();
    const detail = await page.locator(".log-detail").first().innerText();
    expect(detail).not.toContain("demo-password");
    expect(detail).toContain("••••");
  });
});

test("reset demo data restores the seed people and returns to sign in", async ({ page }) => {
  await signIn(page);
  await addPerson(page, "Temp Person", "QA", "2026-02-02");
  await expect(page.locator("tbody tr")).toHaveCount(27);
  await page.getByRole("button", { name: "Reset demo data" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await signIn(page);
  await expect(page.locator("tbody tr")).toHaveCount(26);
});

test("source link points at the repository", async ({ page }) => {
  await page.goto("#/portal/login");
  await expect(page.getByRole("link", { name: "Source" })).toHaveAttribute("href", /github\.com\/Sakar1601\/internal-employee-portal/);
});

for (const width of [320, 390, 768, 1280]) {
  test(`no horizontal overflow on any page at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await page.goto("#/portal/login");
    expect(await overflow()).toBeLessThanOrEqual(0);
    await signIn(page);
    await page.waitForTimeout(1500);
    expect(await overflow()).toBeLessThanOrEqual(0);
    await page.goto("#/portal/activity");
    await page.locator(".log-summary").first().click();
    expect(await overflow()).toBeLessThanOrEqual(0);
  });
}
