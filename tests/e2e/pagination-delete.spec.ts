import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "wordhtml-onboarding",
      JSON.stringify({ hasSeenTour: true })
    );
    localStorage.setItem("wordhtml-recovery-opt-out", "1");
  });
});

test("Delete key does not monotonically increase page count", async ({ page }) => {
  await page.goto("/");
  const editor = page.locator(".ProseMirror").first();
  await expect(editor).toBeVisible();

  await editor.click();
  await editor.fill("Line one for pagination test");
  await page.keyboard.press("Enter");
  await editor.pressSequentially("Line two with more text to encourage overflow", {
    delay: 5,
  });

  await expect
    .poll(async () => page.locator(".page-node").count(), { timeout: 20_000 })
    .toBeGreaterThanOrEqual(1);

  const countAfterType = await page.locator(".page-node").count();

  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Delete");
    await page.waitForTimeout(120);
  }

  await page.waitForTimeout(1200);

  const countAfterDelete = await page.locator(".page-node").count();
  expect(countAfterDelete).toBeLessThanOrEqual(countAfterType + 1);
});
