import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "wordhtml-onboarding",
      JSON.stringify({ hasSeenTour: true })
    );
  });
});

test("debug perf: type in editor and idle", async ({ page }) => {
  await page.goto("/");
  const editor = page.locator("[contenteditable='true']").first();
  await expect(editor).toBeVisible({ timeout: 30_000 });
  await editor.click();
  const paragraph =
    "ทดสอบประสิทธิภาพ wordhtml performance debug session. ";
  for (let i = 0; i < 8; i++) {
    await editor.type(paragraph, { delay: 15 });
  }
  await page.waitForTimeout(2500);
  await expect(editor).toBeVisible();
});
