import { test, expect } from "@playwright/test";

test.describe("Editor", () => {
  test("loads editor at root path", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.locator("[contenteditable='true']").first()
    ).toBeVisible();
  });

  test("can type into the editor", async ({ page }) => {
    await page.goto("/");
    const editor = page.locator("[contenteditable='true']").first();
    await editor.click();
    await editor.fill("Hello wordhtml");
    await expect(editor).toContainText("Hello wordhtml");
  });

  test("formatting toolbar is visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("button[aria-label*='ตัวหนา' i], button[aria-label*='bold' i]").first()).toBeVisible();
  });
});
