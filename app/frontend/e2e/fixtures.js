import { expect, test as base } from "@playwright/test";

// Every test fails if the page logs a console error or throws.
export const test = base.extend({
  page: async ({ page }, use) => {
    const problems = [];
    page.on("console", (m) => m.type() === "error" && problems.push(m.text()));
    page.on("pageerror", (e) => problems.push(e.message));
    await use(page); // eslint-disable-line react-hooks/rules-of-hooks
    expect(problems, "console errors").toEqual([]);
  },
});

export { expect };

export async function signIn(page) {
  await page.goto("#/portal/login");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Directory" })).toBeVisible();
  await expect(page.locator("tbody tr").first()).toBeVisible();
}

export async function addPerson(page, name, department, date) {
  await page.getByRole("button", { name: "Add employee" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill(name);
  await dialog.getByLabel("Department").fill(department);
  await dialog.getByLabel("Start date").fill(date);
  await dialog.getByRole("button", { name: "Add to registry" }).click();
}
