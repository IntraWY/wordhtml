import { test, expect } from "@playwright/test";

test.describe("Export", () => {
  test("opens export dialog with Ctrl+S", async ({ page }) => {
    await page.goto("/");
    const editor = page.locator("[contenteditable='true']").first();
    await editor.click();
    await editor.fill("Test document");
    await page.keyboard.press("Control+s");
    await expect(page.locator("text=ส่งออก").first()).toBeVisible();
  });
});
